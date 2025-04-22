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
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

// Configurar campo de peso
const pesoInput = document.getElementById("peso-carregado");
if (pesoInput) {
  pesoInput.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, "");
    value = (parseInt(value || 0) / 1000).toFixed(3);
    e.target.value = value.replace(".", ",");
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
      document.getElementById("tipo-veiculo").value =
        data["tipo-veiculo"] || "";
      document.getElementById("fretemotorista").value =
        data.fretemotorista || "";
      document.getElementById("emissor").value = data.emissor || "";
      document.getElementById("data-manifesto").value =
        data["data-manifesto"] || "";
      document.getElementById("cte").value = data.cte || "";
      document.getElementById("data-entrega").value =
        data["data-entrega"] || "";
      document.getElementById("nfe").value = data.nfe || "";
      document.getElementById("observacao").value = data.observacao || "";

      // Formatar peso
      if (data["peso-carregado"]) {
        const peso = parseFloat(data["peso-carregado"]).toFixed(3);
        document.getElementById("peso-carregado").value = peso.replace(
          ".",
          ","
        );
      }
    }
  } catch (error) {
    console.error("Erro ao carregar:", error);
    alert("Erro ao carregar dados do carregamento");
  } finally{
    loadingManager.hide();
  }
}

// Validação de peso
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
      saldoDisponivel +=
        parseFloat(carregamentoAnterior.data()["peso-carregado"]) || 0;
    }

    if (peso > saldoDisponivel) {
      alert(`Saldo disponível: ${formatNumber(saldoDisponivel)} Toneladas`);
      pesoInput.value = saldoDisponivel.toFixed(3).replace(".", ",");
    }
  });
}

// Submit do formulário
document
  .getElementById("formCarregamento")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const freteRef = doc(db, "fretes", freteId);
      const freteDoc = await getDoc(freteRef);
      const freteData = freteDoc.data();

      const pesoCarregado = parseFormattedNumber(pesoInput.value);
      if (isNaN(pesoCarregado)) {
        alert("Peso carregado inválido!");
        return;
      }

      // Nova lógica para edição
      let saldoDisponivel = parseFloat(freteData.saldo);
      let pesoOriginal = 0;

      if (isEditMode) {
        const carregamentoAnterior = await getDoc(
          doc(db, "fretes", freteId, "carregamentos", carregamentoId)
        );
        pesoOriginal = carregamentoAnterior.data()["peso-carregado"] || 0;
        saldoDisponivel += parseFloat(pesoOriginal); // Adiciona o peso original de volta ao saldo
      }

      if (pesoCarregado > saldoDisponivel) {
        alert(
          `Saldo insuficiente! Disponível: ${formatNumber(saldoDisponivel)} Ton`
        );
        return;
      }

      // Atualizar frete com precisão
      const novoCarregado =
        (parseFloat(freteData.carregado) || 0) -
        parseFloat(pesoOriginal) +
        pesoCarregado;
      const novoSaldo = (parseFloat(freteData.liberado) || 0) - novoCarregado;

      await updateDoc(freteRef, {
        carregado: parseFloat(novoCarregado.toFixed(3)),
        saldo: parseFloat(novoSaldo.toFixed(3)),
      });

      // Salvar carregamento
      const carregamentoData = {
        "peso-carregado": parseFloat(pesoCarregado.toFixed(3)),
        placa: document.getElementById("placa").value,
        motorista: document.getElementById("motorista").value,
        "tipo-veiculo": document.getElementById("tipo-veiculo").value,
        fretemotorista: document.getElementById("fretemotorista").value,
        dataoc: document.getElementById("dataoc").value,
        emissor: document.getElementById("emissor").value,
        "data-manifesto": document.getElementById("data-manifesto").value,
        cte: document.getElementById("cte").value,
        "data-entrega": document.getElementById("data-entrega").value,
        nfe: document.getElementById("nfe").value,
        observacao: document.getElementById("observacao").value,
        timestamp: new Date(),
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
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar carregamento");
    }
  });

// Inicialização
if (isEditMode) loadCarregamentoForEdit();
