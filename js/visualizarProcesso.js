import { db, doc, getDoc } from './firebase-config.js';
import { showLoader, showToast } from './feedback.js';

function getIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Função única e corrigida para converter etapa em nó Mermaid
function etapaToNode(etapa) {
  // Garante nome válido e escapa aspas
  const nome = (etapa.nome || 'Sem Nome').replace(/"/g, '\"');
  switch (etapa.tipo) {
    case 'inicio':
    case 'fim':
      return `${etapa.id}(("${nome}"))`; // Círculo
    case 'decisao':
      return `${etapa.id}{"${nome}"}`; // Losango
    case 'processo_predefinido':
      return `${etapa.id}["${nome}"]`; // Retângulo
    case 'operacao_manual':
      return `${etapa.id}["${nome}"]`; // Retângulo simples (paralelogramo não suportado)
    case 'conector':
      return `${etapa.id}(("${nome}"))`; // Círculo duplo
    case 'documento':
      return `${etapa.id}["${nome}"]`;
    case 'informacao':
      return `${etapa.id}["${nome}"]`; // Retângulo (ajuste para evitar erro)
    case 'preparacao':
      return `${etapa.id}["${nome}"]`; // Retângulo (ajuste para evitar erro)
    case 'entrada_manual':
      return `${etapa.id}["${nome}"]`;
    case 'processo':
    default:
      return `${etapa.id}["${nome}"]`;
  }
}

function etapasToMermaid(etapas) {
  // Filtra etapas inválidas
  const etapasValidas = etapas.filter(et => et.id && et.nome && et.tipo);
  let nodes = etapasValidas.map(etapaToNode).join('\n');
  let edges = '';
  etapasValidas.forEach(etapa => {
    if (etapa.next && etapa.next.length) {
      etapa.next.forEach(nextId => {
        edges += `${etapa.id} --> ${nextId}\n`;
      });
    }
  });
  return `flowchart TD\n${nodes}\n${edges}`;
}

async function renderProcesso() {
  showLoader(true);
  const id = getIdFromUrl();
  if (!id) {
    document.getElementById('processoInfo').innerHTML = '<p>ID do processo não informado.</p>';
    showToast('ID do processo não informado.');
    showLoader(false);
    return;
  }
  const docRef = doc(db, 'processos', id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    document.getElementById('processoInfo').innerHTML = '<p>Processo não encontrado.</p>';
    showToast('Processo não encontrado.');
    showLoader(false);
    return;
  }
  const processo = docSnap.data();
  document.getElementById('processoInfo').innerHTML = `
    <h2>${processo.nome}</h2>
    <p><b>Tipo:</b> ${processo.tipo}</p>
    <p><b>Etapas:</b> ${processo.etapas.length}</p>
  `;
  const mermaidCode = etapasToMermaid(processo.etapas);
  console.log("Mermaid code:", mermaidCode); // Log para depuração
  const graphDiv = document.getElementById('mermaidGraph');
  
  try {
    // Renderiza o gráfico usando a API do Mermaid
    mermaid.initialize({ startOnLoad: false });
    const { svg } = await mermaid.render('mermaid-svg', mermaidCode);
    graphDiv.innerHTML = svg;

    // Adiciona links aos nós de subprocesso
    processo.etapas.forEach(etapa => {
      if (etapa.subProcessoId) {
        const node = graphDiv.querySelector(`[id^=mermaid-svg] .node[id*="${etapa.id}"]`);
        if (node) {
          node.style.cursor = 'pointer';
          node.addEventListener('click', () => {
            window.location.href = `visualizarProcesso.html?id=${etapa.subProcessoId}`;
          });
        }
      }
    });

  } catch (e) {
    console.error("Erro ao renderizar o gráfico Mermaid:", e);
    showToast("Erro ao renderizar o diagrama. Verifique o console para detalhes.");
    graphDiv.innerHTML = "Não foi possível renderizar o diagrama.";
  }
  showLoader(false);
}

renderProcesso(); 