import { db, collection, getDocs, deleteDoc, doc } from './firebase-config.js';
import { showLoader, showToast } from './feedback.js';

const processosContainer = document.getElementById('processosContainer');

async function carregarProcessos() {
  showLoader(true);
  try {
    processosContainer.innerHTML = '<p>Carregando processos...</p>';
    const querySnapshot = await getDocs(collection(db, 'processos'));
    if (querySnapshot.empty) {
      processosContainer.innerHTML = '<p>Nenhum processo cadastrado.</p>';
      showLoader(false);
      return;
    }
    let html = '<div class="processos-lista">';
    querySnapshot.forEach(docSnap => {
      const processo = docSnap.data();
      html += `
        <div class="processo-card">
          <h2>${processo.nome}</h2>
          <p><b>Tipo:</b> ${processo.tipo}</p>
          <button onclick="window.location.href='visualizarProcesso.html?id=${docSnap.id}'">Visualizar</button>
          <button onclick="window.location.href='processos.html?id=${docSnap.id}'">Editar</button>
          <button class="btn-excluir" data-id="${docSnap.id}">Excluir</button>
        </div>
      `;
    });
    html += '</div>';
    processosContainer.innerHTML = html;
    document.querySelectorAll('.btn-excluir').forEach(btn => {
      btn.onclick = async function() {
        if (confirm('Tem certeza que deseja excluir este processo?')) {
          showLoader(true);
          try {
            await deleteDoc(doc(db, 'processos', btn.dataset.id));
            showToast('Processo excluído com sucesso!');
            carregarProcessos();
          } catch (err) {
            showToast('Erro ao excluir: ' + err.message);
          }
          showLoader(false);
        }
      };
    });
  } catch (err) {
    showToast('Erro ao carregar processos: ' + err.message);
  }
  showLoader(false);
}

carregarProcessos(); 