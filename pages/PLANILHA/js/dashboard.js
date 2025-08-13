import { db } from "../../../js/firebase-config.js";
import {
    collection,
    getDocs,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth } from "../../../js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import loadingManager from "../../../js/loading.js";

// Verificar autenticação
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "/login.html";
    } else {
        console.log("Usuário autenticado:", user.email);
    }
});

// Variáveis globais para armazenar os dados carregados
window.fretesDashboard = [];
window.carregamentosDashboard = [];

// Função para normalizar nomes de emissores
function normalizarEmissor(emissor) {
    if (!emissor) return '';
    
    // Converter para minúsculas e remover espaços extras
    const normalizado = emissor.trim().toLowerCase();
    
    // Mapear variações para os nomes padrão
    const mapeamento = {
        'ton': 'Ton',
        'thiago': 'Thiago',
        'andrielly': 'Andrielly',
        'geovane': 'Geovane',
        'geovani': 'Geovane',
        'geo': 'Geovane',
        'tom': 'Ton',
        'joao': 'Joao',
        'joao vitor': 'JoaoVitor',
        'joaovitor': 'JoaoVitor',
        'milene': 'Milene',
        'frota': 'Frota'
    };
    
    return mapeamento[normalizado] || normalizado.charAt(0).toUpperCase() + normalizado.slice(1);
}

// Função para filtrar fretes por período
function filtrarFretesPorPeriodo(fretes, periodo) {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    switch(periodo) {
        case 'atual':
            return fretes.filter(frete => {
                const dataFrete = new Date(frete.data);
                return dataFrete >= inicioMes && dataFrete <= fimMes;
            });
        case 'anterior':
            const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            return fretes.filter(frete => {
                const dataFrete = new Date(frete.data);
                return dataFrete >= inicioMesAnterior && dataFrete <= fimMesAnterior;
            });
        case 'ultimos3':
            const inicio3Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);
            return fretes.filter(frete => {
                const dataFrete = new Date(frete.data);
                return dataFrete >= inicio3Meses && dataFrete <= hoje;
            });
        case 'ultimos6':
            const inicio6Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
            return fretes.filter(frete => {
                const dataFrete = new Date(frete.data);
                return dataFrete >= inicio6Meses && dataFrete <= hoje;
            });
        default:
            return fretes;
    }
}

// Função para filtrar fretes por estado
function filtrarFretesPorEstado(fretes, estado) {
    if (estado === 'todos') return fretes;
    return fretes.filter(frete => frete.estado === estado);
}

// Função para filtrar carregamentos por período
function filtrarCarregamentosPorPeriodo(carregamentos, periodo) {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    switch(periodo) {
        case 'atual':
            return carregamentos.filter(carregamento => {
                const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
                return dataCarregamento >= inicioMes && dataCarregamento <= fimMes;
            });
        case 'anterior':
            const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
            const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
            return carregamentos.filter(carregamento => {
                const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
                return dataCarregamento >= inicioMesAnterior && dataCarregamento <= fimMesAnterior;
            });
        case 'ultimos3':
            const inicio3Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 3, 1);
            return carregamentos.filter(carregamento => {
                const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
                return dataCarregamento >= inicio3Meses && dataCarregamento <= hoje;
            });
        case 'ultimos6':
            const inicio6Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 6, 1);
            return carregamentos.filter(carregamento => {
                const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
                return dataCarregamento >= inicio6Meses && dataCarregamento <= hoje;
            });
        default:
            return carregamentos;
    }
}

// Função auxiliar para parsear datas de carregamento
function parseDataCarregamento(dataString) {
    if (!dataString) return new Date(0); // Retorna data inválida se não houver data
    
    try {
        if (dataString.includes('/')) {
            const [dia, mes, ano] = dataString.split('/');
            return new Date(`${mes}/${dia}/${ano}`);
        } else if (dataString.includes('-')) {
            return new Date(dataString);
        } else {
            return new Date(dataString);
        }
    } catch (e) {
        console.error('Erro ao parsear data:', dataString);
        return new Date(0); // Retorna data inválida se houver erro
    }
}

