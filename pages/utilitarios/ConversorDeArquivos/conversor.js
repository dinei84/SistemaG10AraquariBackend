document.addEventListener("DOMContentLoaded", () => {
  const inputType = document.getElementById("inputType");
  const outputType = document.getElementById("outputType");
  const inputData = document.getElementById("inputData");
  const outputData = document.getElementById("outputData");
  const convertBtn = document.getElementById("convertBtn");
  const copyBtn = document.getElementById("copyBtn");
  const clearBtn = document.getElementById("clearBtn");
  const status = document.getElementById("status");

  const uploadBtn = document.getElementById("uploadBtn");
  const fileInput = document.getElementById("fileInput");

  // ... (mesmos event listeners de antes)
  uploadBtn.addEventListener("click", () => fileInput.click()); // Aciona o input escondido
  fileInput.addEventListener("change", handleFileUpload); // Lida com o arquivo selecionado

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.style.color = isError ? "#ff6b6b" : "#66d9ef"; // Cor de erro e sucesso ajustadas
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    const fileName = file.name;
    const fileExtension = fileName.split(".").pop().toLowerCase();

    const validExtensions = {
      json: "json",
      xml: "xml",
      csv: "csv",
      txt: "txt", // Permite txt, mas vamos tratar como um tipo a ser verificado
    };

    if (!validExtensions[fileExtension]) {
      setStatus(`Formato de arquivo .${fileExtension} não suportado.`, true);
      return;
    }

    // Atualiza o seletor 'De:' para o tipo de arquivo, se não for txt
    if (fileExtension !== "txt") {
      inputType.value = fileExtension;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      inputData.value = e.target.result;
      setStatus(`Arquivo ${fileName} carregado com sucesso.`, false);
    };
    reader.onerror = () => {
      setStatus(`Erro ao ler o arquivo ${fileName}.`, true);
    };
    reader.readAsText(file);

    // Limpa o valor do input para permitir carregar o mesmo arquivo novamente
    fileInput.value = "";
  }

  function handleConversion() {
    const from = inputType.value;
    const to = outputType.value;
    const data = inputData.value.trim();

    if (!data) {
      setStatus("O campo de entrada está vazio!", true);
      return;
    }

    if (from === to) {
      setStatus("Os formatos de entrada e saída são iguais.", true);
      outputData.value = data;
      return;
    }

    try {
      let intermediateJson;
      // Passo 1: Converter tudo para um formato intermediário (JSON)
      switch (from) {
        case "json":
          intermediateJson = JSON.parse(data);
          break;
        case "xml":
          intermediateJson = xmlToJson(data);
          break;
        case "csv":
          intermediateJson = csvToJson(data);
          break;
      }

      // Passo 2: Converter do formato intermediário (JSON) para o formato de saída
      let result;
      switch (to) {
        case "json":
          result = JSON.stringify(intermediateJson, null, 2);
          break;
        case "xml":
          result = jsonToXml(intermediateJson);
          break;
        case "csv":
          result = jsonToCsv(intermediateJson);
          break;
      }

      outputData.value = result;
      setStatus("Conversão realizada com sucesso!", false);
    } catch (error) {
      setStatus(`Erro na conversão: ${error.message}`, true);
      outputData.value = "";
    }
  }

  // --- Funções de Conversão ---

  function csvToJson(csv) {
    const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
    if (result.errors.length > 0) {
      throw new Error("CSV inválido: " + result.errors[0].message);
    }
    return result.data;
  }

  function jsonToCsv(json) {
    if (!Array.isArray(json)) {
      throw new Error(
        "Para converter para CSV, o JSON deve ser um array de objetos."
      );
    }
    return Papa.unparse(json);
  }

  function xmlToJson(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "application/xml");

    if (xmlDoc.getElementsByTagName("parsererror").length) {
      throw new Error("XML inválido.");
    }

    function xmlNodeToJson(node) {
      let obj = {};
      if (node.nodeType === 1) {
        // element
        if (node.attributes.length > 0) {
          obj["@attributes"] = {};
          for (let j = 0; j < node.attributes.length; j++) {
            const attribute = node.attributes.item(j);
            obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
          }
        }
      } else if (node.nodeType === 3) {
        // text
        return node.nodeValue.trim();
      }

      if (node.hasChildNodes()) {
        for (let i = 0; i < node.childNodes.length; i++) {
          const item = node.childNodes.item(i);
          const nodeName = item.nodeName;
          if (typeof obj[nodeName] == "undefined") {
            const childJson = xmlNodeToJson(item);
            if (childJson !== "" || item.nodeType === 1) {
              obj[nodeName] = childJson;
            }
          } else {
            if (typeof obj[nodeName].push == "undefined") {
              const old = obj[nodeName];
              obj[nodeName] = [];
              obj[nodeName].push(old);
            }
            const childJson = xmlNodeToJson(item);
            if (childJson !== "" || item.nodeType === 1) {
              obj[nodeName].push(childJson);
            }
          }
        }
      }
      // Remove #text nodes from single-child elements
      if (obj["#text"] && Object.keys(obj).length === 1) {
        return obj["#text"];
      }

      return obj;
    }
    return xmlNodeToJson(xmlDoc.documentElement);
  }

  function jsonToXml(jsonObj, rootName = "root") {
    let xml = "";
    const toXml = (obj, name) => {
      if (Array.isArray(obj)) {
        obj.forEach((v) => toXml(v, name));
        return;
      }
      xml += `<${name}`;
      let attributes = "";
      let children = "";

      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (
          key === "@attributes" &&
          typeof value === "object" &&
          value !== null
        ) {
          Object.keys(value).forEach((attr) => {
            attributes += ` ${attr}="${value[attr]}"`;
          });
        } else if (typeof value === "object" && value !== null) {
          children += toXml(value, key);
        } else {
          children += value;
        }
      });

      xml += attributes + ">";
      xml += children;
      xml += `</${name}>`;
    };

    if (Array.isArray(jsonObj)) {
      toXml(jsonObj, rootName);
    } else {
      const rootKey = Object.keys(jsonObj)[0];
      toXml(jsonObj[rootKey], rootKey);
    }

    return xml;
  }

  // --- Funções dos Botões ---

  function copyToClipboard() {
    if (!outputData.value) {
      setStatus("Nada para copiar!", true);
      return;
    }
    navigator.clipboard.writeText(outputData.value).then(
      () => {
        setStatus("Resultado copiado para a área de transferência!", false);
      },
      () => {
        setStatus("Falha ao copiar o texto.", true);
      }
    );
  }

  function clearAll() {
    inputData.value = "";
    outputData.value = "";
    status.textContent = "";
  }
});
