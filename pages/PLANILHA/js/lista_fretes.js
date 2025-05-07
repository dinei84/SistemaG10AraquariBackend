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

function formatNumber(number) {
  return number.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

      const linha = `
        <tr class="linha-clicavel" data-frete-id="${doc.id}">
          <td>${formatarData(frete.data)}</td>
          <td>${frete.cliente}</td>
          <td style="color: #f44336; font-weight: 500;">${frete.destino}</td>
          <td>${frete.pedido}</td>
          <td>${frete.frempresa || 'N/A'}</td>
          <td>${liberado.toFixed(2)} Ton</td>
          <td>${carregado.toFixed(2)} Ton</td>
          <td>${saldo.toFixed(2)} Ton</td>
          <td class="acoes">
            <button class="btn-visualizar" onclick="visualizarFrete('${doc.id}', event)">Visualizar</button>
            <button class="btn-editar" onclick="editarFrete('${doc.id}', event)">Editar</button>
            <button class="btn-excluir" onclick="excluirFrete('${doc.id}', event)">Excluir</button>            
            <button class="btn-carregamento" onclick="listarCarregamentos('${doc.id}', event)">Carregamentos</button>
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

function atualizarTotalSaldo(total) {
  totalSaldoSpan.textContent = `Saldo Total: ${total.toFixed(2)} Ton`;
}

function buscarFretes() {
  const termo = document.getElementById("searchInput").value.toLowerCase();
  const linhas = document.querySelectorAll("#tabelaFretes tbody tr");
  let totalSaldo = 0;

  linhas.forEach((linha) => {
    const colunas = linha.querySelectorAll("td");
    const textoLinha = Array.from(colunas)
      .map((td) => td.textContent.toLowerCase())
      .join(" ");

    if (textoLinha.includes(termo)) {
      linha.style.display = "";
      totalSaldo += parseFloat(colunas[7].textContent);
    } else {
      linha.style.display = "none";
    }
  });

  atualizarTotalSaldo(totalSaldo);
}

document.getElementById("searchInput").addEventListener("input", buscarFretes);

window.editarFrete = function (id, event) {
  event.stopPropagation();
  window.location.href = `../PLANILHA/index.html?freteId=${id}`; // Caminho corrigido
};

window.excluirFrete = async (freteId, event) => {
  event.stopPropagation();
  if (confirm("Tem certeza que deseja excluir este frete permanentemente?")) {
    try {
        loadingManager.show();
        await deleteDoc(doc(db, "fretes", freteId));
        await carregarFretes(); 
        alert("Frete excluído com sucesso!");
    } catch (error) {
        console.error("Erro ao excluir frete:", error);
        alert("Erro ao excluir frete");
    } finally {
        loadingManager.hide();
    }
  }
};

window.listarCarregamentos = (freteId, event) => {
  event.stopPropagation();
  window.location.href = `lista_carregamento.html?freteId=${freteId}`;
};

window.visualizarFrete = async (freteId, event) => {
  event.stopPropagation();
  try {
    loadingManager.show();
    const docRef = doc(db, "fretes", freteId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        const frete = docSnap.data();
      const saldo =
        (parseFloat(frete.liberado) || 0) - (parseFloat(frete.carregado) || 0);

      const popupContent = `
                <p><strong>Data:</strong> ${formatarData(frete.data)}</p>
                <p><strong>Cliente:</strong> ${frete.cliente}</p>
                <p><strong>Destino:</strong> ${frete.destino}</p>
                <P><strong>Troca de NFe: </strong>${frete.destinotroca || "Sem Troca de NFe"}</p>
                <p><strong>Pedido:</strong> ${frete.pedido}</p>                
                <p><strong>Liberado:</strong> ${parseFloat(
                  frete.liberado
                ).toFixed(2)} Ton</p>
                <p><strong>Carregado:</strong> ${parseFloat(
                  frete.carregado
                ).toFixed(2)} Ton</p>
                <p><strong>Saldo:</strong> ${saldo.toFixed(2)} Ton</p>
                <p><strong>Valor do Frete:</strong> ${
                  frete.frempresa || "00,00"
                }</p>
                <p><strong>Frete Motorista:</strong> ${
                  frete.motorista || "00,00"
                }</p>
                <p><strong>Localização:</strong> ${
                  frete.localizacao || "Nenhuma"
                }</p>
                <p><strong>Observações:</strong> ${
                  frete.observacao || "Nenhuma"
                }</p>
            `;

      document.getElementById("popupBody").innerHTML = popupContent;
      document.getElementById("fretePopup").style.display = "block";
    }
  } catch (error) {
    console.error("Erro ao carregar frete:", error);
    alert("Erro ao carregar detalhes do frete");
  } finally {
    loadingManager.hide();
  }
};

function abrirPopup() {
  document.querySelector(".popup-overlay").style.display = "flex";
}

window.fecharPopup = () => {
  document.getElementById("fretePopup").style.display = "none";
};

document.getElementById("fretePopup").addEventListener("click", (e) => {
  if (e.target === document.getElementById("fretePopup")) {
    fecharPopup();
  }
});

// Função para formatar a data
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



carregarFretes();