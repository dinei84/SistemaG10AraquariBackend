import { db } from "../../../js/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
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
    carregarCarregamentos();
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
            <td data-id="${carga.id}" onclick="toggleStatus('${carga.id}')" style="background-color: ${
              carga.statusdiario?.trim().toLowerCase() === "check"
                ? "green"
                : "red"
            }; cursor: pointer;">
                ${carga.statusdiario || "Not Check"}
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
    alert("Erro ao carregar cargas: " + error.message);
  } finally {
    loadingManager.hide();
  }
}

window.editarCarga = (id) => {
  if (!id) {
    console.error("ID do carregamento não fornecido!");
    alert("Erro: ID do carregamento não encontrado.");
    return;
  }
  console.log("Editando carga com ID:", id);
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
      alert("Erro ao excluir carga: " + error.message);
    } finally {
      loadingManager.hide();
    }
  }
};

window.toggleStatus = async (id) => {
  try {
    const statusCell = document.querySelector(`td[data-id="${id}"]`);
    const currentStatus = statusCell.textContent.trim().toLowerCase();
    const newStatus = currentStatus === "check" ? "Not Check" : "Check";
    const newColor = newStatus === "Check" ? "green" : "red";

    // Atualizar o Firestore
    const cargaRef = doc(db, "trael", id);
    await updateDoc(cargaRef, {
      statusdiario: newStatus
    });

    // Atualizar a célula na interface
    statusCell.textContent = newStatus;
    statusCell.style.backgroundColor = newColor;
  } catch (error) {
    console.error("Erro ao atualizar status: ", error);
    alert("Erro ao atualizar status: " + error.message);
  }
};

window.toggleSelectAll = () => {
  const selectAllCheckbox = document.getElementById('selectAll');
  const checkboxes = document.querySelectorAll('.row-checkbox');
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
};

window.captureAndShareSelected = async () => {
  try {
    const selectedCheckboxes = document.querySelectorAll('.row-checkbox:checked');
    if (selectedCheckboxes.length === 0) {
      alert('Por favor, selecione pelo menos um motorista para compartilhar.');
      return;
    }

    loadingManager.show();

    // Obter os IDs dos itens selecionados
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

    // Cria um clone da tabela original (apenas estrutura)
    const originalTable = document.querySelector("table");
    const clonedTable = originalTable.cloneNode(false);
    const clonedThead = originalTable.querySelector('thead').cloneNode(true);
    const clonedTbody = document.createElement('tbody');
    clonedTable.appendChild(clonedThead);
    clonedTable.appendChild(clonedTbody);

    // Adicionar apenas as linhas selecionadas, excluindo cabeçalhos de cliente
    const originalRows = document.querySelectorAll('tbody tr');
    originalRows.forEach(row => {
      const checkbox = row.querySelector('.row-checkbox');
      if (checkbox && selectedIds.includes(checkbox.dataset.id) && !row.classList.contains('cliente-header')) {
        clonedTbody.appendChild(row.cloneNode(true));
      }
    });

    // Colunas que devem ser mantidas
    const columnsToKeep = [
      "Emissão da nfe",
      "Placa",
      "Localização",
      "Observação",
      "Mercadoria",
      "N° da nfe",
      "N° Conhecimento",
      "Previsão"
    ];

    // Obter todos os cabeçalhos da tabela clonada
    const clonedThs = clonedTable.querySelectorAll("thead th");
    const columnsToHide = [];

    // Identificar índices das colunas que NÃO estão na lista de colunas para manter
    clonedThs.forEach((th, index) => {
      const columnName = th.textContent.trim();
      console.log(`Verificando coluna: ${columnName}, manter: ${columnsToKeep.includes(columnName)}`);
      if (!columnsToKeep.includes(columnName)) {
        columnsToHide.push(index);
      }
    });

    console.log("Colunas a ocultar:", columnsToHide);

    // Ordenar em ordem decrescente para evitar problemas ao remover
    columnsToHide.sort((a, b) => b - a);

    // Remover cabeçalhos das colunas não desejadas
    columnsToHide.forEach(index => {
      if (clonedThead.rows[0].cells[index]) {
        clonedThead.rows[0].cells[index].remove();
      }
    });

    // Remover células correspondentes nas linhas de dados
    clonedTbody.querySelectorAll('tr').forEach(tr => {
      columnsToHide.forEach(index => {
        if (tr.cells[index]) {
          tr.cells[index].remove();
        }
      });
    });

    // Ajustar nomes dos cabeçalhos
    const finalThs = clonedTable.querySelectorAll("thead th");
    finalThs.forEach(th => {
      const text = th.textContent.trim();
      if (text === "Previsão") {
        th.textContent = "Previsão de entrega";
      }
    });

    // Verificar as colunas finais
    console.log("Colunas finais mantidas:", Array.from(finalThs).map(th => th.textContent.trim()));

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

    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: "Monitoramento de Cargas",
          text: "Relatório de Monitoramento de Cargas",
        });
      } catch (error) {
        console.error("Erro ao compartilhar via Web Share API:", error);
        shareViaWhatsApp(canvas.toDataURL());
      }
    } else {
      shareViaWhatsApp(canvas.toDataURL());
    }
  } catch (error) {
    console.error("Erro ao capturar ou compartilhar:", error);
    alert("Erro ao compartilhar a imagem: " + error.message);
  } finally {
    loadingManager.hide();
  }
};

