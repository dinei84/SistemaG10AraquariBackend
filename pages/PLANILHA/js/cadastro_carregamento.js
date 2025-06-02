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

function formatarData(data) {
  if (!data) return '';
  
  // Verifica se a data está no formato yyyy-mm-dd
  if (data.includes('-')) {
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  const dataObj = new Date(data);
  if (isNaN(dataObj.getTime())) return '';
  
  return dataObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function parseFormattedNumber(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

// Verificar se o cliente é Ourofertil
async function verificarClienteOurofertil() {
  try {
    loadingManager.show();
    const freteDoc = await getDoc(doc(db, "fretes", freteId));
    if (freteDoc.exists()) {
      const freteData = freteDoc.data();
      const arquivoContainer = document.getElementById("arquivoContainer");
      
      if (freteData.cliente && freteData.cliente.toLowerCase().includes("ourofertil")) {
        console.log("Cliente Ourofertil detectado, mostrando campos adicionais");
        arquivoContainer.style.display = "block";
      } else {
        console.log("Cliente não é Ourofertil, ocultando campos adicionais");
        arquivoContainer.style.display = "none";
      }
    }
  } catch (error) {
    console.error("Erro ao verificar cliente:", error);
  } finally {
    loadingManager.hide();
  }
}

// Função para processar documento Word
async function processarDocumentoWord(file) {
  try {
    loadingManager.show();
    
    // Obter os dados do formulário
    const arquivoContainerVisible = document.getElementById('arquivoContainer').style.display !== 'none';
    
    const formData = {
      nome: document.getElementById('motorista').value,
      cpf: document.getElementById('cpf').value || '', // Garante string vazia se não existir
      'tipo-veiculo': document.getElementById('tipo-veiculo').value,
      placa: document.getElementById('placa').value,
      placa2: arquivoContainerVisible ? document.getElementById('placa2').value || '' : '',
      placa3: arquivoContainerVisible ? document.getElementById('placa3').value || '' : '',
      placa4: arquivoContainerVisible ? document.getElementById('placa4').value || '' : '',
      'peso-carregado': document.getElementById('peso-carregado').value,
      dataoc: document.getElementById('dataoc').value || ''
    };

    console.log('Dados sendo enviados para o template:', formData); // Para depuração

    // Ler o arquivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Criar um novo PizZip com o conteúdo do arquivo
    const zip = new window.PizZip(arrayBuffer);
    
    // Criar um novo Docxtemplater
    const doc = new window.docxtemplater();
    doc.loadZip(zip);
    
    // Definir os dados no template
    doc.setData(formData);
    
    // Renderizar o documento
    doc.render();
    
    // Obter o documento renderizado
    const out = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    
    // Configurar botão de download
    const downloadContainer = document.getElementById('downloadContainer');
    const btnDownload = document.getElementById('btnDownload');
    
    btnDownload.onclick = () => {
      const placaFormatada = formData.placa.replace(/-/g, '').toUpperCase();
      const dataAtual = new Date().toISOString().split('T')[0];
      const nomeArquivo = `Carregamento_${placaFormatada}_${dataAtual}.docx`;
      window.saveAs(out, nomeArquivo);
    };
    
    downloadContainer.style.display = 'block';
    
    loadingManager.hide();
    return true;
  } catch (error) {
    console.error('Erro ao processar documento:', error);
    loadingManager.hide();
    alert('Erro ao processar o documento Word: ' + error.message);
    return false;
  }
}

// Event listener para o input de arquivo
document.getElementById('fileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.docx')) {
    alert('Por favor, selecione um arquivo Word (.docx)');
    return;
  }
  
  await processarDocumentoWord(file);
});

