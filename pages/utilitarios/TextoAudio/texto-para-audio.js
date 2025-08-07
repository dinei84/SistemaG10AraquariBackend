document.addEventListener('DOMContentLoaded', () => {
    const textToSpeak = document.getElementById('text-to-speak');
    const voiceSelect = document.getElementById('voice-select');
    const rate = document.getElementById('rate');
    const rateValue = document.getElementById('rate-value');
    const pitch = document.getElementById('pitch');
    const pitchValue = document.getElementById('pitch-value');
    const playBtn = document.getElementById('play-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const stopBtn = document.getElementById('stop-btn');
    const statusDiv = document.getElementById('status');

    // Verificação de suporte da API
    if (!('speechSynthesis' in window)) {
        statusDiv.textContent = 'Seu navegador não suporta a conversão de texto para áudio.';
        statusDiv.style.color = '#ff6b6b';
        document.querySelectorAll('button, select, input, textarea').forEach(el => el.disabled = true);
        return;
    }

    const synth = window.speechSynthesis;
    let voices = [];

    // --- FUNÇÃO CORRIGIDA PARA POPULAR AS VOZES ---
    function populateVoiceList() {
        voices = synth.getVoices();
        const previouslySelected = voiceSelect.value; // Salva a voz selecionada anteriormente
        voiceSelect.innerHTML = '';

        // Prioriza vozes em português, depois inglês, depois outras
        const ptVoices = voices.filter(voice => voice.lang.startsWith('pt'));
        const enVoices = voices.filter(voice => voice.lang.startsWith('en'));
        const otherVoices = voices.filter(voice => !voice.lang.startsWith('pt') && !voice.lang.startsWith('en'));

        const allVoices = [...ptVoices, ...enVoices, ...otherVoices];

        allVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            option.value = voice.name; // Define um valor para a seleção
            voiceSelect.appendChild(option);
        });

        // Restaura a seleção anterior se ainda existir
        if (previouslySelected) {
            voiceSelect.value = previouslySelected;
        }
    }

    // --- LÓGICA ROBUSTA PARA CARREGAMENTO DAS VOZES ---
    // 1. Tenta carregar imediatamente.
    populateVoiceList();

    // 2. Define o evento 'onvoiceschanged' como o método principal e mais confiável.
    // Este evento é disparado quando a lista de vozes é carregada ou alterada.
    if (synth.onvoiceschanged !== undefined) {
        synth.onvoiceschanged = populateVoiceList;
    }

    // 3. Adiciona um fallback com setInterval para navegadores que podem não disparar o evento de forma consistente.
    // Se as vozes não carregarem em 1 segundo, ele tenta novamente a cada meio segundo.
    if (voices.length === 0) {
        const voiceLoadInterval = setInterval(() => {
            voices = synth.getVoices();
            if (voices.length !== 0) {
                populateVoiceList();
                clearInterval(voiceLoadInterval);
            }
        }, 500);
    }
    // --- FIM DA LÓGICA DE CARREGAMENTO ---


    function updateButtonStates(isSpeaking, isPaused) {
        playBtn.disabled = isSpeaking;
        pauseBtn.disabled = !isSpeaking || isPaused;
        resumeBtn.disabled = !isPaused;
        stopBtn.disabled = !isSpeaking && !isPaused;
    }

    function speak() {
        if (synth.speaking) {
            console.error('Já está falando.');
            return;
        }
        if (textToSpeak.value.trim() !== '') {
            const utterance = new SpeechSynthesisUtterance(textToSpeak.value);
            
            utterance.onstart = () => {
                updateButtonStates(true, false);
            };

            utterance.onend = () => {
                updateButtonStates(false, false);
            };

            utterance.onerror = (event) => {
                console.error('Erro na síntese de fala:', event.error);
                updateButtonStates(false, false);
            };

            const selectedVoiceName = voiceSelect.selectedOptions[0].getAttribute('data-name');
            utterance.voice = voices.find(voice => voice.name === selectedVoiceName);
            utterance.pitch = pitch.value;
            utterance.rate = rate.value;
            
            synth.speak(utterance);
        }
    }

    playBtn.addEventListener('click', () => {
        if (synth.speaking) {
            synth.cancel();
        }
        // Pequeno delay para garantir que o 'cancel' foi processado antes de falar de novo
        setTimeout(speak, 100);
    });

    pauseBtn.addEventListener('click', () => {
        if (synth.speaking) {
            synth.pause();
            updateButtonStates(true, true);
        }
    });

    resumeBtn.addEventListener('click', () => {
        if (synth.paused) {
            synth.resume();
            updateButtonStates(true, false);
        }
    });

    stopBtn.addEventListener('click', () => {
        if (synth.speaking || synth.paused) {
            synth.cancel();
            updateButtonStates(false, false);
        }
    });

    rate.addEventListener('input', () => rateValue.textContent = rate.value);
    pitch.addEventListener('input', () => pitchValue.textContent = pitch.value);
});
