import { db } from "../../../js/firebase-config.js";
import {
    collection,
    getDocs,
    query,
    orderBy,
    where,
    Timestamp
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
        carregarDados();
    }
});

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

// Função para carregar dados do Firestore
async function carregarDados() {
    try {
        loadingManager.show();
        const fretesRef = collection(db, "fretes");
        const q = query(fretesRef, orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        
        const fretes = [];
        querySnapshot.forEach((doc) => {
            const frete = doc.data();
            fretes.push({
                estado: frete.estado || 'N/A', 
                produto: frete.produto || 'N/A',
                quantidade: parseFloat(frete.liberado) || 0,
                valor: parseFloat(frete.frempresa) || 0,
                cliente: frete.cliente || 'N/A',
                data: frete.data
            });
        });

        // Aplicar filtros
        const periodo = document.getElementById('periodo').value;
        const estado = document.getElementById('estado').value;
        
        let fretesFiltrados = filtrarFretesPorPeriodo(fretes, periodo);
        fretesFiltrados = filtrarFretesPorEstado(fretesFiltrados, estado);

        atualizarInterface(fretesFiltrados);
    } catch (error) {
        console.error("Erro ao carregar dados:", error);
        alert("Erro ao carregar dados do dashboard");
    } finally {
        loadingManager.hide();
    }
}

// Função para calcular a projeção do mês
function calcularProjecaoMensal(fretes) {
    const hoje = new Date();
    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const diasDecorridos = hoje.getDate();
    
    const fretesDoMes = fretes.filter(frete => {
        const dataFrete = new Date(frete.data);
        return dataFrete.getMonth() === hoje.getMonth() && 
               dataFrete.getFullYear() === hoje.getFullYear();
    });
    
    const mediaDiaria = fretesDoMes.reduce((acc, frete) => acc + frete.quantidade, 0) / diasDecorridos;
    const projecao = mediaDiaria * diasNoMes;
    
    return Math.round(projecao);
}

// Função para calcular valor médio por estado
function calcularValorMedioPorEstado(fretes) {
    const estados = {};
    
    fretes.forEach(frete => {
        // Garantir que o estado não seja nulo ou indefinido
        const estado = frete.estado || 'N/A';
        
        if (!estados[estado]) {
            estados[estado] = { total: 0, quantidade: 0 };
        }
        
        // Verificar se valor e quantidade são números válidos
        const valor = parseFloat(frete.valor) || 0;
        const quantidade = parseFloat(frete.quantidade) || 0;
        
        if (quantidade > 0) {
            estados[estado].total += valor * quantidade;
            estados[estado].quantidade += quantidade;
        }
    });
    
    return Object.entries(estados)
        .filter(([_, dados]) => dados.quantidade > 0)
        .map(([estado, dados]) => ({
            estado,
            valorMedio: Math.round(dados.total / dados.quantidade)
        }));
}

// Função para calcular top 5 produtos
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

// Função para calcular top 5 clientes
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

// Função para atualizar a interface
function atualizarInterface(fretes) {
    // Atualizar projeção
    const projecao = calcularProjecaoMensal(fretes);
    document.querySelector('.projecao .valor').textContent = `${projecao} ton`;
    
    // Atualizar gráfico de projeção
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
    
    // Atualizar tabela de estados
    const estados = calcularValorMedioPorEstado(fretes);
    const tbody = document.querySelector('#tabelaEstados tbody');
    tbody.innerHTML = estados.map(estado => `
        <tr>
            <td>${estado.estado}</td>
            <td>R$ ${estado.valorMedio}/ton</td>
        </tr>
    `).join('');
    
    // Atualizar gráfico de estados
    const ctxEstados = document.getElementById('graficoEstados').getContext('2d');
    new Chart(ctxEstados, {
        type: 'pie',
        data: {
            labels: estados.map(e => e.estado),
            datasets: [{
                data: estados.map(e => e.valorMedio),
                backgroundColor: ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6']
            }]
        },
        options: {
            responsive: true
        }
    });
    
    // Atualizar lista de produtos
    const produtos = calcularTopProdutos(fretes);
    const listaProdutos = document.getElementById('listaProdutos');
    listaProdutos.innerHTML = produtos.map(produto => `
        <li>${produto.produto}: ${produto.quantidade} ton</li>
    `).join('');
    
    // Atualizar gráfico de produtos
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

    // Atualizar lista de clientes
    const clientes = calcularTopClientes(fretes);
    const listaClientes = document.getElementById('listaClientes');
    listaClientes.innerHTML = clientes.map(cliente => `
        <li>${cliente.cliente}: ${cliente.quantidade} ton</li>
    `).join('');

    // Atualizar gráfico de clientes
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
}

// Inicializar o dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar listeners para os filtros
    document.getElementById('periodo').addEventListener('change', () => carregarDados());
    document.getElementById('estado').addEventListener('change', () => carregarDados());
}); 