import { db } from "../../../js/firebase-config.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  getDoc,
  increment,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth } from "../../../js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import loadingManager from "../../../js/loading.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/login.html";
  } else {
    console.log("Usuário autenticado:", user.email);
  }
});

const urlParams = new URLSearchParams(window.location.search);
const freteId = urlParams.get("freteId");

if (!freteId) {
  alert("Frete ID não encontrado!");
  // Optionally redirect back to frete list
  window.location.href = "lista_fretes.html";
}

function formatNumber(number) {
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseFormattedNumber(str) {
  // Primeiro remove pontos de milhar, depois substitui vírgula decimal por ponto
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

document.getElementById(
  "btnNovoCarregamento"
).href = `adicionar_carregamento.html?freteId=${freteId}`;

async function carregarCarregamentos() {
  try {
    loadingManager.show();
    const freteDoc = await getDoc(doc(db, "fretes", freteId));
    if (freteDoc.exists()) {
      const freteData = freteDoc.data();

      // Limpa os dados anteriores, mantendo o cabeçalho
      const tabelaFretes = document.getElementById("tabelaFretes");
      const cabecalhoFretes = tabelaFretes.querySelector("thead");
      tabelaFretes.innerHTML = "";
      tabelaFretes.appendChild(cabecalhoFretes);

      // Calcular o valor de 'marcado' (liberado - saldo)
      let marcado = "N/A";
      if (freteData.liberado && freteData.saldo) {
        // Converter valores formatados para números
        const liberado = typeof freteData.liberado === "string"
          ? parseFormattedNumber(freteData.liberado)
          : freteData.liberado;
        const saldo = typeof freteData.saldo === "string"
          ? parseFormattedNumber(freteData.saldo)
          : freteData.saldo;
        const marcadoCalculado = liberado - saldo;
        marcado = formatNumber(marcadoCalculado); // Formatar para exibição
      }

      // Cria corpo da tabela e adiciona os dados do frete
      const corpoFretes = document.createElement("tbody");
      corpoFretes.id = "corpoTabelaFretes";
      const linhaFrete = `
                <tr>
                    <td>${freteData.cliente || "N/A"}</td>
                    <td>${freteData.expedidor || "N/A"}</td>
                    <td>${freteData.destinatario || "N/A"}</td>
                    <td>${freteData.recebedor || "N/A"}</td>
                    <td>${freteData.destinotroca || "N/A"}</td>
                    <td>${freteData.destino || "N/A"}</td>
                    <td>${freteData.produto || "N/A"}</td>
                    <td>${freteData.embalagem || "N/A"}</td>
                    <td>${freteData.liberado || "N/A"}</td>
                    <td>${marcado}</td> <!-- Usar o valor calculado -->
                    <td>${freteData.saldo || "00.000"}</td>
                    <td>${freteData.frempresa || "N/A"}</td>
                    <td>${freteData.motorista || "N/A"}</td>
                    <td>${freteData.pedido || "N/A"}</td>
                    <td>${freteData.operacao || "N/A"}</td>
                    <td>${freteData.lote || "N/A"}</td>
                    <td>${freteData.observacoes || "N/A"}</td>
                </tr>
            `;
      corpoFretes.innerHTML = linhaFrete;
      tabelaFretes.appendChild(corpoFretes);
    } else {
      console.error("Frete não encontrado!");
      alert("Frete não encontrado!");
    }

    // Carrega os carregamentos relacionados
    const querySnapshot = await getDocs(
      collection(db, "fretes", freteId, "carregamentos")
    );
    const corpoTabelaCarregamentos = document.getElementById(
      "corpoTabelaCarregamentos"
    );
    corpoTabelaCarregamentos.innerHTML = "";

    if (querySnapshot.empty) {
      console.log("Nenhum carregamento encontrado para este frete.");
      corpoTabelaCarregamentos.innerHTML =
        "Ainda nenhum Carregamento cadastrado para este Frete.";
    } else {
      // Converter para array para poder ordenar
      const carregamentos = [];
      querySnapshot.forEach((doc) => {
        carregamentos.push({
          id: doc.id,
          ...doc.data(),
          // Adicionar timestamp para ordenação (se não existir, usar Date.now())
          timestamp: doc.data().timestamp || Date.now()
        });
      });

      // Ordenar por timestamp decrescente (mais recente primeiro)
      carregamentos.sort((a, b) => b.timestamp - a.timestamp);

      // Renderizar os carregamentos ordenados
      carregamentos.forEach((carregamento) => {
        // Verificar se tem NFe, CTe e data do manifesto preenchidos
        const isManifestado = 
          carregamento.nfe && 
          carregamento.cte && 
          carregamento["data-manifesto"];
        
        const linha = `
          <tr class="${isManifestado ? 'manifestado' : ''}">
            <td>${formatarData(carregamento.dataoc) || "N/A"}</td>
            <td>${carregamento.placa || "N/A"}</td>
            <td>${carregamento.motorista || "N/A"}</td>
            <td>${carregamento["tipo-veiculo"] || "N/A"}</td>
            <td>${formatNumber(
              carregamento["peso-carregado"] || "N/A"
            )}</td>
            <td>${carregamento.fretemotorista || "N/A"}</td>
            <td>${carregamento.emissor || "N/A"}</td>
            <td>${formatarData(carregamento["data-manifesto"]) || "N/A"}</td>
            <td>${carregamento.cte || "N/A"}</td>
            <td>${formatarData(carregamento["data-entrega"]) || "N/A"}</td>
            <td>${carregamento.nfe || "N/A"}</td>
            <td>${carregamento.observacao || "N/A"}</td>
            <td>${formatarTelefoneWhatsApp(carregamento.telefone)}</td>
            <td class="acoes">
              <button class="btn-editar" onclick="editarCarregamento('${
                carregamento.id
              }')">Editar</button>
              <button class="btn-excluir" onclick="excluirCarregamento('${
                carregamento.id
              }')">Excluir</button>
            </td>
          </tr>
        `;
        corpoTabelaCarregamentos.innerHTML += linha;
      });
    }
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    alert("Erro ao carregar dados. Verifique o console para mais detalhes.");
  } finally {
    loadingManager.hide();
  }
}

// Função para formatar datas para o padrão brasileiro (dd/MM/yy)
function formatarData(dataString) {
  if (!dataString || dataString === "N/A") return "N/A";
  
  try {
    // Verifica se a data já está no formato brasileiro
    if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(dataString)) {
      return dataString;
    }
    
    // Converte a string para um objeto Date
    const data = new Date(dataString);
    
    // Verifica se a data é válida
    if (isNaN(data.getTime())) return dataString;
    
    // Formata para dd/MM/yy
    const dia = data.getDate().toString().padStart(2, '0');
    const mes = (data.getMonth() + 1).toString().padStart(2, '0');
    const ano = data.getFullYear().toString().slice(-2);
    
    return `${dia}/${mes}/${ano}`;
  } catch (error) {
    console.error("Erro ao formatar data:", error);
    return dataString;
  }
}

// Função para formatar número de telefone como link do WhatsApp com mensagem predefinida
function formatarTelefoneWhatsApp(telefone) {
  if (!telefone || telefone === "N/A") return "N/A";
  
  // Remove caracteres não numéricos
  const numeroLimpo = telefone.replace(/\D/g, '');
  
  // Verifica se o número tem pelo menos 8 dígitos
  if (numeroLimpo.length < 8) return telefone;
  
  // Adiciona o código do país (55 para Brasil) se não estiver presente
  let numeroCompleto = numeroLimpo;
  if (!numeroLimpo.startsWith('55') && numeroLimpo.length <= 11) {
    numeroCompleto = '55' + numeroLimpo;
  }
  
  // Mensagem predefinida (deve ser codificada para URL)
  const mensagem = encodeURIComponent("Olá! Estou entrando em contato através do sistema de gerenciamento de fretes.");
  
  // Cria o link do WhatsApp com a mensagem
  return `<a href="https://wa.me/${numeroCompleto}?text=${mensagem}" target="_blank" class="whatsapp-link">${telefone}</a>`;
}

window.editarCarregamento = (carregamentoId) => {
  window.location.href = `adicionar_carregamento.html?freteId=${freteId}&carregamentoId=${carregamentoId}`;
};

window.excluirCarregamento = async (carregamentoId) => {
  if (
    confirm("Tem certeza que deseja excluir este carregamento permanentemente?")
  ) {
    try {
      loadingManager.show();
      const carregamentoRef = doc(
        db,
        "fretes",
        freteId,
        "carregamentos",
        carregamentoId
      );
      const carregamentoSnap = await getDoc(carregamentoRef);
      const peso = carregamentoSnap.data()["peso-carregado"];

      // Atualizar frete
      const freteRef = doc(db, "fretes", freteId);
      await updateDoc(freteRef, {
        carregado: increment(-peso),
        saldo: increment(peso),
      });

      await deleteDoc(carregamentoRef);
      carregarCarregamentos();
      alert("Carregamento excluído com sucesso!");
    } catch (error) {
      console.error("Erro ao excluir carregamento:", error);
    } finally {
      loadingManager.hide();
    }
  }
};

// Regex for number input validation
const numberPattern = /^[0-9]+(\.[0-9]{1,2})?$/; // Allows up to two decimal places

document.querySelectorAll('input[type="number"]').forEach((input) => {
  input.addEventListener("input", function (e) {
    if (!numberPattern.test(this.value)) {
      this.value = this.value.slice(0, -1); // Remove the last character if invalid
    }
  });
});

// Substitua a função window.captureAndShare por esta versão melhorada
window.captureAndDownload = async () => {
  try {
    alert("Preparando para o download...")

    //Carrega os dados do frete para obter destino e pedido
    const freteDoc = await getDoc(doc(db, "fretes", freteId));
    let destino = "SemDestino";
    let pedido = "SemPedido";

    if (freteDoc.exists()) {
      const freteData = freteDoc.data();
      destino = freteData.destino || destino;
      pedido = freteData.pedido || pedido;
    }

    // Formatar a data como DD-MM-YYYY
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '-');

    // Elementos a serem ocultados
    const elementsToHide = [
      document.getElementById('btnNovoCarregamento'),
      document.getElementById('btn-voltar-fretes'),
      document.querySelector('button[onclick ="captureAndDownload()]'),
      ...document.querySelectorAll('.acoes'),
    ];

    // Ocultar elementos
    elementsToHide.forEach((e)=>{
      if (e) e.classList.add("hide-for-print");
    });

    // Configurações do html2canvas
    const options = {
      scale: 2,
      logging: true,
      useCORS: true,
      scrollY: -window.scrollY,
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll(".hide-for-print").forEach((element) => {
          element.style.display = "none";
        });
      },
    };

    const container = document.querySelector(".container");
    const canvas = await html2canvas(container, options);
    const dataUrl = canvas.toDataURL("image/png", 1.0);

    //Criar nome do arquivo com destino, data e pedido
    const nomeArquivo = `${destino} ${dataFormatada} ${pedido}.png`;

    //Criar e disparar downoload
    const link = document.createElement('a');
    link.download = nomeArquivo;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    //Restaurar elementos
    elementsToHide.forEach((e)=>{
      if(e) e.classList.remove("hide-for-print");
    });
   
    alert("Imagem gerada com sucesso!");

  } catch (error) {
    console.error("Erro na captuta", error);
    alert("Falha ao gerar imagem")
  }
};

// Carrega os carregamentos quando a página é aberta
carregarCarregamentos();