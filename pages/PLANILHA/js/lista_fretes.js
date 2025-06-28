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
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
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

function verificarFreteAntigo(dataString) {
  if (!dataString || dataString === "N/A") return false;
  
  try {
    const dataFrete = new Date(dataString);
    const dataAtual = new Date();
    const diferencaDias = Math.floor((dataAtual - dataFrete) / (1000 * 60 * 60 * 24));
    
    return diferencaDias > 30;
  } catch (error) {
    console.error("Erro ao verificar idade do frete:", error);
    return false;
  }
}

function getCorFundoCentroCusto(centroCusto) {
    switch(centroCusto?.toLowerCase()) {
        case 'ferro':
            return '#6e6565'; // cinza claro
        case 'imbituba':
            return '#009ee7'; // azul
        case 'paranagua':
            return '#068246'; // verde
        case 'fertilizante':
        default:
            return '#ffffff'; // branco
    }
}

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

        // VERIFICA SE O CLIENTE É OUROFERTIL PARA ADICIONAR O BOTÃO
        let botaoOrdem = '';
        console.log('Nome do cliente:', frete.cliente.toLowerCase());
        if (frete.cliente.toLowerCase().includes('ourofertil nordeste')) {
            botaoOrdem = `<button class="btn-gerar-ordem" onclick="gerarOrdemCarregamento('${doc.id}', event)">Gerar Ordem</button>`;
        }
        
        const isFreteAntigo = verificarFreteAntigo(frete.data);
        const corFundo = getCorFundoCentroCusto(frete.centrodecusto);
        const estiloLinha = isFreteAntigo 
            ? 'style="background-color:rgb(249, 192, 200);"' 
            : `style="background-color:${corFundo};"`;

      const linha = `
        <tr class="linha-clicavel" data-frete-id="${doc.id}" data-centro-custo="${frete.centrodecusto || 'fertilizante'}" ${estiloLinha}>
          <td>${formatarData(frete.data)}</td>
          <td>${frete.cliente}</td>
          <td style="color: #f44336; font-weight: 500;">${frete.destino}</td>
          <td>${frete.pedido}</td>
          <td>${frete.produto}</td>
          <td>${frete.frempresa || 'N/A'}</td>
          <td>${formatNumber(liberado)} Ton</td>
          <td>${formatNumber(carregado)} Ton</td>
          <td>${formatNumber(saldo)} Ton</td>
          <td class="acoes">
            <button class="btn-visualizar" onclick="visualizarFrete('${doc.id}', event)">Visualizar</button>
            <button class="btn-editar" onclick="editarFrete('${doc.id}', event)">Editar</button>
            <button class="btn-excluir" onclick="excluirFrete('${doc.id}', event)">Excluir</button>            
            <button class="btn-carregamento" onclick="listarCarregamentos('${doc.id}', event)">Carregamentos</button>
            ${botaoOrdem}
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
  totalSaldoSpan.textContent = `Saldo Total: ${formatNumber(total)} Ton`;
}

function buscarFretes() {
  const termo = document.getElementById("searchInput").value.toLowerCase();
  const centroCusto = document.getElementById("filtroCentroCusto").value.toLowerCase();
  const linhas = document.querySelectorAll("#tabelaFretes tbody tr");
  let totalSaldo = 0;

  linhas.forEach((linha) => {
    const colunas = linha.querySelectorAll("td");
    const textoLinha = Array.from(colunas)
      .map((td) => td.textContent.toLowerCase())
      .join(" ");
    
    const freteCentroCusto = linha.getAttribute('data-centro-custo')?.toLowerCase() || '';

    const matchTermo = textoLinha.includes(termo);
    const matchCentroCusto = centroCusto === '' || freteCentroCusto === centroCusto;

    if (matchTermo && matchCentroCusto) {
      linha.style.display = "";
      // Extrair o valor numérico do saldo (coluna 7) removendo "Ton" e formatação
      const saldoTexto = colunas[7].textContent.replace(' Ton', '');
      totalSaldo += parseFormattedNumber(saldoTexto);
    } else {
      linha.style.display = "none";
    }
  });

  atualizarTotalSaldo(totalSaldo);
}

// Adicionar evento de mudança para o filtro de centro de custo
document.getElementById("filtroCentroCusto").addEventListener("change", buscarFretes);

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
                <p><strong>Data:</strong> ${frete.data}</p>
                <p><strong>Centro de Custo:</strong> ${frete.centrodecusto}</p>
                <p><strong>Cliente:</strong> ${frete.cliente}</p>
                <p><strong>Representante:</strong> ${frete.representante}</p>
                <p><strong>CNPJ:</strong> ${frete.cnpj}</p>
                <p><strong>IE:</strong> ${frete.ie}</p>
                <p><strong>Telefone:</strong> ${frete.telefone}</p>
                <p><strong>Destinatário:</strong> ${frete.destinatario}</p>
                <p><strong>Destino:</strong> ${frete.destino}</p>
                <p><strong>Estado:</strong> ${frete.estado}</p>
                <P><strong>Troca de NFe: </strong>${frete.destinotroca || "Sem Troca de NFe"}</p>
                <p><strong>Pedido:</strong> ${frete.pedido}</p>                
                <p><strong>Liberado:</strong> ${formatNumber(
                  parseFloat(frete.liberado)
                )} Ton</p>
                <p><strong>Carregado:</strong> ${formatNumber(
                  parseFloat(frete.carregado)
                )} Ton</p>
                <p><strong>Saldo:</strong> ${formatNumber(saldo)} Ton</p>
                <p><strong>Valor do Frete:</strong> ${
                  frete.frempresa || "00,00"
                }</p>
                <p><strong>Localização:</strong> ${
                  frete.localizacao || "Nenhuma"
                }</p>
                <p><strong>Observações:</strong> ${
                  frete.observacao || "Nenhuma"
                }</p>
                <button class="btn-compartilhar" onclick="compartilharFrete('${freteId}')">Compartilhar via WhatsApp</button>
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

window.compartilharFrete = async (freteId) => {
  try {
    loadingManager.show();
    const docRef = doc(db, "fretes", freteId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const frete = docSnap.data();
      const saldo = (parseFloat(frete.liberado) || 0) - (parseFloat(frete.carregado) || 0);

      const mensagem = `*Informações do Frete*\n\n` +
        `📅 Data: ${frete.data}\n` +
        `👤 Cliente: ${frete.cliente}\n` +
        `📍 Destino: ${frete.destino}\n` +
        `📝 Troca de NFe: ${frete.destinotroca || "Sem Troca de NFe"}\n` +
        `🔢 Pedido: ${frete.pedido}\n` +
        `⚖️ Liberado: ${formatNumber(parseFloat(frete.liberado))} Ton\n` +
        `🚛 Carregado: ${formatNumber(parseFloat(frete.carregado))} Ton\n` +
        `📊 Saldo: ${formatNumber(saldo)} Ton\n` +
        `💰 Valor do Frete: ${frete.frempresa || "00,00"}\n` +
        `📍 Localização: ${frete.localizacao || "Nenhuma"}\n` +
        `📌 Observações: ${frete.observacao || "Nenhuma"}`;

      const mensagemCodificada = encodeURIComponent(mensagem);
      window.open(`https://wa.me/?text=${mensagemCodificada}`, '_blank');
    }
  } catch (error) {
    console.error("Erro ao compartilhar frete:", error);
    alert("Erro ao compartilhar informações do frete");
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

window.gerarOrdemCarregamento = async (freteId, event) => {
  event.stopPropagation();
  loadingManager.show();

  try {
      // 1. Obter os dados do frete
      const docRef = doc(db, "fretes", freteId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
          throw new Error("Frete não encontrado!");
      }
      const freteData = docSnap.data();

      console.log('Dados do frete:', freteData);

      // 2. Carregar o template
      const response = await fetch('./downloads/ourofertil.docx');
      if (!response.ok) {
          throw new Error("Template não encontrado. Status: " + response.status);
      }
      const templateContent = await response.arrayBuffer();

      // 3. Preparar o docxtemplater
      const zip = new PizZip(templateContent);
      const docx = new window.docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true,
          nullGetter: function(part) {
              // Mantém o nome da tag se o dado for ausente ou null
              return `{${part.tag}}`;
          }
      });

      // 4. Mapear os dados
      const templateData = {
          dataoc: "{dataoc}",
          nome: freteData.nomeMotorista || "{nome}",
          cpf: freteData.cpf || "{cpf}",
          telefone: freteData.telefone || null,
          tipoVeiculo: freteData.tipoVeiculo || "{tipo-veiculo}",
          placa: freteData.placaCavalo || "{placa}",
          placa2: freteData.placaReboque1 || "{placa2}",
          placa3: freteData.placaReboque2 || "{placa3}",
          placa4: freteData.placaReboque3 || "{placa4}",
          pesoCarregado: freteData.pesoCarregado || "{peso-carregado}",
          produto: freteData.produto || null,
          embalagem: freteData.embalagem || null,
          representante: freteData.representante || "",
          destinatario: freteData.destinatario || "",
          cnpj: freteData.cnpj || "",
          ie: freteData.ie || "",
          destino: freteData.destino || "",
          pedido: freteData.pedido || "",
          localizacao: freteData.localizacao || "",
      };

      console.log('Dados para o template:', templateData);

      try {
          docx.render(templateData);
      } catch (error) {
          console.error('Erro ao renderizar:', error);
          if (error.properties && error.properties.errors) {
              console.error('Erros detalhados:', error.properties.errors);
          }
          throw error;
      }

      // 5. Gerar e baixar o arquivo
      const out = docx.getZip().generate({
          type: "blob",
          mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(out, `Ordem_Carregamento_${freteData.cliente || 'cliente'}_${freteData.pedido || 'pedido'}.docx`);

  } catch (error) {
      console.error("Erro ao gerar ordem:", error);
      alert("Erro: " + error.message);
  } finally {
      loadingManager.hide();
  }
};


carregarFretes();