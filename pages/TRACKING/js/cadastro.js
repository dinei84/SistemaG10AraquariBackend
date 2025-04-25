import { db } from "../../../js/firebase-config.js";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth } from "../../../js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import loadingManager from "../../../js/loading.js";

// Verifica autenticação do usuário
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log("Usuário não autenticado, redirecionando para login.");
    window.location.href = "/login.html";
  } else {
    console.log("Usuário autenticado:", user.email);
    if (carregamentoId) {
      loadCarregamentoForEdit(carregamentoId);
    }
  }
});

const traelCollection = collection(db, "trael");

const urlParams = new URLSearchParams(window.location.search);
const carregamentoId = urlParams.get("carregamentoId");
let isEditMode = !!carregamentoId;

async function loadCarregamentoForEdit(carregamentoId) {
  if (!carregamentoId) {
    console.error("Nenhum carregamentoId fornecido para edição.");
    return;
  }

  try {
    loadingManager.show();
    const docSnap = await getDoc(doc(db, "trael", carregamentoId));
    if (docSnap.exists()) {
      const carregamento = docSnap.data();
      console.log("Dados do carregamento:", carregamento);

      // Preencher campos do formulário
      document.getElementById("datanfe").value = carregamento.datanfe || "";
      document.getElementById("placa").value = carregamento.placa || "";
      document.getElementById("localizacao").value = carregamento.localizacao || "";
      document.getElementById("status").value = carregamento.status || "";
      document.getElementById("mercadoria").value = carregamento.mercadoria || "";
      document.getElementById("nfe").value = carregamento.nfe || "";
      document.getElementById("cte").value = carregamento.cte || "";
      document.getElementById("previsao").value = carregamento.previsao || "";
      document.getElementById("cliente").value = carregamento.cliente || "";
      document.getElementById("telefone").value = carregamento.telefone || "";
      document.getElementById("nome").value = carregamento.nome || "";
      document.getElementById("comentario").value = carregamento.comentario || "";

      // Preencher statusdiario (radio buttons)
      const statusDiario = carregamento.statusdiario || "Not Check";
      const radioValue = statusDiario === "Check" ? "Check" : "Not Check";
      const radio = document.querySelector(
        `input[name="statusdiario"][value="${radioValue}"]`
      );
      if (radio) {
        radio.checked = true;
      } else {
        console.warn(`Valor inválido para statusdiario: ${statusDiario}`);
        document.querySelector(`input[name="statusdiario"][value="Not Check"]`).checked = true;
      }

      document.getElementById("form-title").textContent = "Editar Carga";
    } else {
      console.error("Carregamento não encontrado para ID:", carregamentoId);
      alert("Carregamento não encontrado.");
      window.location.href = "indextracking.html";
    }
  } catch (error) {
    console.error("Erro ao carregar carregamento:", error);
    alert("Erro ao carregar carregamento: " + error.message);
    window.location.href = "indextracking.html";
  } finally {
    loadingManager.hide();
  }
}

document.getElementById("carga-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  // Coletar dados do formulário
  const datanfe = document.getElementById("datanfe").value;
  const placa = document.getElementById("placa").value;
  const localizacao = document.getElementById("localizacao").value;
  const status = document.getElementById("status").value;
  const mercadoria = document.getElementById("mercadoria").value;
  const nfe = document.getElementById("nfe").value;
  const cte = document.getElementById("cte").value;
  const previsao = document.getElementById("previsao").value;
  const statusdiario = document.querySelector(
    'input[name="statusdiario"]:checked'
  )?.value || "Not Check";
  const cliente = document.getElementById("cliente").value;
  const telefone = document.getElementById("telefone").value;
  const nome = document.getElementById("nome").value;
  const comentario = document.getElementById("comentario").value;

  // Validação de campos obrigatórios
  if (!placa || !localizacao || !mercadoria) {
    alert("Por favor, preencha todos os campos obrigatórios: Placa, Localização e Mercadoria.");
    return;
  }

  const cargaData = {
    datanfe,
    placa,
    localizacao,
    status,
    mercadoria,
    nfe,
    cte,
    previsao,
    statusdiario,
    cliente,
    telefone,
    nome,
    comentario,
  };

  console.log("Dados a serem salvos:", cargaData);

  try {
    loadingManager.show();
    if (isEditMode) {
      // Modo edição: atualizar documento existente
      await updateDoc(doc(db, "trael", carregamentoId), cargaData);
      alert("Carregamento atualizado com sucesso!");
    } else {
      // Modo criação: adicionar novo documento
      await addDoc(traelCollection, cargaData);
      alert("Carregamento cadastrado com sucesso!");
    }
    window.location.href = "indextracking.html";
  } catch (error) {
    console.error("Erro ao salvar carregamento:", error);
    alert("Erro ao salvar carregamento: " + error.message);
  } finally {
    loadingManager.hide();
  }
});