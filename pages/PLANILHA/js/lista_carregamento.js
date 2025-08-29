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
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
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

      // Carrega os carregamentos relacionados
      const querySnapshot = await getDocs(
        collection(db, "fretes", freteId, "carregamentos")
      );
      const tabelaCarregamentos = document.getElementById("tabelaCarregamentos");
      const tbody = tabelaCarregamentos.querySelector('tbody');
      tbody.innerHTML = "";

      // Soma dos pesos dos carregamentos
      let somaCarregado = 0;
      const carregamentos = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        let peso = 0;
        if (typeof data["peso-carregado"] === "string") {
          peso = parseFormattedNumber(data["peso-carregado"]);
        } else {
          peso = data["peso-carregado"] || 0;
        }
        somaCarregado += peso;
        carregamentos.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp || Date.now(),
        });
      });

      // Atualiza o campo 'carregado' e 'saldo' no banco se necessário
      let liberado = 0;
      if (typeof freteData.liberado === "string") {
        liberado = parseFormattedNumber(freteData.liberado);
      } else {
        liberado = freteData.liberado || 0;
      }
      let saldo = liberado - somaCarregado;
      if (saldo < 0) saldo = 0;
      // Atualiza no banco se diferente
      if (
        freteData.carregado !== somaCarregado ||
        freteData.saldo !== saldo
      ) {
        const freteRef = doc(db, "fretes", freteId);
        await updateDoc(freteRef, {
          carregado: somaCarregado,
          saldo: saldo,
        });
      }

      // Calcular o valor de 'marcado' (liberado - saldo)
      let marcado = liberado - saldo;
      // Formatar para exibição
      const liberadoFormatado = formatNumber(liberado);
      const saldoFormatado = formatNumber(saldo);
      const marcadoFormatado = formatNumber(marcado);
      const carregadoFormatado = formatNumber(somaCarregado);

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
                    <td>${liberadoFormatado}</td>
                    <td style="background-color: lightgreen !important;">${marcadoFormatado}</td>
                    <td style="background-color: yellow !important;">${saldoFormatado}</td>
                    <td>${freteData.frempresa || "N/A"}</td>
                    <td>${freteData.motorista || "N/A"}</td>
                    <td>${freteData.pedido || "N/A"}</td>
                    <td>${freteData.operacao || "N/A"}</td>
                    <td>${freteData.lote || "N/A"}</td>
                    <td>${freteData.observacao || "N/A"}</td>
                </tr>
            `;
      corpoFretes.innerHTML = linhaFrete;
      tabelaFretes.appendChild(corpoFretes);

      if (querySnapshot.empty) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="14" style="text-align: center;">
            Ainda nenhum Carregamento cadastrado para este Frete.
          </td>
        `;
        tbody.appendChild(row);
      } else {
        // Ordenar por timestamp decrescente (mais recente primeiro)
        carregamentos.sort((a, b) => b.timestamp - a.timestamp);
        carregamentos.forEach((carregamento) => {
          // Check if all required fields exist and are not empty
          const hasNfe = carregamento.nfe && carregamento.nfe !== "N/A" && carregamento.nfe.trim() !== "";
          const hasCte = carregamento.cte && carregamento.cte !== "N/A" && carregamento.cte.trim() !== "";
          const hasDataManifesto = carregamento["data-manifesto"] && carregamento["data-manifesto"] !== "N/A" && carregamento["data-manifesto"].trim() !== "";
          
          const isManifestado = hasNfe && hasCte && hasDataManifesto;
          
          console.log(`Carregamento ${carregamento.id}:`, { 
            nfe: carregamento.nfe, 
            hasNfe: hasNfe,
            cte: carregamento.cte, 
            hasCte: hasCte,
            dataManifesto: carregamento["data-manifesto"],
            hasDataManifesto: hasDataManifesto,
            isManifestado: isManifestado,
            allFields: carregamento
          });
          const linha = `
            <tr class="${isManifestado ? 'manifestado' : ''}">
              <td>${formatarData(carregamento.dataoc) || "N/A"}</td>
              <td>${carregamento.placa || "N/A"}</td>
              <td>${carregamento.motorista || "N/A"}</td>
              <td>${carregamento["tipo-veiculo"] || "N/A"}</td>
              <td>${formatNumber(parseFloat(carregamento["peso-carregado"]) || 0)}</td>
              <td>${carregamento.fretemotorista || "N/A"}</td>
              <td>${carregamento.emissor || "N/A"}</td>
              <td>${formatarData(carregamento["data-manifesto"]) || "N/A"}</td>
              <td>${carregamento.cte || "N/A"}</td>
              <td>${formatarData(carregamento["data-entrega"]) || "N/A"}</td>
              <td>${carregamento.nfe || "N/A"}</td>
              <td>${carregamento.observacao || "N/A"}</td>
              <td>${formatarTelefoneWhatsApp(carregamento.telefone)}</td>
              <td class="acoes">
                <button class="btn-editar" onclick="editarCarregamento('${carregamento.id}')">Editar</button>
                <button class="btn-excluir" onclick="excluirCarregamento('${carregamento.id}')">Excluir</button>
              </td>
            </tr>
          `;
          tbody.insertAdjacentHTML('beforeend', linha);
        });
      }
    } else {
      console.error("Frete não encontrado!");
      alert("Frete não encontrado!");
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
    loadingManager.show(); // Mostra loader
    
    // 1. Espera um frame para garantir que o DOM está pronto
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // 2. Define o container específico
    const container = document.querySelector('.table-card.lista-carregamento');
    
    // 3. Configurações otimizadas para html2canvas
    const options = {
      scale: 2,
      logging: true,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      removeContainer: true,
      onclone: (clonedDoc) => {
        // Garante que todos os elementos estão visíveis
        clonedDoc.querySelectorAll('table, tr, td, th').forEach(el => {
          el.style.opacity = '1';
          el.style.visibility = 'visible';
        });
        
        // Remove elementos que não devem aparecer
        clonedDoc.querySelectorAll('.hide-for-print').forEach(el => {
          el.style.display = 'none';
        });
      }
    };

    // 4. Força redraw antes de capturar
    container.style.display = 'none';
    container.offsetHeight; // Trigger reflow
    container.style.display = 'block';

    // 5. Captura com timeout para garantir renderização
    const canvas = await Promise.race([
      html2canvas(container, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tempo excedido')), 5000))
    ]);

    // 6. Configura o download
    const freteDoc = await getDoc(doc(db, "fretes", freteId));
    const freteData = freteDoc.exists() ? freteDoc.data() : {};
    
    const fileName = `Cidade: ${freteData.destino || 'frete'}_Pedido: ${freteData.pedido || 'pedido'}_ Data-Exclusão: ${new Date().toISOString().slice(0,10)}.png`;
    const dataUrl = canvas.toDataURL('image/png', 1.0);

    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error('Erro na captura:', error);
    alert(`Erro ao gerar imagem: ${error.message}`);
  } finally {
    loadingManager.hide();
  }
};

// Carrega os carregamentos quando a página é aberta
carregarCarregamentos();