// Função para carregar dados do Firestore
async function carregarDados() {
    try {
        loadingManager.show();
        
        const fretesRef = collection(db, "fretes");
        const q = query(fretesRef, orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fretes = [];
        const carregamentos = [];
        
        for (const doc of querySnapshot.docs) {
            const frete = doc.data();
            const freteId = doc.id;
            
            fretes.push({
                id: freteId,
                estado: frete.estado || 'N/A', 
                produto: frete.produto || 'N/A',
                quantidade: parseFloat(frete.liberado) || 0,
                valor: parseFloat(frete.frempresa) || 0,
                cliente: frete.cliente || 'N/A',
                data: frete.data,
                emissor: frete.emissor || '',
                dataoc: frete.dataoc || frete.data,
                peso_carregado: frete.peso_carregado || frete.liberado || 0
            });
            
            try {
                const carregamentosRef = collection(db, "fretes", freteId, "carregamentos");
                const carregamentosSnapshot = await getDocs(carregamentosRef);
                
                carregamentosSnapshot.forEach((carregamentoDoc) => {
                    const carregamento = carregamentoDoc.data();
                    carregamentos.push({
                        id: carregamentoDoc.id,
                        freteId: freteId,
                        emissor: normalizarEmissor(carregamento.emissor || ''),
                        dataoc: carregamento.dataoc || '',
                        pesoCarregado: parseFloat(carregamento['peso-carregado']) || 0,
                        placa: carregamento.placa || '',
                        motorista: carregamento.motorista || '',
                        timestamp: carregamento.timestamp,
                        cliente: frete.cliente || 'N/A',
                        produto: frete.produto || 'N/A',
                        estado: frete.estado || 'N/A'
                    });
                });
            } catch (error) {
                console.log(`Erro ao buscar carregamentos do frete ${freteId}:`, error);
            }
        }

        console.log('Total de carregamentos encontrados:', carregamentos.length);
        console.log('Emissores encontrados:', [...new Set(carregamentos.map(c => c.emissor))]);

        const periodo = document.getElementById('periodo').value;
        const estado = document.getElementById('estado').value;
        
        let fretesFiltrados = filtrarFretesPorPeriodo(fretes, periodo);
        fretesFiltrados = filtrarFretesPorEstado(fretesFiltrados, estado);
        
        let carregamentosFiltrados = filtrarCarregamentosPorPeriodo(carregamentos, periodo);
        if (estado !== 'todos') {
            carregamentosFiltrados = carregamentosFiltrados.filter(carregamento => carregamento.estado === estado);
        }

        window.fretesDashboard = fretesFiltrados;
        window.carregamentosDashboard = carregamentosFiltrados;

        atualizarInterface(fretesFiltrados);
        
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert("Erro ao carregar dados do dashboard");
    } finally {
        loadingManager.hide();
    }
}

function calcularProjecaoMensal(fretes) {
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    
    const totalAtual = fretes.reduce((acc, frete) => acc + frete.quantidade, 0);
    const projecao = (totalAtual / diaAtual) * diasNoMes;
    
    return Math.round(projecao);
}

function calcularValorMedioPorEstado(fretes) {
    const estados = {};
    
    fretes.forEach(frete => {
        // Ignorar fretes sem estado, frempresa ou liberado inválidos
        if (!frete.estado || !frete.valor || !frete.quantidade) return;
        
        const estado = frete.estado.toUpperCase();
        const valor = parseFloat(frete.valor) || 0;
        const quantidade = parseFloat(frete.quantidade) || 0;
        
        if (quantidade <= 0) return;
        
        if (!estados[estado]) {
            estados[estado] = {
                totalValor: 0,
                totalQuantidade: 0,
                count: 0
            };
        }
        
        estados[estado].totalValor += valor;
        estados[estado].totalQuantidade += quantidade;
        estados[estado].count++;
    });
    
    return Object.entries(estados)
        .map(([estado, dados]) => ({
            estado,
            valorMedio: dados.totalQuantidade > 0
                ? (dados.totalValor / dados.totalQuantidade).toFixed(2)
                : 0,
            fretes: dados.count
        }))
        .filter(item => item.valorMedio > 0)
        .sort((a, b) => b.valorMedio - a.valorMedio);
}

function calcularTopProdutos(fretes) {
    const produtos = {};
    
    fretes.forEach(frete => {
        if (!produtos[frete.produto]) {
            produtos[frete.produto] = 0;
        }
        produtos[frete.produto] += frete.quantidade;
    });
    
    return Object.entries(produtos)
        .filter(([_, quantidade]) => quantidade > 0)
        .map(([produto, quantidade]) => ({ produto, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
}

function calcularTopClientes(fretes) {
    const clientes = {};
    
    fretes.forEach(frete => {
        if (!clientes[frete.cliente]) {
            clientes[frete.cliente] = 0;
        }
        clientes[frete.cliente] += frete.quantidade;
    });
    
    return Object.entries(clientes)
        .filter(([_, quantidade]) => quantidade > 0)
        .map(([cliente, quantidade]) => ({ cliente, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
}

function calcularEmissorStats(carregamentos, emissor) {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    
    if (!Array.isArray(carregamentos)) {
        console.error('Dados de carregamentos não são um array válido');
        return { ordens: 0, caminhoes: 0, totalRetirado: 0 };
    }
    
    const emissorNormalizado = normalizarEmissor(emissor);
    const carregamentosDoEmissor = carregamentos.filter(carregamento => {
        const carregamentoEmissorNormalizado = normalizarEmissor(carregamento.emissor);
        const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
        
        return carregamentoEmissorNormalizado === emissorNormalizado && 
               dataCarregamento >= inicioMes && 
               dataCarregamento <= fimMes;
    });

    const ordens = carregamentosDoEmissor.length;
    const caminhoes = carregamentosDoEmissor.length;
    const totalRetirado = carregamentosDoEmissor.reduce((acc, carregamento) => 
        acc + (parseFloat(carregamento.pesoCarregado) || 0), 0);

    return {
        ordens,
        caminhoes,
        totalRetirado: Math.round(totalRetirado * 100) / 100
    };
}

function calcularRankingEmissores(carregamentos, mesAnterior = false) {
    const hoje = new Date();
    let inicioMes, fimMes;
    
    if (mesAnterior) {
        // Se for para o mês anterior
        inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fimMes = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    } else {
        // Mês atual (comportamento original)
        inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }
    
    if (!Array.isArray(carregamentos)) {
        console.error('Dados de carregamentos não são um array válido');
        return [];
    }
    
    const emissores = {};
    
    // Processar todos os carregamentos do período
    const carregamentosDoPeriodo = carregamentos.filter(carregamento => {
        const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
        return dataCarregamento >= inicioMes && dataCarregamento <= fimMes;
    });
    
    // Agrupar por emissor normalizado
    carregamentosDoPeriodo.forEach(carregamento => {
        const emissorNormalizado = normalizarEmissor(carregamento.emissor);
        
        if (!emissores[emissorNormalizado]) {
            emissores[emissorNormalizado] = {
                ordens: 0,
                caminhoes: 0,
                totalRetirado: 0
            };
        }
        
        emissores[emissorNormalizado].ordens += 1;
        emissores[emissorNormalizado].caminhoes += 1;
        emissores[emissorNormalizado].totalRetirado += parseFloat(carregamento.pesoCarregado) || 0;
    });
    
    // Converter para array e ordenar
    const resultado = Object.entries(emissores)
        .map(([emissor, stats]) => ({
            emissor,
            ordens: stats.ordens,
            caminhoes: stats.caminhoes,
            totalRetirado: Math.round(stats.totalRetirado * 100) / 100
        }))
        .sort((a, b) => b.totalRetirado - a.totalRetirado);
    
    // Se estamos calculando o mês anterior, podemos salvar os dados
    if (mesAnterior) {
        // Aqui você pode adicionar lógica para salvar no banco de dados se necessário
        console.log('Ranking do mês anterior calculado:', resultado);
    }
    
    return resultado;
}

// Função para calcular a projeção de carregamentos por emissor
function calcularProjecaoEmissores(carregamentosAtual, carregamentosAnterior) {
    const hoje = new Date();
    const diasNoMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diaAtual = hoje.getDate();
    
    // Calcular ranking do mês atual e anterior
    const rankingAtual = calcularRankingEmissores(carregamentosAtual, false);
    const rankingAnterior = calcularRankingEmissores(carregamentosAnterior, true);
    
    // Calcular total do mês anterior
    const totalMesAnterior = rankingAnterior.reduce((acc, emissor) => acc + emissor.totalRetirado, 0);
    
    // Calcular total do mês atual
    const totalMesAtual = rankingAtual.reduce((acc, emissor) => acc + emissor.totalRetirado, 0);
    
    // Calcular projeção para cada emissor
    const projecoes = [];
    
    // Obter todos os emissores únicos (combinando mês atual e anterior)
    const todosEmissores = new Set([...rankingAtual.map(e => e.emissor), ...rankingAnterior.map(e => e.emissor)]);
    
    todosEmissores.forEach(emissor => {
        const dadosAnterior = rankingAnterior.find(e => e.emissor === emissor) || { totalRetirado: 0 };
        const dadosAtual = rankingAtual.find(e => e.emissor === emissor) || { totalRetirado: 0 };
        
        // Calcular média diária do mês anterior
        const diasNoMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
        const mediaDiariaAnterior = dadosAnterior.totalRetirado / diasNoMesAnterior;
        
        // Calcular projeção para o mês atual
        const projecao = Math.round(mediaDiariaAnterior * diasNoMesAtual);
        
        // Adicionar à lista de projeções se houver dados relevantes
        if (projecao > 0 || dadosAtual.totalRetirado > 0) {
            projecoes.push({
                emissor,
                projecao,
                realizado: Math.round(dadosAtual.totalRetirado),
                percentualRealizado: projecao > 0 ? Math.round((dadosAtual.totalRetirado / projecao) * 100) : 0
            });
        }
    });
    
    // Ordenar por projeção (maior para menor)
    projecoes.sort((a, b) => b.projecao - a.projecao);
    
    // Calcular variação percentual em relação ao mês anterior
    const projecaoTotal = projecoes.reduce((acc, emissor) => acc + emissor.projecao, 0);
    const variacaoPercentual = totalMesAnterior > 0 ? 
        Math.round(((projecaoTotal - totalMesAnterior) / totalMesAnterior) * 100) : 0;
    
    return {
        projecoes,
        totalMesAtual,
        totalMesAnterior,
        projecaoTotal,
        variacaoPercentual,
        percentualRealizado: projecaoTotal > 0 ? Math.round((totalMesAtual / projecaoTotal) * 100) : 0
    };
}

function atualizarInterface(fretes) {
    const chartsIds = ['graficoProjecao', 'graficoEstados', 'graficoProdutos', 'graficoClientes', 'graficoEmissores', 'graficoProjecaoEmissores'];
    chartsIds.forEach(id => {
        const chart = Chart.getChart(id);
        if (chart) chart.destroy();
    });

    const projecao = calcularProjecaoMensal(fretes);
    document.querySelector('.projecao .valor').textContent = `${projecao} ton`;
    
    const ctxProjecao = document.getElementById('graficoProjecao').getContext('2d');
    new Chart(ctxProjecao, {
        type: 'bar',
        data: {
            labels: ['Projeção Mensal'],
            datasets: [{
                label: 'Toneladas',
                data: [projecao],
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // Obter carregamentos do mês atual e anterior para projeções
    const hoje = new Date();
    const inicioMesAtual = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMesAtual = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    
    const carregamentosAtual = window.carregamentosDashboard.filter(carregamento => {
        const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
        return dataCarregamento >= inicioMesAtual && dataCarregamento <= fimMesAtual;
    });
    
    const carregamentosAnterior = window.carregamentosDashboard.filter(carregamento => {
        const dataCarregamento = parseDataCarregamento(carregamento.dataoc);
        return dataCarregamento >= inicioMesAnterior && dataCarregamento <= fimMesAnterior;
    });
    
    // Calcular projeções de carregamentos
    const dadosProjecao = calcularProjecaoEmissores(carregamentosAtual, carregamentosAnterior);
    
    // Atualizar interface com os dados de projeção
    document.getElementById('totalMesAtual').textContent = `${Math.round(dadosProjecao.totalMesAtual)} ton`;
    
    // Atualizar variação percentual
    const variacaoElement = document.getElementById('variacaoMes');
    const variacaoTexto = `(${dadosProjecao.variacaoPercentual}% ${dadosProjecao.variacaoPercentual >= 0 ? '↑' : '↓'})`;
    variacaoElement.textContent = variacaoTexto;
    variacaoElement.className = 'variacao ' + (dadosProjecao.variacaoPercentual >= 0 ? 'positiva' : 'negativa');
    
    // Atualizar barra de progresso
    const progressBar = document.getElementById('progressoCarregamento');
    progressBar.style.width = `${dadosProjecao.percentualRealizado}%`;
    
    // Atualizar lista de emissores
    const listaEmissores = document.getElementById('listaEmissoresProjecao');
    listaEmissores.innerHTML = dadosProjecao.projecoes.slice(0, 5).map(emissor => {
        const abaixoProjecao = emissor.realizado < (emissor.projecao * (hoje.getDate() / fimMesAtual.getDate()));
        return `
            <li class="emissor-item">
                <span class="emissor-nome">${emissor.emissor}</span>
                <div class="emissor-dados">
                    <span class="projecao-valor">Proj.: ${emissor.projecao} ton</span>
                    <span class="realizado-valor ${abaixoProjecao ? 'abaixo' : ''}">Realizado: ${emissor.realizado} ton</span>
                </div>
            </li>
        `;
    }).join('');
    
    // Criar gráfico de projeções
    if (document.getElementById('graficoProjecaoEmissores')) {
        const ctxProjecaoEmissores = document.getElementById('graficoProjecaoEmissores').getContext('2d');
        new Chart(ctxProjecaoEmissores, {
            type: 'bar',
            data: {
                labels: dadosProjecao.projecoes.slice(0, 5).map(e => e.emissor),
                datasets: [
                    {
                        label: 'Projeção (ton)',
                        data: dadosProjecao.projecoes.slice(0, 5).map(e => e.projecao),
                        backgroundColor: '#3498db'
                    },
                    {
                        label: 'Realizado (ton)',
                        data: dadosProjecao.projecoes.slice(0, 5).map(e => e.realizado),
                        backgroundColor: '#2ecc71'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Projeção vs. Realizado por Emissor'
                    }
                }
            }
        });
    }
    
    const estados = calcularValorMedioPorEstado(fretes);
    const tbody = document.querySelector('#tabelaEstados tbody');
    
    // Exibir apenas os top 5 estados
    const top5Estados = estados.slice(0, 5);
    
    tbody.innerHTML = top5Estados.map((estado, index) => `
        <tr class="ranking-row">
            <td class="ranking-position">${index + 1}</td>
            <td class="estado-nome">${estado.estado}</td>
            <td class="valor-medio">R$ ${estado.valorMedio}</td>
            <td class="fretes-count">${estado.fretes}</td>
        </tr>
    `).join('');
    
    const ctxEstados = document.getElementById('graficoEstados').getContext('2d');
    new Chart(ctxEstados, {
        type: 'bar',
        data: {
            labels: top5Estados.map(e => e.estado),
            datasets: [{
                label: 'Valor Médio (R$/ton)',
                data: top5Estados.map(e => e.valorMedio),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6']
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Valor Médio por Estado (R$/ton)'
                }
            }
        }
    });
    
    const produtos = calcularTopProdutos(fretes);
    const listaProdutos = document.getElementById('listaProdutos');
    listaProdutos.innerHTML = produtos.map(produto => `
        <li>${produto.produto}: ${produto.quantidade} ton</li>
    `).join('');
    
    const ctxProdutos = document.getElementById('graficoProdutos').getContext('2d');
    new Chart(ctxProdutos, {
        type: 'bar',
        data: {
            labels: produtos.map(p => p.produto),
            datasets: [{
                label: 'Quantidade (ton)',
                data: produtos.map(p => p.quantidade),
                backgroundColor: '#3498db'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const clientes = calcularTopClientes(fretes);
    const listaClientes = document.getElementById('listaClientes');
    listaClientes.innerHTML = clientes.map(cliente => `
        <li>${cliente.cliente}: ${cliente.quantidade} ton</li>
    `).join('');

    const ctxClientes = document.getElementById('graficoClientes').getContext('2d');
    new Chart(ctxClientes, {
        type: 'bar',
        data: {
            labels: clientes.map(c => c.cliente),
            datasets: [{
                label: 'Quantidade (ton)',
                data: clientes.map(c => c.quantidade),
                backgroundColor: '#9b59b6'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    const rankingEmissores = calcularRankingEmissores(window.carregamentosDashboard);
    const tabelaEmissores = document.querySelector('#tabelaEmissores tbody');
    tabelaEmissores.innerHTML = rankingEmissores.map((emissor) => `
        <tr>
            <td>${emissor.emissor}</td>
            <td>${emissor.ordens}</td>
            <td>${emissor.caminhoes}</td>
            <td>${emissor.totalRetirado} ton</td>
        </tr>
    `).join('');

    const rankingEmissoresAtual = calcularRankingEmissores(window.carregamentosDashboard, false);
    const emissoresComDadosAtual = rankingEmissoresAtual.filter(e => e.totalRetirado > 0).slice(0, 5);
    
    const rankingEmissoresAnterior = calcularRankingEmissores(window.carregamentosDashboard, true);
    const emissoresComDadosAnterior = rankingEmissoresAnterior.filter(e => e.totalRetirado > 0).slice(0, 5);
    
    if (document.getElementById('graficoEmissores')) {
        const ctxEmissores = document.getElementById('graficoEmissores').getContext('2d');
        new Chart(ctxEmissores, {
            type: 'bar',
            data: {
                labels: emissoresComDadosAtual.map(e => e.emissor),
                datasets: [{
                    label: 'Total Retirado (ton) - Mês Atual',
                    data: emissoresComDadosAtual.map(e => e.totalRetirado),
                    backgroundColor: '#e67e22'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Ranking de Emissores - Mês Atual'
                    }
                }
            }
        });
    }
    
    if (document.getElementById('graficoEmissoresAnterior')) {
        const ctxEmissoresAnterior = document.getElementById('graficoEmissoresAnterior').getContext('2d');
        new Chart(ctxEmissoresAnterior, {
            type: 'bar',
            data: {
                labels: emissoresComDadosAnterior.map(e => e.emissor),
                datasets: [{
                    label: 'Total Retirado (ton) - Mês Anterior',
                    data: emissoresComDadosAnterior.map(e => e.totalRetirado),
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Ranking de Emissores - Mês Anterior'
                    }
                }
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('periodo').addEventListener('change', () => carregarDados());
    document.getElementById('estado').addEventListener('change', () => carregarDados());

    carregarDados();
    
    // Configurar atualização periódica para manter os dados em tempo real
    setInterval(() => {
        carregarDados();
    }, 300000); // Atualizar a cada 5 minutos (300000ms)
});