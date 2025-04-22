// indextracking.js
import { db } from "../../../js/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { auth } from "../../../js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import importManager from "../../../js/loading.js"
import loadingManager from "../../../js/loading.js";

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/login.html";
  } else {
    console.log("Usuário autenticado:", user.email);
  }
});

const traelCollection = collection(db, "trael");

function getSaudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

async function carregarCarregamentos() {
  try {
    loadingManager.show();
    const querySnapshot = await getDocs(traelCollection);
    const cargas = document.getElementById("cargas-lista");
    cargas.innerHTML = "";

    // Agrupar cargas por cliente
    const cargasPorCliente = {};
    
    querySnapshot.forEach((doc) => {
      const carga = doc.data();
      if (!cargasPorCliente[carga.cliente]) {
        cargasPorCliente[carga.cliente] = [];
      }
      cargasPorCliente[carga.cliente].push({ id: doc.id, ...carga });
    });

    // Ordenar clientes alfabeticamente
    const clientesOrdenados = Object.keys(cargasPorCliente).sort();

    // Criar linhas agrupadas por cliente
    clientesOrdenados.forEach(cliente => {
      // Adicionar linha de cabeçalho do cliente
      const headerRow = document.createElement("tr");
      headerRow.className = "cliente-header";
      headerRow.innerHTML = `
        <td colspan="15" style="background-color: #f0f0f0; font-weight: bold;">
          ${cliente}
        </td>
      `;
      cargas.appendChild(headerRow);

      // Adicionar cargas do cliente (ordenadas por data)
      cargasPorCliente[cliente]
        .sort((a, b) => new Date(a.datanfe) - new Date(b.datanfe))
        .forEach(carga => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><input type="checkbox" class="row-checkbox" data-id="${carga.id}"></td>
            <td>${carga.datanfe || ""}</td>
            <td>${carga.placa || ""}</td>
            <td>${carga.localizacao || ""}</td>
            <td>${carga.status || ""}</td>                
            <td>${carga.mercadoria || ""}</td>
            <td>${carga.nfe || ""}</td>
            <td>${carga.cte || ""}</td>
            <td>${carga.previsao || ""}</td>
            <td style="background-color: ${
              carga.statusdiario?.trim().toLowerCase() === "sim"
                ? "green"
                : "red"
            };">
                ${carga.statusdiario || ""}
            </td>
            <td>${carga.cliente || ""}</td>
            <td>
                ${
                  carga.telefone
                    ? `<a href="https://wa.me/55${carga.telefone.replace(
                        /\D/g,
                        ""
                      )}?text=${encodeURIComponent(
                        getSaudacao() +
                          `, ${carga.nome}, preciso saber sua localização.`
                      )}" target="_blank">
                    ${carga.telefone}
                </a>`
                    : ""
                }
            </td>
            <td>${carga.nome || ""}</td>
            <td>${carga.comentario || ""}</td>
            <td>
              <button class="btn-edit" onclick="editarCarga('${
                carga.id
              }')">Editar</button>
              <button class="btn-delete" onclick="excluirCarga('${
                carga.id
              }')">Excluir</button>
            </td>
          `;
          cargas.appendChild(tr);
        });
    });
  } catch (error) {
    console.error("Erro ao carregar cargas: ", error);
    alert("Erro ao carregar cargas");
  } finally {
    loadingManager.hide();
  }
}

window.editarCarga = (id) => {
  window.location.href = `cadastro.html?carregamentoId=${id}`;
};

window.excluirCarga = async (id) => {
  if (confirm("Deseja realmente excluir esta carga?")) {
    try {
      loadingManager.show();
      await deleteDoc(doc(db, "trael", id));
      alert("Carga excluída com sucesso!");
      carregarCarregamentos();
    } catch (error) {
      console.error("Erro ao excluir carga: ", error);
      alert("Erro ao excluir carga");
    } finally{
      loadingManager.hide();
    }
  }
};

window.addEventListener("load", carregarCarregamentos);

// Função para selecionar/deselecionar todos os checkboxes
window.toggleSelectAll = () => {
  const selectAllCheckbox = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('.row-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
};

// Função para capturar e compartilhar apenas os motoristas selecionados
window.captureAndShareSelected = async () => {
  try {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
      alert('Por favor, selecione pelo menos um motorista para compartilhar.');
      return;
    }

    // Obter os IDs dos itens selecionados
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

    // Cria um clone da tabela original (apenas cabeçalho)
    const originalTable = document.querySelector("table");
    const clonedTable = originalTable.cloneNode(false); // false para pegar apenas o thead
    const clonedThead = originalTable.querySelector('thead').cloneNode(true);
    const clonedTbody = document.createElement('tbody');
    clonedTable.appendChild(clonedThead);
    clonedTable.appendChild(clonedTbody);

    // Adicionar apenas as linhas selecionadas
    const originalRows = document.querySelectorAll('tbody tr');
    originalRows.forEach(row => {
      const checkbox = row.querySelector('.row-checkbox');
      // Verifica se é uma linha de dados (tem checkbox) e se está selecionada
      if (checkbox && selectedIds.includes(checkbox.dataset.id)) {
        clonedTbody.appendChild(row.cloneNode(true));
      }
    });

    // Configurações para ocultar colunas
    const hiddenColumns = ["Telefone", "Motorista", "Comentario", "Ações", "Selecionar"];
    const clonedThs = clonedTable.querySelectorAll("thead th");
    const clonedTrs = clonedTable.querySelectorAll("tbody tr");
    const hiddenColumnIndices = [];

    // Identifica colunas para ocultar
    hiddenColumns.push("Status Diário");
    clonedThs.forEach((th, index) => {
      if (hiddenColumns.includes(th.textContent.trim())) {
        hiddenColumnIndices.push(index);
        th.style.display = "none";
      }
    });

    // Oculta células nas linhas
    clonedTrs.forEach((tr) => {
      hiddenColumnIndices.forEach((index) => {
        if (tr.cells[index]) {
          tr.cells[index].style.display = "none";
        }
      });
    });

    // Posiciona o clone fora da tela
    clonedTable.style.position = "absolute";
    clonedTable.style.left = "-9999px";
    document.body.appendChild(clonedTable);

    // Captura a imagem do clone
    const canvas = await html2canvas(clonedTable);
    document.body.removeChild(clonedTable);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    const file = new File([blob], "monitoramento_cargas.png", {
      type: "image/png",
    });

    // Verifica se o navegador suporta o Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: "Monitoramento de Cargas",
          text: "Relatório de Monitoramento de Cargas",
        });
      } catch (error) {
        // Se der erro na API de compartilhamento, usa o fallback do WhatsApp Web
        shareViaWhatsApp(canvas.toDataURL());
      }
    } else {
      // Fallback para WhatsApp Web direto
      shareViaWhatsApp(canvas.toDataURL());
    }

  } catch (error) {
    console.error("Erro ao capturar ou compartilhar:", error);
    alert("Erro ao compartilhar a imagem: " + error.message);
  }
};

window.captureAndShare = async () => {
  try {
    // Cria um clone da tabela original
    const originalTable = document.querySelector("table");
    const clonedTable = originalTable.cloneNode(true);

    // Configurações para ocultar colunas
    const hiddenColumns = ["Telefone", "Motorista", "Comentario", "Ações"];
    const clonedThs = clonedTable.querySelectorAll("thead th");
    const clonedTrs = clonedTable.querySelectorAll("tbody tr");
    const hiddenColumnIndices = [];

    // Identifica colunas para ocultar
    hiddenColumns.push("Status Diário");
    clonedThs.forEach((th, index) => {
      if (hiddenColumns.includes(th.textContent.trim())) {
        hiddenColumnIndices.push(index);
        th.style.display = "none";
      }
    });

    // Oculta células nas linhas
    clonedTrs.forEach((tr) => {
      hiddenColumnIndices.forEach((index) => {
        if (tr.cells[index]) {
          tr.cells[index].style.display = "none";
        }
      });
    });

    // Posiciona o clone fora da tela
    clonedTable.style.position = "absolute";
    clonedTable.style.left = "-9999px";
    document.body.appendChild(clonedTable);

    // Captura a imagem do clone
    const canvas = await html2canvas(clonedTable);
    document.body.removeChild(clonedTable);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    const file = new File([blob], "monitoramento_cargas.png", {
      type: "image/png",
    });

    // Verifica se o navegador suporta o Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: "Monitoramento de Cargas",
          text: "Relatório de Monitoramento de Cargas",
        });
      } catch (error) {
        // Se der erro na API de compartilhamento, usa o fallback do WhatsApp Web
        shareViaWhatsApp(canvas.toDataURL());
      }
    } else {
      // Fallback para WhatsApp Web direto
      shareViaWhatsApp(canvas.toDataURL());
    }

    // Adiciona a funcionalidade de download
    downloadImage(blob, "monitoramento_cargas.png");
  } catch (error) {
    console.error("Erro ao capturar ou compartilhar:", error);
    alert("Erro ao compartilhar ou baixar a imagem");
  }
};

function shareViaWhatsApp(imageData) {
  const imageDataWithoutHeader = imageData.replace(
    "data:image/png;base64,",
    ""
  );
  const text = "Relatório de Monitoramento de Cargas";
  const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(
    text
  )}`;
  window.open(whatsappUrl, "_blank");
}

// Função para baixar a imagem
function downloadImage(blob, fileName) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}
