document.getElementById("fileInput").addEventListener("change", handleFile, false);

function handleFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet);

    processarDados(json);
  };

  reader.readAsArrayBuffer(file);
}

function processarDados(dados) {
  const resumo = {};
  let totalPeso = 0;
  let totalFaturado = 0;

  dados.forEach(row => {
    const cliente = row["Cliente"];
    const pesoKg = parseFloat(row["Peso (Kg)"]) || 0;
    const vlFrete = parseFloat(row["Vl. Frete"]) || 0;

    if (!cliente) return;

    if (!resumo[cliente]) {
      resumo[cliente] = { pesoTon: 0, faturamento: 0 };
    }

    const pesoTon = pesoKg / 1000;
    resumo[cliente].pesoTon += pesoTon;
    resumo[cliente].faturamento += vlFrete;

    totalPeso += pesoTon;
    totalFaturado += vlFrete;
  });

  const ranking = Object.entries(resumo)
    .map(([cliente, valores]) => ({
      cliente,
      pesoTon: valores.pesoTon,
      faturamento: valores.faturamento
    }))
    .sort((a, b) => b.pesoTon - a.pesoTon);

  atualizarCards(totalPeso, totalFaturado);
  exibirResumo(ranking);
  gerarGraficos(ranking);
}

function atualizarCards(totalPeso, totalFaturado) {
  document.getElementById("cardsContainer").style.display = "flex";
  document.getElementById("totalPeso").innerText = `${totalPeso.toFixed(2)} Ton`;
  document.getElementById("totalFaturado").innerText = totalFaturado.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function exibirResumo(ranking) {
  const top = ranking.slice(0, 10);
  let html = "<h2>🏆 Top 10 Clientes por Peso Transportado</h2>";
  html += "<table><tr><th>Cliente</th><th>Peso (Ton)</th><th>Faturamento (R$)</th></tr>";

  top.forEach(r => {
    html += `<tr>
      <td>${r.cliente}</td>
      <td>${r.pesoTon.toFixed(2)}</td>
      <td>${r.faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
    </tr>`;
  });

  html += "</table>";
  document.getElementById("output").innerHTML = html;
}

function gerarGraficos(ranking) {
  const top = ranking.slice(0, 10);
  const clientes = top.map(r => r.cliente);
  const pesos = top.map(r => r.pesoTon);
  const faturamento = top.map(r => r.faturamento);

  // Gráfico de peso
  new Chart(document.getElementById("graficoPeso"), {
    type: "bar",
    data: {
      labels: clientes,
      datasets: [{
        label: "Toneladas Transportadas",
        data: pesos,
        backgroundColor: "rgba(54, 162, 235, 0.6)"
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });

  // Gráfico de faturamento
  new Chart(document.getElementById("graficoFaturamento"), {
    type: "bar",
    data: {
      labels: clientes,
      datasets: [{
        label: "Faturamento (R$)",
        data: faturamento,
        backgroundColor: "rgba(75, 192, 192, 0.6)"
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}
