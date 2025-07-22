// processos.js
// Lógica para formulário dinâmico de processos

import { showLoader, showToast } from './feedback.js';

document.addEventListener('DOMContentLoaded', function() {
  const btnAdicionarEtapa = document.getElementById('btnAdicionarEtapa');
  const etapasContainer = document.getElementById('etapasContainer');
  let etapas = [];

  function gerarIdEtapa() {
    return 'et' + Date.now() + Math.floor(Math.random() * 1000);
  }

  function getShapeClass(type) {
    return 'shape-' + type;
  }

  function atualizarDropdownsNext() {
    const allIds = etapas.map(et => et.id);
    document.querySelectorAll('.select-next').forEach(select => {
      const currentId = select.dataset.etapaId;
      select.innerHTML = '<option value="">Nenhuma</option>';
      allIds.forEach(id => {
        if (id !== currentId) {
          select.innerHTML += `<option value="${id}">${id}</option>`;
        }
      });
    });
  }

  function adicionarEtapa() {
    const id = gerarIdEtapa();
    etapas.push({ id });
    const etapaDiv = document.createElement('div');
    etapaDiv.className = 'etapa-bloco';
    etapaDiv.dataset.etapaId = id;
    etapaDiv.innerHTML = `
      <div class="shape"></div>
      <h3>Etapa (${id})</h3>
      <label>Nome: <input type="text" class="nome-etapa" required></label>
      <label>Descrição: <input type="text" class="descricao-etapa"></label>
      <label>Responsável: <input type="text" class="responsavel-etapa"></label>
      <label>Email: <input type="email" class="email-etapa"></label>
      <label>Telefone: <input type="text" class="telefone-etapa"></label>
      <label>Localização: <input type="text" class="localizacao-etapa"></label>
      <label>Tipo: 
        <select class="tipo-etapa">
          <option value="processo">Processo</option>
          <option value="inicio">Início</option>
          <option value="fim">Fim</option>
          <option value="decisao">Decisão</option>
          <option value="processo_predefinido">Processo Pré-definido</option>
          <option value="operacao_manual">Operação Manual</option>
          <option value="conector">Conector</option>
          <option value="documento">Documento</option>
          <option value="informacao">Informação</option>
          <option value="preparacao">Preparação</option>
          <option value="entrada_manual">Entrada Manual</option>
        </select>
      </label>
      <label>Próximas etapas (next):
        <select class="select-next" data-etapa-id="${id}" multiple></select>
      </label>
      <button type="button" class="remover-etapa">Remover</button>
      <hr>
    `;
    etapasContainer.appendChild(etapaDiv);
    atualizarDropdownsNext();

    const tipoEtapaSelect = etapaDiv.querySelector('.tipo-etapa');
    const shapeDiv = etapaDiv.querySelector('.shape');

    function updateShape() {
      const selectedType = tipoEtapaSelect.value;
      shapeDiv.className = 'shape ' + getShapeClass(selectedType);
    }

    tipoEtapaSelect.addEventListener('change', updateShape);
    updateShape(); // Set initial shape

    etapaDiv.querySelector('.remover-etapa').onclick = function() {
      etapas = etapas.filter(et => et.id !== id);
      etapaDiv.remove();
      atualizarDropdownsNext();
    };
  }

    btnAdicionarEtapa.addEventListener('click', adicionarEtapa);

  const btnAdicionarProcesso = document.getElementById('btnAdicionarProcesso');
  const modal = document.getElementById('processoModal');
  const span = document.getElementsByClassName('close')[0];
  const processosList = document.getElementById('processosList');

  btnAdicionarProcesso.addEventListener('click', async () => {
    const { db, collection, getDocs } = await import('../js/firebase-config.js');
    const querySnapshot = await getDocs(collection(db, 'processos'));
    processosList.innerHTML = '';
    querySnapshot.forEach((doc) => {
      const processo = doc.data();
      const div = document.createElement('div');
      div.innerHTML = `<a href="#" data-id="${doc.id}" data-nome="${processo.nome}">${processo.nome}</a>`;
      div.onclick = () => {
        adicionarEtapaSubProcesso(doc.id, processo.nome);
        modal.style.display = 'none';
      };
      processosList.appendChild(div);
    });
    modal.style.display = 'block';
  });

  span.onclick = function() {
    modal.style.display = 'none';
  }

  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  }

  function adicionarEtapaSubProcesso(id, nome) {
    const etapaId = gerarIdEtapa();
    etapas.push({ id: etapaId, subProcessoId: id, nome: nome, tipo: 'processo_predefinido' });
    const etapaDiv = document.createElement('div');
    etapaDiv.className = 'etapa-bloco';
    etapaDiv.dataset.etapaId = etapaId;
    etapaDiv.innerHTML = `
      <h3>Etapa: ${nome} (Processo)</h3>
      <input type="hidden" class="subProcessoId" value="${id}">
      <input type="hidden" class="nome-etapa" value="${nome}">
      <input type="hidden" class="tipo-etapa" value="processo_predefinido">
      <label>Próximas etapas (next):
        <select class="select-next" data-etapa-id="${etapaId}" multiple></select>
      </label>
      <button type="button" class="remover-etapa">Remover</button>
      <hr>
    `;
    etapasContainer.appendChild(etapaDiv);
    atualizarDropdownsNext();
    etapaDiv.querySelector('.remover-etapa').onclick = function() {
      etapas = etapas.filter(et => et.id !== etapaId);
      etapaDiv.remove();
      atualizarDropdownsNext();
    };
  }


  // Importação dinâmica do Firebase
  import('../js/firebase-config.js').then(firebase => {
    const { db, collection, addDoc, setDoc, doc, getDoc } = firebase;
    const processoForm = document.getElementById('processoForm');
    const urlParams = new URLSearchParams(window.location.search);
    const processoId = urlParams.get('id');

    // Função para preencher o formulário em modo edição
    async function carregarProcessoParaEdicao(id) {
      const docRef = doc(db, 'processos', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return;
      const processo = docSnap.data();
      document.getElementById('nomeProcesso').value = processo.nome;
      document.getElementById('tipoProcesso').value = processo.tipo;
      // Limpa etapas existentes
      etapas = [];
      etapasContainer.innerHTML = '';
      processo.etapas.forEach(etapa => {
        if (etapa.subProcessoId) {
          adicionarEtapaSubProcesso(etapa.subProcessoId, etapa.nome);
        } else {
          adicionarEtapa();
        }
        const etapaDiv = etapasContainer.querySelector(`[data-etapa-id="${etapa.id}"]`);
        if (etapaDiv) {
          etapaDiv.querySelector('.nome-etapa').value = etapa.nome || '';
          etapaDiv.querySelector('.descricao-etapa').value = etapa.descricao || '';
          etapaDiv.querySelector('.responsavel-etapa').value = etapa.responsavel || '';
          etapaDiv.querySelector('.email-etapa').value = etapa.email || '';
          etapaDiv.querySelector('.telefone-etapa').value = etapa.telefone || '';
          etapaDiv.querySelector('.localizacao-etapa').value = etapa.localizacao || '';
          etapaDiv.querySelector('.tipo-etapa').value = etapa.tipo || '';
        }
      });
      atualizarDropdownsNext();
      // Preencher selects next
      processo.etapas.forEach(etapa => {
        const select = etapasContainer.querySelector(`.select-next[data-etapa-id="${etapa.id}"]`);
        if (select && etapa.next) {
          Array.from(select.options).forEach(opt => {
            if (etapa.next.includes(opt.value)) opt.selected = true;
          });
        }
      });
    }

    if (processoId) {
      carregarProcessoParaEdicao(processoId);
    }

    processoForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      showLoader(true);
      // Coleta dados do processo
      const nome = document.getElementById('nomeProcesso').value.trim();
      const tipo = document.getElementById('tipoProcesso').value;
      // Coleta etapas
      const etapaDivs = document.querySelectorAll('.etapa-bloco');
      const etapasData = Array.from(etapaDivs).map(div => {
        const id = div.dataset.etapaId;
        const subProcessoIdInput = div.querySelector('.subProcessoId');
        const subProcessoId = subProcessoIdInput ? subProcessoIdInput.value : null;
        const nome = div.querySelector('.nome-etapa').value.trim();
        const descricao = div.querySelector('.descricao-etapa')?.value.trim();
        const responsavel = div.querySelector('.responsavel-etapa')?.value.trim();
        const email = div.querySelector('.email-etapa')?.value.trim();
        const telefone = div.querySelector('.telefone-etapa')?.value.trim();
        const localizacao = div.querySelector('.localizacao-etapa')?.value.trim();
        const tipoEtapa = div.querySelector('.tipo-etapa').value.trim();
        const next = Array.from(div.querySelector('.select-next').selectedOptions).map(opt => opt.value).filter(Boolean);
        const etapaData = {
          id,
          nome,
          descricao,
          responsavel,
          email,
          telefone,
          localizacao,
          tipo: tipoEtapa,
          next
        };
        if (subProcessoId) {
          etapaData.subProcessoId = subProcessoId;
        }
        return etapaData;
      });
      const processo = {
        nome,
        tipo,
        atualizadoEm: new Date().toISOString(),
        etapas: etapasData
      };
      if (processoId) {
        // Atualizar
        try {
          await setDoc(doc(db, 'processos', processoId), processo, { merge: true });
          showToast('Processo atualizado com sucesso!');
          setTimeout(() => window.location.href = 'dashboardProcessos.html', 1200);
        } catch (err) {
          showToast('Erro ao atualizar processo: ' + err.message);
        }
      } else {
        // Criar novo
        processo.criadoEm = new Date().toISOString();
        try {
          await addDoc(collection(db, 'processos'), processo);
          showToast('Processo salvo com sucesso!');
          setTimeout(() => window.location.href = 'dashboardProcessos.html', 1200);
        } catch (err) {
          showToast('Erro ao salvar processo: ' + err.message);
        }
      }
      showLoader(false);
    });
  });
}); 