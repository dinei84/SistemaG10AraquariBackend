import { db } from "../../../js/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth } from "../../../js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import loadingManager from "../../../js/loading.js"

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/login.html";
  } else {
    console.log("Usuário autenticado:", user.email);
  }
});

const corpoTabela = document.getElementById("corpoTabela");
const totalSaldoSpan = document.getElementById("totalSaldo");

// Ícones SVG inline para os botões
const ICONES = {
  visualizar: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
  </svg>`,
  
  editar: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>`,
  
  excluir: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>`,
  
  carregamento: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
  </svg>`,
  
  gerarOrdem: `<svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>`
};

function formatNumber(number) {
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function parseFormattedNumber(str) {
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

// Adicionar eventos de formatação para os campos monetários
document.querySelectorAll("#valordoFrete, #pedagio").forEach((input) => {
  input.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    value = (parseInt(value || 0) / 100).toFixed(2);
    e.target.value = formatNumber(parseFloat(value));
  });
});

function verificarFreteAntigo(dataString) {
  if (!dataString || dataString === "N/A") return "normal";
  
  try {
    let dataFrete;
    
    // Verifica se a data está no formato brasileiro (dd/mm/yyyy ou dd/mm/yy)
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(dataString)) {
      const partes = dataString.split('/');
      const dia = parseInt(partes[0]);
      const mes = parseInt(partes[1]) - 1; // Mês começa em 0
      const ano = parseInt(partes[2]);
      // Se o ano tem 2 dígitos, assume século 20 se < 50, senão século 21
      const anoCompleto = ano < 50 ? 2000 + ano : 1900 + ano;
      dataFrete = new Date(anoCompleto, mes, dia);
    } else {
      // Tenta criar a data diretamente
      dataFrete = new Date(dataString);
    }
    
    const dataAtual = new Date();
    const diferencaDias = Math.floor((dataAtual - dataFrete) / (1000 * 60 * 60 * 24));
    
    console.log(`Verificando frete: ${dataString}, data convertida: ${dataFrete.toISOString()}, diferença em dias: ${diferencaDias}`);
    
    // Retorna categoria baseada na idade do frete
    if (diferencaDias > 60) {
      return "muito-antigo"; // 2 meses ou mais - amarelo
    } else if (diferencaDias > 30) {
      return "antigo"; // 1 mês - vermelho
    } else {
      return "normal"; // Menos de 1 mês
    }
  } catch (error) {
    console.error("Erro ao verificar idade do frete:", error);
    return "normal";
  }
}

function getCorFundoCentroCusto(centroCusto) {
    switch(centroCusto?.toLowerCase()) {
        case 'ferro':
            return '#6e6565'; // cinza claro
        case 'imbituba':
            return '#009ee7'; // azul
        case 'paranagua':
            return '#068246'; // verde
        case 'fertilizante':
        default:
            return '#ffffff'; // branco
    }
}

async function carregarFretes() {
  try {
    loadingManager.show();
    const fretesRef = collection(db, "fretes");
    const q = query(fretesRef, orderBy("data", "desc")); 

    const querySnapshot = await getDocs(q);
    corpoTabela.innerHTML = "";
    let totalSaldo = 0;

    querySnapshot.forEach((doc) => {
        const frete = doc.data();
        const liberado = parseFloat(frete.liberado) || 0;
        const carregado = parseFloat(frete.carregado) || 0;
        const saldo = liberado - carregado;
        totalSaldo += saldo;

        // VERIFICA SE O CLIENTE É OUROFERTIL PARA ADICIONAR O BOTÃO
        let botaoOrdem = '';
        console.log('Nome do cliente:', frete.cliente.toLowerCase());
        if (frete.cliente.toLowerCase().includes('ourofertil nordeste')) {
            botaoOrdem = `<button class="btn-acao btn-gerar-ordem" onclick="gerarOrdemCarregamento('${doc.id}', event)" title="Gerar Ordem">
              ${ICONES.gerarOrdem}
            </button>`;
        }
        
        const categoriaFrete = verificarFreteAntigo(frete.data);
        const corFundo = getCorFundoCentroCusto(frete.centrodecusto);
        
        // Aplicar classe CSS e cor baseada na categoria de idade do frete
        let classeFreteAntigo = '';
        let corFreteAntigo = corFundo;
        
        if (categoriaFrete === "antigo") {
          classeFreteAntigo = 'frete-antigo';
          corFreteAntigo = 'rgb(249, 192, 200)'; // Vermelho claro
        } else if (categoriaFrete === "muito-antigo") {
          classeFreteAntigo = 'frete-muito-antigo';
          corFreteAntigo = 'rgb(255, 255, 0)'; // Amarelo
        }
        
        const estiloLinha = `style="background-color:${corFreteAntigo};"`;

        console.log(`Frete ${frete.cliente} - Data: ${frete.data}, Categoria: ${categoriaFrete}, Classe aplicada: ${classeFreteAntigo}`);

      const linha = `
        <tr class="linha-clicavel ${classeFreteAntigo}" data-frete-id="${doc.id}" data-centro-custo="${frete.centrodecusto || 'fertilizante'}" ${estiloLinha}>
          <td>${formatarData(frete.data)}</td>
          <td>${frete.cliente}</td>
          <td style="color: #f44336; font-weight: 500;">${frete.destino}</td>
          <td>${frete.pedido}</td>
          <td>${frete.produto}</td>
          <td>${frete.frempresa || 'N/A'}</td>
          <td>${formatNumber(liberado)} Ton</td>
          <td>${formatNumber(carregado)} Ton</td>
          <td>${formatNumber(saldo)} Ton</td>
          <td class="acoes">
            <button class="btn-acao btn-visualizar" onclick="visualizarFrete('${doc.id}', event)" title="Visualizar">
              ${ICONES.visualizar}
            </button>
            <button class="btn-acao btn-editar" onclick="editarFrete('${doc.id}', event)" title="Editar">
              ${ICONES.editar}
            </button>
            <button class="btn-acao btn-excluir" onclick="excluirFrete('${doc.id}', event)" title="Excluir">
              ${ICONES.excluir}
            </button>            
            <button class="btn-acao btn-carregamento" onclick="listarCarregamentos('${doc.id}', event)" title="Carregamentos">
              ${ICONES.carregamento}
            </button>
            ${botaoOrdem}
          </td>
        </tr>
      `;
      corpoTabela.innerHTML += linha;
    });

    // Adiciona o evento de clique para as linhas
    document.querySelectorAll('.linha-clicavel').forEach(linha => {
      linha.addEventListener('click', (event) => {
        // Verifica se o clique não foi em um botão de ação
        if (!event.target.closest('.acoes button')) {
          const freteId = linha.getAttribute('data-frete-id');
          window.location.href = `lista_carregamento.html?freteId=${freteId}`;
        }
      });
    });

    atualizarTotalSaldo(totalSaldo);
    } catch (error) {
        console.error("Erro ao carregar fretes:", error);
    } finally {
        loadingManager.hide();
    }
}

// ... resto do código permanece igual ...
// (incluindo todas as outras funções como atualizarTotalSaldo, buscarFretes, etc.)

carregarFretes();
