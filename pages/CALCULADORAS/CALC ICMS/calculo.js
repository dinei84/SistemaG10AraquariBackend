
import { 
  formatCurrency, 
  parseFormattedNumber, 
  roundUp 
} from "../../../js/number-formatter.js";

document.addEventListener("DOMContentLoaded", function () {

  $("#valordoFrete").mask("#.##0,00", { reverse: true });
  $("#valorPrimeiraPerna").mask("#.##0,00", { reverse: true });
  $("#valorSegundaPerna").mask("#.##0,00", { reverse: true });

  const elementos = {
    valordoFrete: document.getElementById("valordoFrete"),
    margem: document.getElementById("margem"),
    estadoSaida: document.getElementById("estadoSaida"),
    estadoDestino: document.getElementById("estadoDestino"),
    trocadenfe: document.getElementById("trocadenfe"),
    porcentagemtroca: document.getElementById("porcentagemtroca"),
    estadoDestinoTroca: document.getElementById("estadoDestinoTroca"),
    valorPrimeiraPerna: document.getElementById("valorPrimeiraPerna"),
    valorSegundaPerna: document.getElementById("valorSegundaPerna"),
    taxaICMSField: document.getElementById("taxaICMSField"),
    freteParaPJ: document.getElementById("freteParaPJ"),
    freteParaPF: document.getElementById("freteParaPF"),
    freteParaPJ2: document.getElementById("freteParaPJ2"),
    freteParaPF2: document.getElementById("freteParaPF2"), // CAMPOS ADICIONADOS
    freteParaPJ1Perna: document.getElementById("freteParaPJ1Perna"),
    freteParaPF1Perna: document.getElementById("freteParaPF1Perna"), // FIM CAMPOS ADICIONADOS
  };

  const icmsTaxas = {
    SC: { MT: 7, MS: 7, PR: 12, SC: 17, BA: 7, TO: 7, MT: 7, PI: 7, GO: 7, MA: 7, MG: 12, RJ: 12, RS: 12, SP: 12, RO: 7, NA: 0, },
    PR: { MT: 7, PR: 0, SC: 12 },
    SP: { SP: 0, PR: 12, SC: 12, PA: 12, BA: 12, PI: 12, GO: 7, MG: 12, RJ: 12, RS: 12, NA: 0 },
    RJ: { RJ: 0, PR: 12, SC: 12, PA: 12, BA: 12, PI: 12, GO: 12, MG: 12, RS: 12, SP: 12, NA: 0 },
    RS: { RS: 0, PR: 12, SC: 12, PA: 12, BA: 12, PI: 12, GO: 12, MG: 12, RJ: 12, SP: 12, NA: 0 },
    BA: { BA: 0, PR: 12, SC: 12, PA: 12, PI: 12, GO: 12, MG: 12, RJ: 12, RS: 12, SP: 12, NA: 0 },
    TO: { TO: 0, PR: 12, SC: 12, PA: 12, PI: 12, GO: 12, MG: 12, RJ: 12, RS: 12, SP: 12, NA: 0 },
    PA: { PA: 0, PR: 12, SC: 12, BA: 12, PI: 12, GO: 12, MG: 12, RJ: 12, RS: 12, SP: 12, NA: 0 },
    PI: { PI: 0, PR: 12, SC: 12, PA: 12, BA: 12, GO: 12, MG: 12, RJ: 12, RS: 12, SP: 12, NA: 0 },
    MG: { MG: 0, PR: 12, SC: 12, PA: 12, BA: 12, PI: 12, GO: 12, RJ: 12, RS: 12, SP: 12, NA: 0 },
    MS: { MS: 0, PR: 12, SC: 12, PA: 12, BA: 12, PI: 12, GO: 12, MG: 12, RJ: 12, RS: 12, SP: 12, NA: 0 },
    MT: { MS: 0, PR: 12, SC: 12, PA: 12, BA: 12, PI: 12, GO: 12, MG: 12, RJ: 12, RS: 12, SP: 12, NA: 0 },
    MS: { MS: 0, MT: 12, PA: 12, RO: 12, PI: 12, GO: 12, MA: 12 },
    GO: { MT: 7, PR: 12, SC: 12, GO: 0, SP: 12 },
    MT: { MT: 0, PR: 12, SC: 12, PA: 12, BA: 12, PI: 12, GO: 12, MG: 12, RJ: 12, RS: 12, SP: 12, NA: 0, },
  };

  elementos.trocadenfe.addEventListener("change", function () {
    document.getElementById("trocaCampos").style.display = this.checked
      ? "block"
      : "none";
    document.getElementById("trocaCampos2").style.display = this.checked
      ? "block"
      : "none";
    document.getElementById("boxFreteParaPJ").style.display = this.checked
      ? "none"
      : "block";
    document.getElementById("boxFreteParaPF").style.display = this.checked
      ? "none"
      : "block"; // CAMPOS ADICIONADOS - MOSTRAR/ESCONDER
    document.getElementById("boxFreteParaPJ1Perna").style.display = this.checked
      ? "block"
      : "none";
    document.getElementById("boxFreteParaPF1Perna").style.display = this.checked
      ? "block"
      : "none"; // FIM CAMPOS ADICIONADOS
  });

  function obterTaxaICMS(origem, destino) {
    return icmsTaxas[origem][destino] || 0;
  }

  function calcularFrete(valorFrete, margem, taxaICMS, adicional = 0) {
    const totalPorcentagem = margem + taxaICMS + adicional;
    return roundUp(valorFrete - (valorFrete * totalPorcentagem) / 100);
  }

  document.getElementById("calcular").addEventListener("click", function () {
    try {
      const valorFreteTotal = parseFormattedNumber(
        elementos.valordoFrete.value
      );
      const margem = parseFloat(elementos.margem.value);
      const estadoOrigem = elementos.estadoSaida.value;
      const estadoDestinoFinal = elementos.estadoDestino.value;
      const trocaNFeAtiva = elementos.trocadenfe.checked;

      if (trocaNFeAtiva) {
        const percentageTroca =
          parseFloat(elementos.porcentagemtroca.value) / 100;
        const estadoTroca = elementos.estadoDestinoTroca.value; // Calcular valores das pernas

        const primeiraPerna = valorFreteTotal * percentageTroca;
        const segundaPerna = valorFreteTotal - primeiraPerna; // Atualizar campos

        elementos.valorPrimeiraPerna.value = formatCurrency(primeiraPerna);
        elementos.valorSegundaPerna.value = formatCurrency(segundaPerna); // Calcular taxas

        const taxaICMSPrimeiraPerna = obterTaxaICMS(estadoOrigem, estadoTroca);
        const taxaICMSSegundaPerna = obterTaxaICMS(
          estadoTroca,
          estadoDestinoFinal
        ); // Calcular fretes

        const fretePJPrimeiraPerna = calcularFrete(
          primeiraPerna,
          margem,
          taxaICMSPrimeiraPerna
        );
        const fretePFPrimeiraPerna = calcularFrete(
          primeiraPerna,
          margem,
          taxaICMSPrimeiraPerna,
          3.25
        );
        const fretePJSegundaPerna = calcularFrete(
          segundaPerna,
          margem,
          taxaICMSSegundaPerna
        );
        const fretePFSegundaPerna = calcularFrete(
          segundaPerna,
          margem,
          taxaICMSSegundaPerna,
          3.25
        ); // Exibir resultados

        elementos.freteParaPJ2.value = formatCurrency(fretePJSegundaPerna);
        elementos.freteParaPF2.value = formatCurrency(fretePFSegundaPerna);
        elementos.taxaICMSField.value = `${taxaICMSPrimeiraPerna}% (1° Perna) / ${taxaICMSSegundaPerna}% (2° Perna)`; // CAMPOS ADICIONADOS - EXIBIR RESULTADOS DA PRIMEIRA PERNA
        elementos.freteParaPJ1Perna.value = formatCurrency(fretePJPrimeiraPerna);
        elementos.freteParaPF1Perna.value = formatCurrency(fretePFPrimeiraPerna); // FIM CAMPOS ADICIONADOS
      } else {
        const taxaICMS = obterTaxaICMS(estadoOrigem, estadoDestinoFinal);
        elementos.taxaICMSField.value = `${taxaICMS}%`;
        elementos.freteParaPJ.value = formatCurrency(
          calcularFrete(valorFreteTotal, margem, taxaICMS)
        );
        elementos.freteParaPF.value = formatCurrency(
          calcularFrete(valorFreteTotal, margem, taxaICMS, 3.25)
        );
      }
    } catch (error) {
      alert("Erro no cálculo! Verifique os valores.");
      console.error(error);
    }
  });

  document.getElementById("limpar").addEventListener("click", function () {
    document.querySelectorAll("input").forEach((input) => (input.value = ""));
    elementos.margem.value = "10";
    elementos.taxaICMSField.value = "";
    document.getElementById("trocaCampos").style.display = "none";
    document.getElementById("trocaCampos2").style.display = "none";
    document.getElementById("boxFreteParaPJ").style.display = "block";
    document.getElementById("boxFreteParaPF").style.display = "block"; // CAMPOS ADICIONADOS - LIMPAR E ESCONDER
    document.getElementById("boxFreteParaPJ1Perna").style.display = "none";
    document.getElementById("boxFreteParaPF1Perna").style.display = "none";
    elementos.freteParaPJ1Perna.value = "";
    elementos.freteParaPF1Perna.value = ""; // FIM CAMPOS ADICIONADOS
  });
});
