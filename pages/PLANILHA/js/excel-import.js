// Módulo para importação e sincronização de carregamentos via Excel
import { db, auth } from "../../../js/firebase-config.js";
import { doc, getDoc, getDocs, collection, updateDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import loadingManager from "../../../js/loading.js";

/**
 * Função para normalizar strings (remover acentos, espaços extras e converter para maiúsculas)
 * @param {string} str - String a ser normalizada
 * @returns {string} - String normalizada
 */
function normalizeString(str) {
    if (!str) return '';
    return str
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

/**
 * Verifica se duas strings são similares
 * @param {string} str1 - Primeira string
 * @param {string} str2 - Segunda string
 * @returns {boolean} - True se as strings forem similares
 */
function areSimilarStrings(str1, str2) {
    if (!str1 || !str2) return false;
    
    const normalized1 = normalizeString(str1);
    const normalized2 = normalizeString(str2);
    
    // Correspondência exata
    if (normalized1 === normalized2) return true;
    
    // Verificar se uma string contém a outra
    if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) return true;
    
    // Verificar se as strings têm pelo menos 70% de similaridade
    if (normalized1.length > 3 && normalized2.length > 3) {
        let matchCount = 0;
        const minLength = Math.min(normalized1.length, normalized2.length);
        
        for (let i = 0; i < minLength; i++) {
            if (normalized1.includes(normalized2[i])) matchCount++;
        }
        
        if (matchCount / minLength >= 0.7) return true;
    }
    
    return false;
}

/**
 * Classe para gerenciar a importação e sincronização de carregamentos via Excel
 */
export default class ExcelImportManager {
    constructor() {
        this.excelData = null;
        this.matchedFrete = null;
        this.carregamentosToUpdate = [];
        this.placasNaoEncontradas = [];
        this.multipleMatches = [];
        this.selectedFreteId = null;
        this.carregamentoDetailsData = [];
    }

    /**
     * Inicializa os eventos do gerenciador de importação
     */
    init() {
        document.getElementById('btnImportarExcel').addEventListener('click', () => this.abrirModalImportacao());
        document.getElementById('excelFileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        document.getElementById('btnSincronizarCarregamentos').addEventListener('click', () => this.sincronizarCarregamentos());
        document.getElementById('btnConfirmarAlteracoes').addEventListener('click', () => this.confirmarAlteracoes());
        document.getElementById('btnBaixarRelatorio').addEventListener('click', () => this.gerarRelatorioPDF());
        document.getElementById('btnCancelarImportacao').addEventListener('click', () => this.fecharModalImportacao());
        
        // Expor a instância globalmente para ser acessada por eventos onclick no HTML
        window.excelImportManager = this;
    }

    /**
     * Abre o modal de importação
     */
    abrirModalImportacao() {
        document.getElementById('importExcelModal').style.display = 'flex';
        document.querySelector('#importExcelModal .step-1').style.display = 'block';
        document.querySelector('#importExcelModal .step-2').style.display = 'none';
        document.getElementById('excelFileInput').value = '';
        document.getElementById('btnSincronizarCarregamentos').disabled = true;
    }

    /**
     * Fecha o modal de importação
     */
    fecharModalImportacao() {
        document.getElementById('importExcelModal').style.display = 'none';
        this.resetState();
    }

    /**
     * Reseta o estado do gerenciador
     */
    resetState() {
        this.excelData = null;
        this.matchedFrete = null;
        this.carregamentosToUpdate = [];
        this.placasNaoEncontradas = [];
        this.multipleMatches = [];
        this.selectedFreteId = null;
        this.carregamentoDetailsData = [];
    }

    /**
     * Manipula a seleção de arquivo Excel
     * @param {Event} event - Evento de mudança do input de arquivo
     */
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            document.getElementById('btnSincronizarCarregamentos').disabled = true;
            return;
        }

        if (!file.name.endsWith('.xlsx')) {
            alert('Por favor, selecione um arquivo Excel (.xlsx)');
            event.target.value = '';
            document.getElementById('btnSincronizarCarregamentos').disabled = true;
            return;
        }

        document.getElementById('btnSincronizarCarregamentos').disabled = false;
    }

    /**
     * Lê o arquivo Excel e processa os dados
     * @returns {Promise<Array>} - Promessa com os dados do Excel
     */
    async readExcelFile() {
        const fileInput = document.getElementById('excelFileInput');
        const file = fileInput.files[0];
        if (!file) {
            throw new Error('Nenhum arquivo selecionado');
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    if (jsonData.length < 2) {
                        reject(new Error('O arquivo Excel não contém dados suficientes'));
                        return;
                    }
                    
                    const headers = jsonData[0];
                    const rows = jsonData.slice(1);
                    
                    const processedData = rows.map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            if (header) { // Ignorar colunas sem cabeçalho
                                obj[header] = row[index] !== undefined ? row[index] : '';
                            }
                        });
                        return obj;
                    });
                    
                    resolve(processedData);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Obtém o valor de uma coluna do Excel, permitindo correspondências parciais
     * @param {Object} row - Linha de dados do Excel
     * @param {Array<string>} possibleNames - Possíveis nomes para a coluna
     * @returns {*} - Valor da coluna ou undefined se não encontrado
     */
    getColumnValue(row, possibleNames) {
        // Primeiro tenta correspondência exata
        for (const name of possibleNames) {
            if (row[name] !== undefined) {
                return row[name];
            }
        }
        
        // Se não encontrar, tenta correspondência parcial ignorando case
        const keys = Object.keys(row);
        for (const name of possibleNames) {
            const normalizedName = normalizeString(name);
            for (const key of keys) {
                if (normalizeString(key).includes(normalizedName)) {
                    return row[key];
                }
            }
        }
        
        return undefined;
    }

    /**
     * Sincroniza os carregamentos do Excel com o Firestore
     */
    async sincronizarCarregamentos() {
        try {
            loadingManager.show();
            
            this.excelData = await this.readExcelFile();
            
            if (!this.excelData || this.excelData.length === 0) {
                throw new Error('Não foi possível ler os dados do Excel ou o arquivo está vazio');
            }
            
            const fretesRef = collection(db, "fretes");
            const fretesSnapshot = await getDocs(fretesRef);
            
            if (fretesSnapshot.empty) {
                throw new Error('Não há fretes cadastrados no sistema');
            }
            
            const matches = [];
            
            const excelRow = this.excelData[0];
            const localEntrega = this.getColumnValue(excelRow, ['Local da entrega', 'Local entrega', 'Destino', 'Local']);
            const freteUnitario = this.getColumnValue(excelRow, ['Frete unitário', 'Frete', 'Valor frete']);
            const shipment = this.getColumnValue(excelRow, ['Shipment', 'Ship', 'Número shipment']);
            const cliente = this.getColumnValue(excelRow, ['Cliente', 'Nome cliente']);
            const pedido = this.getColumnValue(excelRow, ['Pedido', 'Número pedido', 'Num pedido']);
            
            fretesSnapshot.forEach((doc) => {
                const freteData = doc.data();
                const freteId = doc.id;
                
                let matchCount = 0;
                
                if (freteData.destino && localEntrega && areSimilarStrings(freteData.destino, localEntrega.toString())) matchCount++;
                if (freteData.frempresa && freteUnitario && areSimilarStrings(freteData.frempresa, freteUnitario.toString())) matchCount++;
                if (freteData.shipment && shipment && areSimilarStrings(freteData.shipment, shipment.toString())) matchCount++;
                if (freteData.cliente && cliente && areSimilarStrings(freteData.cliente, cliente.toString())) matchCount++;
                if (freteData.pedido && pedido && areSimilarStrings(freteData.pedido, pedido.toString())) matchCount++;
                
                if (matchCount >= 1) {
                    matches.push({ freteId, freteData, matchCount });
                }
            });
            
            if (matches.length === 0) {
                throw new Error('Não foi possível encontrar um frete correspondente no sistema');
            }
            
            if (matches.length === 1) {
                this.matchedFrete = { id: matches[0].freteId, ...matches[0].freteData };
                await this.processarCarregamentos(matches[0].freteId);
                this.mostrarPreVisualizacao();
            } else {
                this.multipleMatches = matches;
                this.mostrarOpcoesDeFretes();
                loadingManager.hide();
                return; 
            }
            
        } catch (error) {
            console.error('Erro ao sincronizar carregamentos:', error);
            alert(`Erro ao sincronizar carregamentos: ${error.message}`);
        } finally {
            loadingManager.hide();
        }
    }

    /**
     * Mostra opções de fretes para o usuário escolher
     */
    mostrarOpcoesDeFretes() {
        const freteMatchContent = document.getElementById('freteMatchContent');
        freteMatchContent.innerHTML = '<p>Múltiplos fretes encontrados. Selecione o frete correto:</p>';
        
        this.multipleMatches.forEach(match => {
            const freteOption = document.createElement('div');
            freteOption.className = 'match-option';
            freteOption.dataset.freteId = match.freteId;
            
            freteOption.innerHTML = `
                <p><strong>Cliente:</strong> ${match.freteData.cliente || 'N/A'}</p>
                <p><strong>Destino:</strong> ${match.freteData.destino || 'N/A'}</p>
                <p><strong>Pedido:</strong> ${match.freteData.pedido || 'N/A'}</p>
            `;
            
            freteOption.addEventListener('click', async () => {
                document.querySelectorAll('.match-option').forEach(opt => opt.classList.remove('selected'));
                freteOption.classList.add('selected');
                
                this.selectedFreteId = match.freteId;
                
                document.getElementById('btnConfirmarAlteracoes').disabled = false;
                
                loadingManager.show();
                try {
                    this.matchedFrete = { id: match.freteId, ...match.freteData };
                    await this.processarCarregamentos(match.freteId);
                    this.mostrarPreVisualizacao();
                } catch (error) {
                    console.error('Erro ao processar carregamentos:', error);
                    alert(`Erro ao processar carregamentos: ${error.message}`);
                } finally {
                    loadingManager.hide();
                }
            });
            
            freteMatchContent.appendChild(freteOption);
        });
        
        document.querySelector('#importExcelModal .step-1').style.display = 'none';
        document.querySelector('#importExcelModal .step-2').style.display = 'block';
        
        document.getElementById('btnConfirmarAlteracoes').disabled = true;
    }

    /**
     * Processa os carregamentos do Excel para um frete específico
     * @param {string} freteId - ID do frete
     */
    async processarCarregamentos(freteId) {
        this.carregamentosToUpdate = [];
        this.placasNaoEncontradas = [];
        
        const carregamentosRef = collection(db, "fretes", freteId, "carregamentos");
        const carregamentosSnapshot = await getDocs(carregamentosRef);
        
        const carregamentosMap = new Map();
        carregamentosSnapshot.forEach(doc => {
            const carregamento = doc.data();
            if (carregamento.placa) {
                const normalizedPlaca = normalizeString(carregamento.placa);
                carregamentosMap.set(normalizedPlaca, { id: doc.id, ...carregamento });
            }
        });
        
        for (const row of this.excelData) {
            if (!row['Placa']) continue;
            
            const normalizedPlaca = normalizeString(row['Placa']);
            
            if (carregamentosMap.has(normalizedPlaca)) {
                const carregamentoExistente = carregamentosMap.get(normalizedPlaca);
                const updates = {};
                let hasUpdates = false;

                const pesoExcel = row['Peso'] !== undefined ? parseFloat(row['Peso']) : undefined;
                const pesoExistente = carregamentoExistente['peso-carregado'] !== undefined ? parseFloat(carregamentoExistente['peso-carregado']) : undefined;
                if (pesoExcel !== undefined && pesoExcel !== pesoExistente) {
                    updates['peso-carregado'] = pesoExcel || 0;
                    hasUpdates = true;
                }

                const dataManifestoExcel = row['Data Emissão NF'] ? this.formatarData(row['Data Emissão NF']) : undefined;
                if (dataManifestoExcel && dataManifestoExcel !== carregamentoExistente['data-manifesto']) {
                    updates['data-manifesto'] = dataManifestoExcel;
                    hasUpdates = true;
                }

                const cteExcel = row['Nº conhec.'] ? row['Nº conhec.'].toString() : undefined;
                if (cteExcel && cteExcel !== carregamentoExistente.cte) {
                    updates.cte = cteExcel;
                    hasUpdates = true;
                }

                if (dataManifestoExcel && !carregamentoExistente['data-entrega']) {
                    const dataEmissao = new Date(dataManifestoExcel);
                    dataEmissao.setDate(dataEmissao.getDate() + 2);
                    const dataEntregaCalculada = dataEmissao.toISOString().split('T')[0];
                    if (dataEntregaCalculada !== carregamentoExistente['data-entrega']) {
                        updates['data-entrega'] = dataEntregaCalculada;
                        hasUpdates = true;
                    }
                }

                const nfeExcel = row['Notas fiscais'] ? row['Notas fiscais'].toString() : undefined;
                if (nfeExcel && nfeExcel !== carregamentoExistente.nfe) {
                    updates.nfe = nfeExcel;
                    hasUpdates = true;
                }
                
                if (hasUpdates) {
                    this.carregamentosToUpdate.push({
                        id: carregamentoExistente.id,
                        placa: carregamentoExistente.placa,
                        motorista: carregamentoExistente.motorista,
                        updates,
                        original: carregamentoExistente
                    });
                }
            } else {
                this.placasNaoEncontradas.push({
                    placa: row['Placa'],
                    local: row['Local da entrega'],
                    freteUnitario: row['Frete unitário'],
                    shipment: row['Shipment'],
                    peso: row['Peso'],
                    notaFiscal: row['Notas fiscais']
                });
            }
        }
    }

    /**
     * Formata uma data para o formato ISO (YYYY-MM-DD)
     * @param {string|Date} data - Data a ser formatada
     * @returns {string} - Data formatada
     */
    formatarData(data) {
        if (!data) return null;
        
        let dataObj;
        
        if (data instanceof Date) {
            dataObj = data;
        } else if (typeof data === 'string') {
            const parts = data.split('/');
            if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Mês em JS é 0-indexed
                const year = parseInt(parts[2], 10);
                dataObj = new Date(year, month, day);
            } else {
                dataObj = new Date(data);
            }
        } else {
            return null;
        }
        
        if (isNaN(dataObj.getTime())) {
            return null;
        }
        
        const year = dataObj.getFullYear();
        const month = String(dataObj.getMonth() + 1).padStart(2, '0');
        const day = String(dataObj.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Mostra a pré-visualização das alterações
     */
    mostrarPreVisualizacao() {
        document.querySelector('#importExcelModal .step-1').style.display = 'none';
        document.querySelector('#importExcelModal .step-2').style.display = 'block';
        
        const freteMatchContent = document.getElementById('freteMatchContent');
        freteMatchContent.innerHTML = `
            <h4>Frete Correspondente</h4>
            <table class="preview-table">
                <tr><th>Cliente</th><td>${this.matchedFrete.cliente || 'N/A'}</td></tr>
                <tr><th>Destino</th><td>${this.matchedFrete.destino || 'N/A'}</td></tr>
                <tr><th>Pedido</th><td>${this.matchedFrete.pedido || 'N/A'}</td></tr>
            </table>
        `;
        
        const carregamentosUpdateContent = document.getElementById('carregamentosUpdateContent');
        this.carregamentoDetailsData = [];
        if (this.carregamentosToUpdate.length === 0) {
            carregamentosUpdateContent.innerHTML = '<p>Nenhum carregamento para atualizar. Os dados do Excel coincidem com os do sistema.</p>';
        } else {
            let html = `
            <h4>Carregamentos a Atualizar</h4>
            <div class="preview-section-update">
                <table class="preview-table">
                    <thead><tr><th>Placa</th><th>Motorista</th><th>Campo</th><th>Valor Antigo</th><th>Novo Valor</th><th>Ações</th></tr></thead>
                    <tbody>`;
            this.carregamentosToUpdate.forEach(carregamento => {
                const camposAtualizados = Object.keys(carregamento.updates);
                this.carregamentoDetailsData.push(carregamento.original);
                const currentIndex = this.carregamentoDetailsData.length - 1;
                
                camposAtualizados.forEach((campo, index) => {
                    let nomeCampo = campo;
                    switch (campo) {
                        case 'peso-carregado': nomeCampo = 'Peso Carregado'; break;
                        case 'data-manifesto': nomeCampo = 'Data Manifesto'; break;
                        case 'cte': nomeCampo = 'CTe'; break;
                        case 'data-entrega': nomeCampo = 'Data Entrega'; break;
                        case 'nfe': nomeCampo = 'NFe'; break;
                    }

                    const valorAntigo = carregamento.original[campo] || 'Vazio';
                    const valorNovo = carregamento.updates[campo];

                    html += `
                        <tr>
                            ${index === 0 ? `<td rowspan="${camposAtualizados.length}">${carregamento.placa}</td>` : ''}
                            ${index === 0 ? `<td rowspan="${camposAtualizados.length}">${carregamento.motorista || 'N/A'}</td>` : ''}
                            <td>${nomeCampo}</td>
                            <td><span class="valor-antigo">${valorAntigo}</span></td>
                            <td><span class="valor-novo">${valorNovo}</span></td>
                            ${index === 0 ? `<td rowspan="${camposAtualizados.length}"><button class="btn btn-secondary btn-sm" onclick='window.excelImportManager.mostrarDetalhesCarregamento(${currentIndex})'>Detalhes</button></td>` : ''}
                        </tr>`;
                });
            });
            html += `</tbody></table></div>`;
            carregamentosUpdateContent.innerHTML = html;
        }
        
        const placasNaoEncontradasContent = document.getElementById('placasNaoEncontradasContent');
        if (this.placasNaoEncontradas.length === 0) {
            placasNaoEncontradasContent.innerHTML = '<p>Todas as placas do Excel foram encontradas no sistema.</p>';
        } else {
            let html = `
            <h4>Placas do Excel Não Encontradas neste Frete</h4>
            <div class="preview-section-new">
                <table class="preview-table">
                    <thead><tr><th>Placa</th><th>Peso</th><th>Nota Fiscal</th></tr></thead>
                    <tbody>`;
            this.placasNaoEncontradas.forEach(placa => {
                html += `
                    <tr>
                        <td>${placa.placa || 'N/A'}</td>
                        <td>${placa.peso || 'N/A'}</td>
                        <td>${placa.notaFiscal || 'N/A'}</td>
                    </tr>`;
            });
            html += `</tbody></table></div>`;
            placasNaoEncontradasContent.innerHTML = html;
        }
    }

    /**
     * Mostra o modal com detalhes de um carregamento específico
     * @param {number} index - O índice do carregamento no array carregamentoDetailsData
     */
    mostrarDetalhesCarregamento(index) {
        const carregamentoData = this.carregamentoDetailsData[index];
        const detailsBody = document.getElementById('carregamentoDetailsBody');
        let detailsHtml = '<table>';

        for (const [key, value] of Object.entries(carregamentoData)) {
            detailsHtml += `<tr><th>${key}</th><td>${value || 'N/A'}</td></tr>`;
        }

        detailsHtml += '</table>';
        detailsBody.innerHTML = detailsHtml;
        document.getElementById('carregamentoDetailsModal').style.display = 'flex';
    }

    /**
     * Fecha o modal de detalhes do carregamento
     */
    fecharDetalhesCarregamento() {
        document.getElementById('carregamentoDetailsModal').style.display = 'none';
    }

    /**
     * Confirma as alterações e atualiza os carregamentos no Firestore
     */
    async confirmarAlteracoes() {
        if (!this.matchedFrete || !this.matchedFrete.id) {
            alert("Nenhum frete foi selecionado para a sincronização.");
            return;
        }

        try {
            loadingManager.show();
            
            const user = auth.currentUser;
            if (!user) {
                throw new Error("Usuário não autenticado.");
            }
            const userDocSnap = await getDoc(doc(db, 'users', user.uid));
            if (!userDocSnap.exists()) {
                throw new Error("Dados do usuário não encontrados.");
            }
            
            if (this.carregamentosToUpdate.length === 0) {
                alert("Nenhuma alteração para confirmar. Os dados já estão sincronizados.");
                this.fecharModalImportacao();
                return;
            }

            const updatePromises = this.carregamentosToUpdate.map(carregamento => {
                const carregamentoRef = doc(db, "fretes", this.matchedFrete.id, "carregamentos", carregamento.id);
                return updateDoc(carregamentoRef, carregamento.updates);
            });

            await Promise.all(updatePromises);

            alert(`${this.carregamentosToUpdate.length} carregamento(s) atualizado(s) com sucesso!`);
            
            this.fecharModalImportacao();

            // Sugestão: em vez de recarregar a página inteira, o ideal é ter uma função
            // que apenas atualize a tabela ou a lista de dados na tela.
            window.location.reload();

        } catch (error) {
            console.error("Erro ao confirmar alterações:", error);
            alert(`Falha ao atualizar os carregamentos: ${error.message}`);
        } finally {
            loadingManager.hide();
        }
    }

    /**
     * Gera um relatório em PDF (função de placeholder)
     */
    gerarRelatorioPDF() {
        try {
            // Verificar se há placas não encontradas
            if (this.placasNaoEncontradas.length === 0) {
                alert('Não há placas não encontradas para gerar o relatório.');
                return;
            }
            
            // Criar o PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            // Adicionar título
            doc.setFontSize(16);
            doc.text('Relatório de Placas Não Encontradas', 14, 20);
            
            // Adicionar data/hora
            const dataHora = new Date().toLocaleString('pt-BR');
            doc.setFontSize(10);
            doc.text(`Data/Hora: ${dataHora}`, 14, 30);
            
            // Adicionar informações do frete
            doc.text(`Frete: ${this.matchedFrete.cliente} - ${this.matchedFrete.destino}`, 14, 40);
            doc.text(`Pedido: ${this.matchedFrete.pedido || 'N/A'}`, 14, 45);
            
            // Adicionar tabela de placas não encontradas
            const tableColumn = ['Placa', 'Local', 'Frete Unitário', 'Shipment', 'Peso', 'Nota Fiscal'];
            const tableRows = this.placasNaoEncontradas.map(placa => [
                placa.placa || 'N/A',
                placa.local || 'N/A',
                placa.freteUnitario || 'N/A',
                placa.shipment || 'N/A',
                placa.peso || 'N/A',
                placa.notaFiscal || 'N/A'
            ]);
            
            doc.autoTable({
                startY: 50,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [66, 66, 66] }
            });
            
            // Salvar o PDF
            doc.save(`Placas_Nao_Encontradas_${new Date().toISOString().split('T')[0]}.pdf`);
            
        } catch (error) {
            console.error('Erro ao gerar relatório PDF:', error);
            alert(`Erro ao gerar relatório PDF: ${error.message}`);
        }
    
    }
}