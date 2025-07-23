/**
 * Utilitário para formatação consistente de números no sistema
 * Diferencia entre valores monetários e unidades de medida
 */

// Formatação para valores monetários (2 casas decimais)
export function formatCurrency(number) {
  if (number === null || number === undefined || isNaN(number)) {
    return "0,00";
  }
  return parseFloat(number).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formatação para unidades de medida como peso (3 casas decimais)
export function formatWeight(number) {
  if (number === null || number === undefined || isNaN(number)) {
    return "0,000";
  }
  return parseFloat(number).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
}

// Formatação condicional para peso (mostra decimais apenas se diferentes de zero)
export function formatWeightConditional(number) {
  const num = parseFloat(number);
  if (isNaN(num)) return "0";
  
  // Verifica se a parte decimal é diferente de zero
  const hasDecimals = num % 1 !== 0;
  
  if (hasDecimals) {
    // Se tem decimais, mostra com 3 casas decimais
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  } else {
    // Se não tem decimais, mostra apenas a parte inteira
    return num.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
}

// Função para converter string formatada de volta para número
export function parseFormattedNumber(str) {
  if (!str || str === "") return 0;
  // Remove pontos de milhar e substitui vírgula por ponto
  return parseFloat(str.replace(/\./g, "").replace(",", "."));
}

// Função para arredondar valores (usada em cálculos de ICMS)
export function roundUp(value) {
  return Math.ceil(value * 100) / 100;
}

// Configuração de input para valores monetários
export function setupCurrencyInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener("input", function (e) {
    let value = e.target.value.replace(/[^\d,\.]/g, "");
    
    if (!value) return;
    
    value = value.replace(",", ".");
    
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      e.target.value = "";
      return;
    }
    
    e.target.value = formatCurrency(numValue);
  });

  input.addEventListener("blur", function (e) {
    let value = e.target.value;
    if (value) {
      const parsedValue = parseFormattedNumber(value);
      if (!isNaN(parsedValue)) {
        e.target.value = formatCurrency(parsedValue);
      } else {
        e.target.value = "";
      }
    }
  });
  
  input.addEventListener("focus", function(e) {
    let value = e.target.value;
    if (value) {
      // Remove formatação para edição mais fácil
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue)) {
        e.target.value = numValue.toString().replace(".", ",");
      }
    }
  });

  input.pattern = "[0-9]{1,3}(\\.[0-9]{3})*,[0-9]{2}";
  input.inputMode = "decimal";
}

// Configuração de input para unidades de medida (peso)
export function setupWeightInput(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;

  let lastValue = "";

  input.addEventListener("input", function (e) {
    let value = e.target.value;
    
    value = value.replace(/[^\d,]/g, "");
    
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      value = value.replace(/,/g, (match, index) => {
        return index === value.lastIndexOf(",") ? "," : "";
      });
    }
    
    if (value.includes(",")) {
      const parts = value.split(",");
      if (parts[1] && parts[1].length > 3) {
        parts[1] = parts[1].substring(0, 3);
        value = parts.join(",");
      }
    }
    
    e.target.value = value;
    lastValue = value;
  });

  input.addEventListener("blur", function (e) {
    let value = e.target.value;
    
    if (!value) return;
    
    const numValue = parseFormattedNumber(value);
    if (!isNaN(numValue)) {
      e.target.value = formatWeight(numValue);
    } else {
      e.target.value = "";
    }
  });
  
  input.addEventListener("focus", function(e) {
    let value = e.target.value;
    if (value) {
      const numValue = parseFormattedNumber(value);
      if (!isNaN(numValue)) {
        e.target.value = numValue.toString().replace(".", ",");
      }
    }
  });
}

// Função para formatar data no padrão brasileiro
export function formatDate(date) {
  if (!date) return '';
  
  
  if (date.includes('-')) {
    const [ano, mes, dia] = date.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}