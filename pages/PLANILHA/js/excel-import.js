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
        // Verificar se pelo menos 70% dos caracteres de uma string estão na outra
        let matchCount = 0;
        const minLength = Math.min(normalized1.length, normalized2.length);
        const maxLength = Math.max(normalized1.length, normalized2.length);
        
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
        // Botão para abrir o modal de importação
        document.getElementById('btnImportarExcel').addEventListener('click', () => this.abrirModalImportacao());
        
        // Input de arquivo Excel
        document.getElementById('excelFileInput').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Botão para sincronizar carregamentos
        document.getElementById('btnSincronizarCarregamentos').addEventListener('click', () => this.sincronizarCarregamentos());
        
        // Botão para confirmar alterações
        document.getElementById('btnConfirmarAlteracoes').addEventListener('click', () => this.confirmarAlteracoes());
        
        // Botão para baixar relatório
        document.getElementById('btnBaixarRelatorio').addEventListener('click', () => this.gerarRelatorioPDF());
        
        // Botão para cancelar importação
        document.getElementById('btnCancelarImportacao').addEventListener('click', () => this.fecharModalImportacao());

        // Adicionar funções globais para controle dos modais
        window.fecharModalImportacao = () => this.fecharModalImportacao();
        window.excelImportManager = this; // Expor a instância globalmente
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

        // Verificar se é um arquivo Excel
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
                    
                    // Assume que os dados estão na primeira planilha
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Converter para JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    // Processar os dados para obter um array de objetos com cabeçalhos
                    if (jsonData.length < 2) {
                        reject(new Error('O arquivo Excel não contém dados suficientes'));
                        return;
                    }
                    
                    const headers = jsonData[0];
                    const rows = jsonData.slice(1);
                    
                    // Log para depuração - mostrar todos os cabeçalhos do Excel
                    console.log('Cabeçalhos do Excel:', headers);
                    
                    const processedData = rows.map(row => {
                        const obj = {};
                        headers.forEach((header, index) => {
                            if (header) { // Ignorar colunas sem cabeçalho
                                obj[header] = row[index] !== undefined ? row[index] : '';
                            }
                        });
                        return obj;
                    });
                    
                    // Log para depuração - mostrar a primeira linha de dados processados
                    if (processedData.length > 0) {
                        console.log('Primeira linha de dados processados:', processedData[0]);
                    }
                    
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
            // Mostrar loading
            loadingManager.show();
            
            // Ler o arquivo Excel
            this.excelData = await this.readExcelFile();
            
            if (!this.excelData || this.excelData.length === 0) {
                throw new Error('Não foi possível ler os dados do Excel ou o arquivo está vazio');
            }
            
            // Buscar todos os fretes no Firestore
            const fretesRef = collection(db, "fretes");
            const fretesSnapshot = await getDocs(fretesRef);
            
            if (fretesSnapshot.empty) {
                throw new Error('Não há fretes cadastrados no sistema');
            }
            
            // Verificar correspondências entre Excel e Firestore
            const matches = [];
            
            // Obter valores das colunas usando o método flexível
            const excelRow = this.excelData[0];
            const localEntrega = this.getColumnValue(excelRow, ['Local da entrega', 'Local entrega', 'Destino', 'Local']);
            const freteUnitario = this.getColumnValue(excelRow, ['Frete unitário', 'Frete', 'Valor frete']);
            const shipment = this.getColumnValue(excelRow, ['Shipment', 'Ship', 'Número shipment']);
            const cliente = this.getColumnValue(excelRow, ['Cliente', 'Nome cliente']);
            const pedido = this.getColumnValue(excelRow, ['Pedido', 'Número pedido', 'Num pedido']);
            
            // Log para depuração - mostrar os dados do Excel
            console.log('Dados do Excel para correspondência:', {
                'Local da entrega': localEntrega || 'N/A',
                'Frete unitário': freteUnitario || 'N/A',
                'Shipment': shipment || 'N/A',
                'Cliente': cliente || 'N/A',
                'Pedido': pedido || 'N/A'
            });
            
            fretesSnapshot.forEach((doc) => {
                const freteData = doc.data();
                const freteId = doc.id;
                
                // Verificar se há correspondência com base nos critérios
                let matchCount = 0;
                
                // Verificar localEntrega (Firestore) ↔ coluna "Local da entrega" (Excel)
                if (freteData.destino && localEntrega) {
                    if (areSimilarStrings(freteData.destino, localEntrega.toString())) {
                        matchCount++;
                        console.log(`Match encontrado para destino: ${freteData.destino} ↔ ${localEntrega}`);
                    }
                }
                
                // Verificar freteUnitario (Firestore) ↔ coluna "Frete unitário" (Excel)
                if (freteData.frempresa && freteUnitario) {
                    if (areSimilarStrings(freteData.frempresa, freteUnitario.toString())) {
                        matchCount++;
                        console.log(`Match encontrado para frete: ${freteData.frempresa} ↔ ${freteUnitario}`);
                    }
                }
                
                // Verificar shipment (Firestore) ↔ coluna "Shipment" (Excel)
                if (freteData.shipment && shipment) {
                    if (areSimilarStrings(freteData.shipment, shipment.toString())) {
                        matchCount++;
                        console.log(`Match encontrado para shipment: ${freteData.shipment} ↔ ${shipment}`);
                    }
                }
                
                // Verificar cliente (Firestore) ↔ coluna "Cliente" (Excel)
                if (freteData.cliente && cliente) {
                    if (areSimilarStrings(freteData.cliente, cliente.toString())) {
                        matchCount++;
                        console.log(`Match encontrado para cliente: ${freteData.cliente} ↔ ${cliente}`);
                    }
                }
                
                // Verificar pedido (Firestore) ↔ coluna "Pedido" (Excel)
                if (freteData.pedido && pedido) {
                    if (areSimilarStrings(freteData.pedido, pedido.toString())) {
                        matchCount++;
                        console.log(`Match encontrado para pedido: ${freteData.pedido} ↔ ${pedido}`);
                    }
                }
                
                // Log para depuração - mostrar comparação de cada frete
                console.log(`Comparando frete ${freteId}:`, {
                    'destino': freteData.destino || 'N/A',
                    'frempresa': freteData.frempresa || 'N/A',
                    'shipment': freteData.shipment || 'N/A',
                    'cliente': freteData.cliente || 'N/A',
                    'pedido': freteData.pedido || 'N/A',
                    'matchCount': matchCount
                });
                
                // Se houver pelo menos uma correspondência, adicionar à lista de matches
                if (matchCount >= 1) {
                    matches.push({
                        freteId,
                        freteData,
                        matchCount
                    });
                }
            });
            
            if (matches.length === 0) {
                throw new Error('Não foi possível encontrar um frete correspondente no sistema');
            }
            
            // Se houver apenas um match, usar esse frete
            if (matches.length === 1) {
                this.matchedFrete = {
                    id: matches[0].freteId,
                    ...matches[0].freteData
                };
                await this.processarCarregamentos(matches[0].freteId);
            } else {
                // Se houver múltiplos matches, mostrar opções para o usuário escolher
                this.multipleMatches = matches;
                this.mostrarOpcoesDeFretes();
                loadingManager.hide();
                return; // Parar aqui e esperar a seleção do usuário
            }
            
            // Mostrar pré-visualização
            this.mostrarPreVisualizacao();
            
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
                <p><strong>Frete Empresa:</strong> ${match.freteData.frempresa || 'N/A'}</p>
                <p><strong>Shipment:</strong> ${match.freteData.shipment || 'N/A'}</p>
            `;
            
            freteOption.addEventListener('click', async () => {
                // Remover seleção anterior
                document.querySelectorAll('.match-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Adicionar seleção atual
                freteOption.classList.add('selected');
                
                // Armazenar o ID do frete selecionado
                this.selectedFreteId = match.freteId;
                
                // Habilitar botão de confirmar
                document.getElementById('btnConfirmarAlteracoes').disabled = false;
                
                // Processar carregamentos para o frete selecionado
                loadingManager.show();
                try {
                    this.matchedFrete = {
                        id: match.freteId,
                        ...match.freteData
                    };
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
        
        // Mostrar step 2
        document.querySelector('#importExcelModal .step-1').style.display = 'none';
        document.querySelector('#importExcelModal .step-2').style.display = 'block';
        
        // Desabilitar botão de confirmar até que um frete seja selecionado
        document.getElementById('btnConfirmarAlteracoes').disabled = true;
    }

    /**
     * Processa os carregamentos do Excel para um frete específico
     * @param {string} freteId - ID do frete
     */
    async processarCarregamentos(freteId) {
        // Resetar arrays
        this.carregamentosToUpdate = [];
        this.placasNaoEncontradas = [];
        
        // Buscar carregamentos existentes do frete
        const carregamentosRef = collection(db, "fretes", freteId, "carregamentos");
        const carregamentosSnapshot = await getDocs(carregamentosRef);
        
        // Mapear carregamentos existentes por placa
        const carregamentosMap = new Map();
        carregamentosSnapshot.forEach(doc => {
            const carregamento = doc.data();
            if (carregamento.placa) {
                const normalizedPlaca = normalizeString(carregamento.placa);
                carregamentosMap.set(normalizedPlaca, {
                    id: doc.id,
                    ...carregamento
                });
            }
        });
        
        // Processar cada linha do Excel
        for (const row of this.excelData) {
            // Verificar se a linha tem uma placa
            if (!row['Placa']) continue;
            
            // Normalizar a placa
            const normalizedPlaca = normalizeString(row['Placa']);
            
            // Verificar se a placa existe nos carregamentos
            if (carregamentosMap.has(normalizedPlaca)) {
                // Placa encontrada, verificar e propor atualizações
                const carregamentoExistente = carregamentosMap.get(normalizedPlaca);
                const updates = {};
                let hasUpdates = false;

                // 1. Peso Carregado
                const pesoExcel = row['Peso'] !== undefined ? parseFloat(row['Peso']) : undefined;
                const pesoExistente = carregamentoExistente['peso-carregado'] !== undefined ? parseFloat(carregamentoExistente['peso-carregado']) : undefined;

                if (pesoExcel !== undefined && pesoExcel !== pesoExistente) {
                    updates['peso-carregado'] = pesoExcel || 0;
                    hasUpdates = true;
                }

                // 2. Data do Manifesto
                const dataManifestoExcel = row['Data Emissão NF'] ? this.formatarData(row['Data Emissão NF']) : undefined;
                if (dataManifestoExcel && dataManifestoExcel !== carregamentoExistente['data-manifesto']) {
                    updates['data-manifesto'] = dataManifestoExcel;
                    hasUpdates = true;
                }

                // 3. CTe
                const cteExcel = row['Nº conhec.'] ? row['Nº conhec.'].toString() : undefined;
                if (cteExcel && cteExcel !== carregamentoExistente.cte) {
                    updates.cte = cteExcel;
                    hasUpdates = true;
                }

                // 4. Data de Entrega (calculada)
                if (dataManifestoExcel && !carregamentoExistente['data-entrega']) {
                    const dataEmissao = new Date(dataManifestoExcel);
                    dataEmissao.setDate(dataEmissao.getDate() + 2);
                    const dataEntregaCalculada = dataEmissao.toISOString().split('T')[0];
                    if (dataEntregaCalculada !== carregamentoExistente['data-entrega']) {
                        updates['data-entrega'] = dataEntregaCalculada;
                        hasUpdates = true;
                    }
                }

                // 5. NFe
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
                // Placa não encontrada, adicionar à lista
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
            // Tentar diferentes formatos de data
            const parts = data.split('/');
            if (parts.length === 3) {
                // Formato DD/MM/YYYY ou MM/DD/YYYY
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Mês em JS é 0-indexed
                const year = parseInt(parts[2], 10);
                dataObj = new Date(year, month, day);
            } else {
                // Tentar como ISO ou outro formato reconhecido pelo JS
                dataObj = new Date(data);
            }
        } else {
            return null;
        }
        
        // Verificar se a data é válida
        if (isNaN(dataObj.getTime())) {
            return null;
        }
        
        // Formatar como YYYY-MM-DD
        const year = dataObj.getFullYear();
        const month = String(dataObj.getMonth() + 1).padStart(2, '0');
        const day = String(dataObj.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }

    /**
     * Mostra a pré-visualização das alterações
     */
    mostrarPreVisualizacao() {
        // Mostrar step 2
        document.querySelector('#importExcelModal .step-1').style.display = 'none';
        document.querySelector('#importExcelModal .step-2').style.display = 'block';
        
        // Mostrar frete correspondente
        const freteMatchContent = document.getElementById('freteMatchContent');
        freteMatchContent.innerHTML = `
            <table class="preview-table">
                <tr>
                    <th>Cliente</th>
                    <td>${this.matchedFrete.cliente || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Destino</th>
                    <td>${this.matchedFrete.destino || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Pedido</th>
                    <td>${this.matchedFrete.pedido || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Frete Empresa</th>
                    <td>${this.matchedFrete.frempresa || 'N/A'}</td>
                </tr>
                <tr>
                    <th>Liberado</th>
                    <td>${this.matchedFrete.liberado || '0'} Ton</td>
                </tr>
                <tr>
                    <th>Carregado</th>
                    <td>${this.matchedFrete.carregado || '0'} Ton</td>
                </tr>
                <tr>
                    <th>Saldo</th>
                    <td>${(parseFloat(this.matchedFrete.liberado || 0) - parseFloat(this.matchedFrete.carregado || 0)).toFixed(3)} Ton</td>
                </tr>
            </table>
        `;
        
        // Mostrar carregamentos a atualizar
        const carregamentosUpdateContent = document.getElementById('carregamentosUpdateContent');
        this.carregamentoDetailsData = []; // Limpar dados de detalhes anteriores
        if (this.carregamentosToUpdate.length === 0) {
            carregamentosUpdateContent.innerHTML = '<p>Nenhum carregamento para atualizar. Os dados do Excel coincidem com os do sistema.</p>';
        } else {
            let html = `
            <div class="preview-section-update">
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Motorista</th>
                            <th>Campo</th>
                            <th>Valor Antigo</th>
                            <th>Novo Valor</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
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
                            ${index === 0 ? `<td rowspan="${camposAtualizados.length}"><button class="btn btn-secondary" onclick='window.excelImportManager.mostrarDetalhesCarregamento(${currentIndex})'>Detalhes</button></td>` : ''}
                        </tr>
                    `;
                });
            });
            
            html += `
                    </tbody>
                </table>
            </div>
            `;
            
            carregamentosUpdateContent.innerHTML = html;
        }
        
        // Mostrar placas não encontradas
        const placasNaoEncontradasContent = document.getElementById('placasNaoEncontradasContent');
        if (this.placasNaoEncontradas.length === 0) {
            placasNaoEncontradasContent.innerHTML = '<p>Todas as placas foram encontradas.</p>';
        } else {
            let html = `
            <div class="preview-section-new">
                <table class="preview-table">
                    <thead>
                        <tr>
                            <th>Placa</th>
                            <th>Local</th>
                            <th>Frete Unitário</th>
                            <th>Shipment</th>
                            <th>Peso</th>
                            <th>Nota Fiscal</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            this.placasNaoEncontradas.forEach(placa => {
                html += `
                    <tr>
                        <td>${placa.placa || 'N/A'}</td>
                        <td>${placa.local || 'N/A'}</td>
                        <td>${placa.freteUnitario || 'N/A'}</td>
                        <td>${placa.shipment || 'N/A'}</td>
                        <td>${placa.peso || 'N/A'}</td>
                        <td>${placa.notaFiscal || 'N/A'}</td>
                    </tr>
                `;
            });
            
            html += `
                    </tbody>
                </table>
            </div>
            `;
            
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
        try {
            loadingManager.show();
            
            // Verificar se o usuário tem permissão especial para adicionar carregamentos que excedam o limite
            const user = auth.currentUser;
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const userData = userDoc.exists ? userDoc.data() : {};
            const hasSpecialPermission = userData.role === 'admin' || userData.permissions?.includes('override_carregamento_limit');
            
            // Verificar se há um frete selecionado
            const freteId = this.selectedFreteId || (this.matchedFrete ? this.matchedFrete.id : null);
            if (!freteId) {
                throw new Error('Nenhum frete selecionado');
            }
            
            // Atualizar carregamentos
            const freteRef = doc(db, 'fretes', freteId);
            
            // Verificar o saldo atual do frete
            const freteDoc = await getDoc(freteRef);
            const freteData = freteDoc.data();
            let liberado = parseFloat(freteData.liberado || 0);
            let carregado = parseFloat(freteData.carregado || 0);
            
            // Calcular o novo peso total após as atualizações
            let novoPesoTotal = carregado;
            for (const carregamento of this.carregamentosToUpdate) {
                if (carregamento.updates['peso-carregado'] !== undefined) {
                    // Subtrair o peso antigo e adicionar o novo
                    const pesoAntigo = parseFloat(carregamento.original['peso-carregado'] || 0);
                    const pesoNovo = parseFloat(carregamento.updates['peso-carregado']);
                    novoPesoTotal = novoPesoTotal - pesoAntigo + pesoNovo;
                }
            }
            
            // Verificar se o novo peso total excede o liberado
            if (novoPesoTotal > liberado && !hasSpecialPermission) {
                throw new Error('O peso total dos carregamentos excede o peso liberado. Você não tem permissão para realizar esta operação.');
            }
            
            // Atualizar cada carregamento
            for (const carregamento of this.carregamentosToUpdate) {
                const carregamentoRef = doc(db, 'fretes', freteId, 'carregamentos', carregamento.id);
                await updateDoc(carregamentoRef, carregamento.updates);
            }
            
            // Atualizar o campo 'carregado' do frete
            await updateDoc(freteRef, {
                carregado: novoPesoTotal,
                saldo: Math.max(0, liberado - novoPesoTotal)
            });
            
            alert('Carregamentos atualizados com sucesso!');
            
            // Fechar o modal
            this.fecharModalImportacao();
            
            // Recarregar a lista de fretes
            if (typeof carregarFretes === 'function') {
                carregarFretes();
            }
            
        } catch (error) {
            console.error('Erro ao confirmar alterações:', error);
            alert(`Erro ao confirmar alterações: ${error.message}`);
        } finally {
            loadingManager.hide();
        }
    }

    /**
     * Gera um relatório PDF das placas não encontradas
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