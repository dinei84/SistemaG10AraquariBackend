import { db } from "../../../js/firebase-config.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
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

const formFrete = document.getElementById("formFrete");
const btnVoltar = document.getElementById("btnVoltar");

const urlParams = new URLSearchParams(window.location.search);
const freteId = urlParams.get("freteId");
let isEditMode = !!freteId;

// Funções de formatação
function formatNumber(number) {
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseFormattedNumber(str) {
  // Remove pontos de milhar e substitui vírgula por ponto
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

// Configurar formatação automática para campos numéricos
function setupNumberInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", function (e) {
    let value = e.target.value.replace(/\D/g, ""); // Remove tudo que não for dígito
    value = (parseInt(value || 0) / 100).toFixed(2); // Divide por 100 para obter decimais
    e.target.value = formatNumber(parseFloat(value)); // Formata com vírgula
  });

  // Permitir entrada de valores com ponto como separador de milhar
  input.pattern = "[0-9]{1,3}(\\.[0-9]{3})*,[0-9]{2}";
  input.inputMode = "decimal";
}

// Aplicar a todos os campos monetários
["liberado", "carregado", "saldo"].forEach(setupNumberInput);

async function loadFreteForEdit(freteId) {
  if (freteId) {
    try {
      loadingManager.show();
      const docRef = doc(db, "fretes", freteId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const freteData = docSnap.data();

        // Preencher campos simples
        document.getElementById("data").value = freteData.data || "";
        document.getElementById("centrodecusto").value = freteData.centrodecusto || "";
        document.getElementById("cliente").value = freteData.cliente || "";
        document.getElementById("representante").value = freteData.representante || "";
        document.getElementById("cnpj").value = freteData.cnpj || "";
        document.getElementById("ie").value = freteData.ie || "";
        document.getElementById("telefone").value = freteData.telefone || "";
        document.getElementById("expedidor").value = freteData.expedidor || "";
        document.getElementById("destino").value = freteData.destino || "";
        document.getElementById("estado").value = freteData.estado || "";
        document.getElementById("destinatario").value =
          freteData.destinatario || "";
        document.getElementById("recebedor").value = freteData.recebedor || "";
        document.getElementById("destinotroca").value =
          freteData.destinotroca || "";
        document.getElementById("pedido").value = freteData.pedido || "";
        document.getElementById("produto").value = freteData.produto || "";
        document.getElementById("embalagem").value = freteData.embalagem || "";
        document.getElementById("frempresa").value = freteData.frempresa || "";
        document.getElementById("motorista").value = freteData.motorista || "";
        document.getElementById("operacao").value = freteData.operacao || "";
        document.getElementById("lote").value = freteData.lote || "";
        document.getElementById("localizacao").value =
          freteData.localizacao || "";
        document.getElementById("observacao").textContent =
          freteData.observacao || "";

        // Formatando valores numéricos
        const liberado = parseFloat(freteData.liberado) || 0;
        const carregado = parseFloat(freteData.carregado) || 0;
        const saldo = (liberado - carregado).toFixed(2);

        document.getElementById("liberado").value = formatNumber(liberado);
        document.getElementById("carregado").value = formatNumber(carregado);
        document.getElementById("saldo").value = formatNumber(saldo);
      }
    } catch (error) {
      console.error("Erro ao carregar frete:", error);
      alert("Erro ao carregar dados do frete");
    }finally{
      loadingManager.hide();
    }
  }
}

formFrete.addEventListener("submit", async (e) => {
  e.preventDefault();

  const freteData = {
    data: document.getElementById("data").value,
    centrodecusto: document.getElementById("centrodecusto").value,
    cliente: document.getElementById("cliente").value,
    representante: document.getElementById("representante").value,
    cnpj: document.getElementById("cnpj").value,
    ie: document.getElementById("ie").value,
    telefone: document.getElementById("telefone").value,
    expedidor: document.getElementById("expedidor").value,
    destino: document.getElementById("destino").value,
    estado: document.getElementById("estado").value,
    destinatario: document.getElementById("destinatario").value,
    recebedor: document.getElementById("recebedor").value,
    destinotroca: document.getElementById("destinotroca").value,
    pedido: document.getElementById("pedido").value,
    produto: document.getElementById("produto").value,
    embalagem: document.getElementById("embalagem").value,
    frempresa: document.getElementById("frempresa").value,
    liberado: parseFormattedNumber(document.getElementById("liberado").value),
    carregado:
      parseFormattedNumber(document.getElementById("carregado").value) || 0,
    saldo: parseFormattedNumber(document.getElementById("saldo").value) || 0,
    motorista: document.getElementById("motorista").value,
    operacao: document.getElementById("operacao").value,
    lote: document.getElementById("lote").value,
    localizacao: document.getElementById("localizacao").value,
    observacao: document.getElementById("observacao").value,
    timestamp: new Date(),
  };

  try {
    if (isEditMode) {
      await updateDoc(doc(db, "fretes", freteId), freteData);
    } else {
      await addDoc(collection(db, "fretes"), freteData);
    }
    window.location.href = "lista_fretes.html";
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro ao salvar frete");
  }
});

formFrete.addEventListener("change", (e) => {
  if (e.target.id === "liberado" || e.target.id === "carregado") {
    const liberado =
      parseFormattedNumber(document.getElementById("liberado").value) || 0;
    const carregado =
      parseFormattedNumber(document.getElementById("carregado").value) || 0;
    const saldo = (liberado - carregado).toFixed(2);
    document.getElementById("saldo").value = formatNumber(saldo);
  }
});

btnVoltar.addEventListener("click", () => {
  window.location.href = "lista_fretes.html";
});

if (isEditMode) {
  loadFreteForEdit(freteId);
}

document.addEventListener('DOMContentLoaded', function() {
    // Definir o valor padrão do centro de custo como "fertilizante"
    const centroCustoSelect = document.getElementById('centrodecusto');
    if (centroCustoSelect && !centroCustoSelect.value) {
        centroCustoSelect.value = 'fertilizante';
    }
});
