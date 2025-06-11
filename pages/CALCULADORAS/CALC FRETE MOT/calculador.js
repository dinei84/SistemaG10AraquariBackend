import { 
  formatCurrency, 
  parseFormattedNumber, 
  setupCurrencyInput, 
  setupWeightInput 
} from "../../../js/number-formatter.js";

document.addEventListener("DOMContentLoaded", function () {
  
  // Configurar inputs com formatação automática
  setupCurrencyInput("valordoFrete");
  setupCurrencyInput("pedagio");
  setupWeightInput("peso");

  const valordoFrete = document.getElementById("valordoFrete");
  const pedagio = document.getElementById("pedagio");
  const peso = document.getElementById("peso");
  const botao = document.getElementById("botao");
  const clean = document.getElementById("clean");
  const freteUnitario = document.getElementById("freteUnitario");
  const adiantamento = document.getElementById("adiantamento");
  const valorTotalFrete = document.getElementById("valorTotalFrete");

  const getAdiantamentoPorcentagem = () => {
    const radios = document.getElementsByName("porcentagem_adiantamento");
    let isChecked = false;
    for (const radio of radios) {
      if (radio.checked) {
        isChecked = true;
        return parseFloat(radio.value);
      }
    }
    if (!isChecked) {
      alert("Por favor, selecione uma porcentagem de adiantamento.");
      return;
    }
  };

  const calculodosValores = () => {
    const valorFreteNum = parseFormattedNumber(valordoFrete.value);
    const pedagioNum = parseFormattedNumber(pedagio.value);
    const pesoNum = parseFloat(peso.value.replace(",", "."));

    var pedagioComDesconto = pedagioNum ? pedagioNum / pesoNum : 0;
    var resultadoParcial = valorFreteNum - pedagioComDesconto;
    var valorDoFreteSemDescontoAjusteQuatro = resultadoParcial * pesoNum;

    var porcentagemAdiantamento = getAdiantamentoPorcentagem();
    var adiantamentoAjuste =
      valorDoFreteSemDescontoAjusteQuatro * porcentagemAdiantamento;

    var adiantamentoAjusteComSeguro = adiantamentoAjuste * (1 - 0.018);
    var adiantamentoReal = adiantamentoAjusteComSeguro.toFixed(2);

    return [resultadoParcial, adiantamentoReal, valorDoFreteSemDescontoAjusteQuatro];
  };

  botao.addEventListener("click", function () {
    if (valordoFrete.value === "" || peso.value === "") {
      alert("Por favor, preencha todos os campos corretamente.");
      return;
    }

    const [resultado, adiantamentoValue, valorTotalFreteValue] = calculodosValores();
    freteUnitario.value = formatCurrency(resultado);
    adiantamento.value = formatCurrency(adiantamentoValue);
    valorTotalFrete.value = formatCurrency(valorTotalFreteValue);
  });

  clean.addEventListener("click", function () {
    document.getElementById("valordoFrete").value = "";
    document.getElementById("pedagio").value = "";
    document.getElementById("peso").value = "";
    document.getElementById("freteUnitario").value = "";
    document.getElementById("adiantamento").value = "";
    document.getElementById("valorTotalFrete").value = "";

    const radios = document.getElementsByName("porcentagem_adiantamento");
    for (const radio of radios) {
      radio.checked = false;
    }
  });
});
