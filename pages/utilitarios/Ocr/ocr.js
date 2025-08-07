// --- Seletores de Elementos ---
const upload = document.getElementById("upload");
const ocrOutput = document.getElementById("ocrOutput");
const translatedOutput = document.getElementById("translatedOutput");
const translationContainer = document.getElementById("translation-container");
const status = document.getElementById("status");
const translateBtn = document.getElementById("translate-btn");
const exportTxtBtn = document.getElementById("export-txt-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const clearBtn = document.getElementById("clear-btn");

// --- Funções de Status ---
function setStatus(message, color = '#66d9ef') {
    status.textContent = message;
    status.style.color = color;
}

// --- Lógica de OCR ---
upload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    clearAll(); // Limpa o estado anterior antes de começar

    const reader = new FileReader();
    reader.onload = async () => {
        try {
            setStatus("🧐 Reconhecendo texto...", '#f9ca24');
            translateBtn.disabled = true;

            const { data: { text } } = await Tesseract.recognize(reader.result, "por", {
                logger: (m) => {
                    const progress = (m.progress * 100).toFixed(0);
                    setStatus(`Progresso: ${m.status} (${progress}%)`, '#f9ca24');
                },
            });

            ocrOutput.value = text;
            setStatus("✅ Texto reconhecido com sucesso!", '#4caf50');
            if (text.trim()) {
                translateBtn.disabled = false; // Habilita o botão de tradução
            }

        } catch (err) {
            console.error("Erro no OCR:", err);
            setStatus("⚠️ Erro no processamento de OCR.", '#ff6b6b');
        }
    };
    reader.readAsDataURL(file);
});

// --- Lógica de Tradução ---
translateBtn.addEventListener('click', async () => {
    const textToTranslate = ocrOutput.value;
    if (!textToTranslate.trim()) {
        alert("Não há texto para traduzir.");
        return;
    }

    setStatus("🔄 Traduzindo...", '#66d9ef');
    translateBtn.disabled = true;

    try {
        const response = await fetch("https://libretranslate.com/translate", {
            method: "POST",
            body: JSON.stringify({
                q: textToTranslate,
                source: "pt",
                target: "en",
                format: "text",
            } ),
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            throw new Error(`Erro na API de tradução: ${response.statusText}`);
        }

        const data = await response.json();
        translatedOutput.value = data.translatedText;
        translationContainer.classList.remove('hidden'); // Mostra o campo de tradução
        setStatus("🎉 Processo concluído!", '#4caf50');

    } catch (err) {
        console.error("Erro na tradução:", err);
        setStatus("⚠️ Erro na tradução.", '#ff6b6b');
        translateBtn.disabled = false; // Reabilita o botão se a tradução falhar
    }
});

// --- Funções de Exportação e Limpeza ---
function exportAsTxt() {
    // Exporta o texto traduzido se existir, senão, o texto original
    const text = translatedOutput.value || ocrOutput.value;
    if (!text) {
        alert("Nenhum texto para exportar!");
        return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "texto_extraido.txt";
    link.click();
    URL.revokeObjectURL(link.href);
}

function exportAsPDF() {
    const text = translatedOutput.value || ocrOutput.value;
    if (!text) {
        alert("Nenhum texto para exportar!");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFont('Helvetica', 'normal');
    const lines = doc.splitTextToSize(text, 180);
    doc.text(lines, 10, 10);
    doc.save("texto_extraido.pdf");
}

function clearAll() {
    ocrOutput.value = "";
    translatedOutput.value = "";
    translationContainer.classList.add('hidden'); // Esconde o campo de tradução
    setStatus("Selecione uma imagem para o reconhecimento de texto.");
    upload.value = "";
    translateBtn.disabled = true;
}

// Adiciona os listeners aos botões
exportTxtBtn.addEventListener('click', exportAsTxt);
exportPdfBtn.addEventListener('click', exportAsPDF);
clearBtn.addEventListener('click', clearAll);