// Configurar campo de peso
const pesoInput = document.getElementById("peso-carregado");
if (pesoInput) {
  pesoInput.addEventListener("blur", function (e) {
    let value = e.target.value.replace(/[^\d,]/g, "");
    if (value) {
      const parsedValue = parseFormattedNumber(value);
      if (!isNaN(parsedValue)) {
        e.target.value = formatNumber(parsedValue);
      } else {
        e.target.value = "";
      }
    }
  });
  
  pesoInput.addEventListener("focus", function(e) {
    let value = e.target.value;
    if (value) {
      e.target.value = value.replace(/\./g, "").replace(",", ".");
    }
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
      document.getElementById("tipo-veiculo").value = data["tipo-veiculo"] || "";
      
      const peso = parseFloat(data["peso-carregado"] || 0);
      pesoInput.value = formatNumber(peso);
      
      document.getElementById("fretemotorista").value = data.fretemotorista || "";
      document.getElementById("emissor").value = data.emissor || "";
      document.getElementById("data-manifesto").value = data["data-manifesto"] || "";
      document.getElementById("cte").value = data.cte || "";
      document.getElementById("data-entrega").value = data["data-entrega"] || "";
      document.getElementById("nfe").value = data.nfe || "";
      document.getElementById("observacao").value = data.observacao || "";
      document.getElementById("telefone").value = data.telefone || "";
      
      // Carregar campos específicos do Ourofertil
      document.getElementById("placa2").value = data.placa2 || "";
      document.getElementById("placa3").value = data.placa3 || "";
      document.getElementById("placa4").value = data.placa4 || "";
      document.getElementById("cpf").value = data.cpf || "";
    }
  } catch (error) {
    console.error("Erro ao carregar:", error.message, error.stack);
    alert("Erro ao carregar dados do carregamento");
  } finally {
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
      if (carregamentoAnterior.exists()) {
        saldoDisponivel +=
          parseFloat(carregamentoAnterior.data()["peso-carregado"]) || 0;
      }
    }

    if (peso > saldoDisponivel) {
      alert(`Saldo disponível: ${formatNumber(saldoDisponivel)} Toneladas`);
      pesoInput.value = formatNumber(saldoDisponivel);
    }
  });
}

// Submit do formulário
document
  .getElementById("formCarregamento")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    loadingManager.show();
    
    try {
      const freteRef = doc(db, "fretes", freteId);
      const freteDoc = await getDoc(freteRef);
      
      if (!freteDoc.exists()) {
        alert("Frete não encontrado!");
        return;
      }
      
      const freteData = freteDoc.data();

      const pesoCarregado = parseFormattedNumber(pesoInput.value);
      if (isNaN(pesoCarregado) || pesoCarregado <= 0) {
        alert("Peso carregado inválido!");
        return;
      }

      let saldoDisponivel = parseFloat(freteData.saldo) || 0;
      let pesoOriginal = 0;

      if (isEditMode) {
        const carregamentoAnterior = await getDoc(
          doc(db, "fretes", freteId, "carregamentos", carregamentoId)
        );
        if (carregamentoAnterior.exists()) {
          pesoOriginal = parseFloat(carregamentoAnterior.data()["peso-carregado"] || 0);
          saldoDisponivel += pesoOriginal;
        }
      }

      if (pesoCarregado > saldoDisponivel) {
        alert(
          `Saldo insuficiente! Disponível: ${formatNumber(saldoDisponivel)} Ton`
        );
        return;
      }

      // Atualizar frete
      const novoCarregado =
        (parseFloat(freteData.carregado) || 0) -
        pesoOriginal +
        pesoCarregado;
      const novoSaldo = (parseFloat(freteData.liberado) || 0) - novoCarregado;

      await updateDoc(freteRef, {
        carregado: parseFloat(novoCarregado.toFixed(3)),
        saldo: parseFloat(novoSaldo.toFixed(3)),
      });

      // Obter valores dos campos de manifesto
      const cte = document.getElementById("cte").value;
      const nfe = document.getElementById("nfe").value;
      const dataManifesto = document.getElementById("data-manifesto").value;
      
      // Determinar se está manifestado
      const isManifestado = cte || nfe || dataManifesto;

      // Salvar carregamento
      const carregamentoData = {
        "peso-carregado": Number(pesoCarregado.toFixed(1)),
        placa: document.getElementById("placa").value,
        motorista: document.getElementById("motorista").value,
        "tipo-veiculo": document.getElementById("tipo-veiculo").value,
        fretemotorista: document.getElementById("fretemotorista").value,
        dataoc: formatarData(document.getElementById("dataoc").value),
        emissor: document.getElementById("emissor").value,
        "data-manifesto": dataManifesto,
        cte: cte,
        "data-entrega": document.getElementById("data-entrega").value,
        nfe: nfe,
        observacao: document.getElementById("observacao").value,
        telefone: document.getElementById("telefone").value,
        timestamp: new Date(),
        isManifestado: isManifestado,
        
        // Campos específicos do Ourofertil
        placa2: document.getElementById("placa2").value,
        placa3: document.getElementById("placa3").value,
        placa4: document.getElementById("placa4").value,
        cpf: document.getElementById("cpf").value
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
      console.error("Erro ao salvar:", error.message, error.stack);
      alert(`Erro ao salvar carregamento: ${error.message}`);
    } finally {
      loadingManager.hide();
    }
  });

// Inicialização
if (isEditMode) {
  loadCarregamentoForEdit();
} else {
  if (pesoInput) pesoInput.value = "";
}

// Verificar cliente Ourofertil ao carregar a página
verificarClienteOurofertil();