window.captureAndShare = async () => {
  try {
    loadingManager.show();
    const originalTable = document.querySelector("table");
    const clonedTable = originalTable.cloneNode(false);
    const clonedThead = originalTable.querySelector('thead').cloneNode(true);
    const clonedTbody = document.createElement('tbody');
    clonedTable.appendChild(clonedThead);
    clonedTable.appendChild(clonedTbody);

    // Adicionar apenas linhas de dados, excluindo cabeçalhos de cliente
    const originalRows = document.querySelectorAll('tbody tr');
    originalRows.forEach(row => {
      if (!row.classList.contains('cliente-header')) {
        clonedTbody.appendChild(row.cloneNode(true));
      }
    });

    const columnsToKeep = [
      "Emissão da nfe",
      "Placa",
      "Localização",
      "Observação",
      "Mercadoria",
      "N° da nfe",
      "N° Conhecimento",
      "Previsão"
    ];

    const clonedThs = clonedTable.querySelectorAll("thead th");
    const columnsToHide = [];

    clonedThs.forEach((th, index) => {
      const columnName = th.textContent.trim();
      console.log(`Verificando coluna: ${columnName}, manter: ${columnsToKeep.includes(columnName)}`);
      if (!columnsToKeep.includes(columnName)) {
        columnsToHide.push(index);
      }
    });

    console.log("Colunas a ocultar:", columnsToHide);

    columnsToHide.sort((a, b) => b - a);

    columnsToHide.forEach(index => {
      if (clonedThead.rows[0].cells[index]) {
        clonedThead.rows[0].cells[index].remove();
      }
    });

    clonedTbody.querySelectorAll('tr').forEach(tr => {
      columnsToHide.forEach(index => {
        if (tr.cells[index]) {
          tr.cells[index].remove();
        }
      });
    });

    const finalThs = clonedTable.querySelectorAll("thead th");
    finalThs.forEach(th => {
      const text = th.textContent.trim();
      if (text === "Previsão") {
        th.textContent = "Previsão de entrega";
      }
    });

    console.log("Colunas finais mantidas:", Array.from(finalThs).map(th => th.textContent.trim()));

    clonedTable.style.position = "absolute";
    clonedTable.style.left = "-9999px";
    document.body.appendChild(clonedTable);

    const canvas = await html2canvas(clonedTable);
    document.body.removeChild(clonedTable);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    const file = new File([blob], "monitoramento_cargas.png", {
      type: "image/png",
    });

    if (navigator.share) {
      try {
        await navigator.share({
          files: [file],
          title: "Monitoramento de Cargas",
          text: "Relatório de Monitoramento de Cargas",
        });
      } catch (error) {
        console.error("Erro ao compartilhar via Web Share API:", error);
        shareViaWhatsApp(canvas.toDataURL());
      }
    } else {
      shareViaWhatsApp(canvas.toDataURL());
    }
  } catch (error) {
    console.error("Erro ao capturar ou compartilhar:", error);
    alert("Erro ao compartilhar a imagem: " + error.message);
  } finally {
    loadingManager.hide();
  }
};

function shareViaWhatsApp(imageData) {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = 'monitoramento_cargas.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const text = "Relatório de Monitoramento de Cargas";
  const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(whatsappUrl, "_blank");
}


window.captureAndDownload = async () => {
  try {
    loadingManager.show();
    const originalTable = document.querySelector("table");
    const clonedTable = originalTable.cloneNode(false);
    const clonedThead = originalTable.querySelector('thead').cloneNode(true);
    const clonedTbody = document.createElement('tbody');
    clonedTable.appendChild(clonedThead);
    clonedTable.appendChild(clonedTbody);

    // Adicionar apenas linhas de dados, excluindo cabeçalhos de cliente
    const originalRows = document.querySelectorAll('tbody tr');
    originalRows.forEach(row => {
      if (!row.classList.contains('cliente-header')) {
        clonedTbody.appendChild(row.cloneNode(true));
      }
    });

    const columnsToKeep = [
      "Emissão da nfe",
      "Placa",
      "Localização",
      "Observação",
      "Mercadoria",
      "N° da nfe",
      "N° Conhecimento",
      "Previsão"
    ];

    const clonedThs = clonedTable.querySelectorAll("thead th");
    const columnsToHide = [];

    clonedThs.forEach((th, index) => {
      const columnName = th.textContent.trim();
      console.log(`Verificando coluna: ${columnName}, manter: ${columnsToKeep.includes(columnName)}`);
      if (!columnsToKeep.includes(columnName)) {
        columnsToHide.push(index);
      }
    });

    console.log("Colunas a ocultar:", columnsToHide);

    columnsToHide.sort((a, b) => b - a);

    columnsToHide.forEach(index => {
      if (clonedThead.rows[0].cells[index]) {
        clonedThead.rows[0].cells[index].remove();
      }
    });

    clonedTbody.querySelectorAll('tr').forEach(tr => {
      columnsToHide.forEach(index => {
        if (tr.cells[index]) {
          tr.cells[index].remove();
        }
      });
    });

    const finalThs = clonedTable.querySelectorAll("thead th");
    finalThs.forEach(th => {
      const text = th.textContent.trim();
      if (text === "Previsão") {
        th.textContent = "Previsão de entrega";
      }
    });

    console.log("Colunas finais mantidas:", Array.from(finalThs).map(th => th.textContent.trim()));

    clonedTable.style.position = "absolute";
    clonedTable.style.left = "-9999px";
    document.body.appendChild(clonedTable);

    const canvas = await html2canvas(clonedTable);
    document.body.removeChild(clonedTable);

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'monitoramento_cargas.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    alert("Imagem baixada com sucesso!");
  } catch (error) {
    console.error("Erro ao baixar imagem:", error);
    alert("Erro ao baixar imagem: " + error.message);
  } finally {
    loadingManager.hide();
  }
};

