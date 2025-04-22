import { db } from "../../../js/firebase-config.js";

import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
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

const traelCollection = collection(db, "trael");

const urlParams = new URLSearchParams(window.location.search);
const carregamentoId = urlParams.get("carregamentoId");
let isEditMode = !!carregamentoId;

async function loadCarregamentoForEdit(carregamentoId) {
  if (carregamentoId) {
    try {
      loadingManager.show();
      const docSnap = await getDoc(doc(db, "trael", carregamentoId));
      if (docSnap.exists()) {
        const carregamento = docSnap.data();
        document.getElementById("datanfe").value = carregamento.datanfe;
        document.getElementById("placa").value = carregamento.placa;
        document.getElementById("localizacao").value = carregamento.localizacao;
        document.getElementById("status").value = carregamento.status;
        document.getElementById("mercadoria").value = carregamento.mercadoria;
        document.getElementById("nfe").value = carregamento.nfe;
        document.getElementById("cte").value = carregamento.cte;
        document.getElementById("previsao").value = carregamento.previsao;
        document.querySelector(
          `input[name="statusdiario"][value="${carregamento.statusdiario}"]`
        ).checked = true;
        document.getElementById("cliente").value = carregamento.cliente;
        document.getElementById("telefone").value = carregamento.telefone;
        document.getElementById("nome").value = carregamento.nome;
        document.getElementById("comentario").value = carregamento.comentario;

        document.getElementById("form-title").textContent = "Editar Carga";
      } else {
        alert("Carregamento não encontrado");
      }
    } catch (error) {
      console.log("Error getting document:", error);
      alert("Erro ao carregar carregamento");
    } finally{
      loadingManager.hide();
    }
  }
}

document.getElementById("carga-form").addEventListener("submit", async (e) => {
  e.preventDefault();
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
  ).value;
  const cliente = document.getElementById("cliente").value;
  const telefone = document.getElementById("telefone").value;
  const nome = document.getElementById("nome").value;
  const comentario = document.getElementById("comentario").value;

  const cargaData = {
    datanfe,
    placa,
    localizacao,
    status,
    mercadoria,
    nfe,
    cte,
    previsao,
    cliente,
    statusdiario,
    telefone,
    nome,
    comentario,
  };

  if (isEditMode) {
    try {
      loadingManager.show();
      await setDoc(doc(db, "trael", carregamentoId), cargaData);
      alert("Carregamento atualizado com sucesso!");
      window.location.href = "indextracking.html";
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Erro ao atualizar carregamento");
    }
  } else {
    try {
      await addDoc(traelCollection, cargaData);
      alert("Carregamento cadastrado com sucesso!");
      window.location.href = "indextracking.html";
    } catch (error) {
      console.error("Error adding document: ", error);
      alert("Erro ao cadastrar carregamento");
    }finally{
      loadingManager.hide();
    }
  }
});

if (carregamentoId) {
  loadCarregamentoForEdit(carregamentoId);
}
