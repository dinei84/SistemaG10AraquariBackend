import { db } from "../../../js/firebase-config.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  increment,
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
const carregamentoId = urlParams.get("carregamentoId");
let isEditMode = !!carregamentoId;

// Funções de formatação e cálculo
function formatNumber(number) {
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

function parseFormattedNumber(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

// Configurar campo de peso
const pesoInput = document.getElementById("peso-carregado");
if (pesoInput) {
  // Adiciona máscara apenas quando o campo perde o foco
  pesoInput.addEventListener("blur", function (e) {
    let value = e.target.value.replace(/[^\d,]/g, "");
    if (value) {
      const parsedValue = parseFormattedNumber(value);
      if (!isNaN(parsedValue)) {
        e.target.value = formatNumber(parsedValue);
      } else {
        e.target.value = "";
      }
    }
  });
  
  // Permite digitação livre enquanto edita
  pesoInput.addEventListener("focus", function(e) {
    let value = e.target.value;
    if (value) {
      e.target.value = value.replace(/\./g, "").replace(",", ".");
    }
  });
}

// Botão voltar
document.getElementById("btnVoltar")?.addEventListener("click", () => {
  window.location.href = `lista_carregamento.html?freteId=${freteId}`;
});

// Carregar dados para edição
async function loadCarregamentoForEdit() {
  if (!isEditMode) return;

  try {
    loadingManager.show();
    const carregamentoDoc = await getDoc(
      doc(db, "fretes", freteId, "carregamentos", carregamentoId)
    );
    if (carregamentoDoc.exists()) {
      const data = carregamentoDoc.data();
      document.getElementById("dataoc").value = data.dataoc || "";
      document.getElementById("placa").value = data.placa || "";
      document.getElementById("motorista").value = data.motorista || "";
      document.getElementById("tipo-veiculo").value = data["tipo-veiculo"] || "";
      
      // Formata o peso corretamente ao carregar
      const peso = parseFloat(data["peso-carregado"] || 0);
      pesoInput.value = formatNumber(peso);
      
      document.getElementById("fretemotorista").value = data.fretemotorista || "";
      document.getElementById("emissor").value = data.emissor || "";
      document.getElementById("data-manifesto").value =
        data["data-manifesto"] || "";
      document.getElementById("cte").value = data.cte || "";
      document.getElementById("data-entrega").value = data["data-entrega"] || "";
      document.getElementById("nfe").value = data.nfe || "";
      document.getElementById("observacao").value = data.observacao || "";
      document.getElementById("telefone").value = data.telefone || "";
    }
  } catch (error) {
    console.error("Erro ao carregar:", error.message, error.stack);
    alert("Erro ao carregar dados do carregamento");
  } finally {
    loadingManager.hide();
  }
}

// Validação de peso (modificada para não interferir na edição)
if (pesoInput) {
  pesoInput.addEventListener("change", async () => {
    const peso = parseFormattedNumber(pesoInput.value) || 0;
    const freteDoc = await getDoc(doc(db, "fretes", freteId));
    const freteData = freteDoc.data();

    let saldoDisponivel = parseFloat(freteData.saldo);

    if (isEditMode) {
      const carregamentoAnterior = await getDoc(
        doc(db, "fretes", freteId, "carregamentos", carregamentoId)
      );
      if (carregamentoAnterior.exists()) {
        saldoDisponivel +=
          parseFloat(carregamentoAnterior.data()["peso-carregado"]) || 0;
      }
    }

    if (peso > saldoDisponivel) {
      alert(`Saldo disponível: ${formatNumber(saldoDisponivel)} Toneladas`);
      pesoInput.value = formatNumber(saldoDisponivel);
    }
  });
}

// Submit do formulário (ajustado para melhor tratamento de erros)
document
  .getElementById("formCarregamento")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loadingManager.show();
    
    try {
      const freteRef = doc(db, "fretes", freteId);
      const freteDoc = await getDoc(freteRef);
      
      if (!freteDoc.exists()) {
        alert("Frete não encontrado!");
        return;
      }
      
      const freteData = freteDoc.data();

      const pesoCarregado = parseFormattedNumber(pesoInput.value);
      if (isNaN(pesoCarregado) || pesoCarregado <= 0) {
        alert("Peso carregado inválido!");
        return;
      }

      // Cálculo do saldo disponível
      let saldoDisponivel = parseFloat(freteData.saldo) || 0;
      let pesoOriginal = 0;

      if (isEditMode) {
        const carregamentoAnterior = await getDoc(
          doc(db, "fretes", freteId, "carregamentos", carregamentoId)
        );
        if (carregamentoAnterior.exists()) {
          pesoOriginal = parseFloat(carregamentoAnterior.data()["peso-carregado"] || 0);
          saldoDisponivel += pesoOriginal;
        }
      }

      if (pesoCarregado > saldoDisponivel) {
        alert(
          `Saldo insuficiente! Disponível: ${formatNumber(saldoDisponivel)} Ton`
        );
        return;
      }

      // Atualizar frete
      const novoCarregado =
        (parseFloat(freteData.carregado) || 0) -
        pesoOriginal +
        pesoCarregado;
      const novoSaldo = (parseFloat(freteData.liberado) || 0) - novoCarregado;

      await updateDoc(freteRef, {
        carregado: parseFloat(novoCarregado.toFixed(3)),
        saldo: parseFloat(novoSaldo.toFixed(3)),
      });

      // Obter valores dos campos de manifesto
      const cte = document.getElementById("cte").value;
      const nfe = document.getElementById("nfe").value;
      const dataManifesto = document.getElementById("data-manifesto").value;
      
      // Determinar se está manifestado
      const isManifestado = cte || nfe || dataManifesto;

      // Salvar carregamento com timestamp ordenável
      const carregamentoData = {
        "peso-carregado": Number(pesoCarregado.toFixed(3)),
        placa: document.getElementById("placa").value,
        motorista: document.getElementById("motorista").value,
        "tipo-veiculo": document.getElementById("tipo-veiculo").value,
        fretemotorista: document.getElementById("fretemotorista").value,
        dataoc: document.getElementById("dataoc").value,
        emissor: document.getElementById("emissor").value,
        "data-manifesto": dataManifesto,
        cte: cte,
        "data-entrega": document.getElementById("data-entrega").value,
        nfe: nfe,
        observacao: document.getElementById("observacao").value,
        telefone: document.getElementById("telefone").value,
        timestamp: new Date(),
        isManifestado: isManifestado // Novo campo para identificar manifestados
      };

      if (isEditMode) {
        await updateDoc(
          doc(db, "fretes", freteId, "carregamentos", carregamentoId),
          carregamentoData
        );
      } else {
        await addDoc(
          collection(db, "fretes", freteId, "carregamentos"),
          carregamentoData
        );
      }

      alert("Carregamento salvo com sucesso!");
      window.location.href = `lista_carregamento.html?freteId=${freteId}`;
    } catch (error) {
      console.error("Erro ao salvar:", error.message, error.stack);
      alert(`Erro ao salvar carregamento: ${error.message}`);
    } finally {
      loadingManager.hide();
    }
  });

// Inicialização
if (isEditMode) {
  loadCarregamentoForEdit();
} else {
  // Inicializa campo de peso vazio para novo carregamento
  if (pesoInput) pesoInput.value = "";
}