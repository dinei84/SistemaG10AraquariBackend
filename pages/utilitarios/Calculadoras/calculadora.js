document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const buttons = document.querySelector('.buttons');
    const pipButton = document.getElementById('pip-button');
    const pipContainer = document.getElementById('pip-container');
    
    let currentExpression = '0';
    let calculated = false; // Flag para saber se o último ato foi um cálculo

    const calculatorBody = document.getElementById('calculator-body');
    const modeScientificBtn = document.getElementById('mode-scientific');
    const modeFinanceBtn = document.getElementById('mode-finance');
    const financePanel = document.getElementById('finance-panel');
    const scientificButtons = document.getElementById('scientific-buttons');

    // --- Lógica de Alternância de Modo ---
    modeScientificBtn.addEventListener('click', () => {
        calculatorBody.classList.remove('finance-mode');
        modeScientificBtn.classList.add('active');
        modeFinanceBtn.classList.remove('active');
        financePanel.classList.add('hidden');
        scientificButtons.style.display = 'grid';
    });

    modeFinanceBtn.addEventListener('click', () => {
        calculatorBody.classList.add('finance-mode');
        modeFinanceBtn.classList.add('active');
        modeScientificBtn.classList.remove('active');
        financePanel.classList.remove('hidden');
        scientificButtons.style.display = 'none'; // Esconde botões científicos
    });

    // --- Lógica Financeira ---
    const pvInput = document.getElementById('pv');
    const rateInput = document.getElementById('rate');
    const periodsInput = document.getElementById('periods');
    const calcSimpleBtn = document.getElementById('calc-simple-interest');
    const calcCompoundBtn = document.getElementById('calc-compound-interest');
    const financeResult = document.getElementById('finance-result');

    function getFinanceInputs() {
        const pv = parseFloat(pvInput.value);
        const rate = parseFloat(rateInput.value) / 100; // Converte % para decimal
        const periods = parseInt(periodsInput.value);
        if (isNaN(pv) || isNaN(rate) || isNaN(periods)) {
            financeResult.textContent = 'Por favor, preencha todos os campos.';
            return null;
        }
        return { pv, rate, periods };
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    calcSimpleBtn.addEventListener('click', () => {
        const inputs = getFinanceInputs();
        if (!inputs) return;
        const { pv, rate, periods } = inputs;
        const totalInterest = pv * rate * periods;
        const finalAmount = pv + totalInterest;
        financeResult.innerHTML = `Montante: ${formatCurrency(finalAmount)}   
 Juros: ${formatCurrency(totalInterest)}`;
    });

    calcCompoundBtn.addEventListener('click', () => {
        const inputs = getFinanceInputs();
        if (!inputs) return;
        const { pv, rate, periods } = inputs;
        const finalAmount = pv * Math.pow((1 + rate), periods);
        const totalInterest = finalAmount - pv;
        financeResult.innerHTML = `Montante: ${formatCurrency(finalAmount)}   
 Juros: ${formatCurrency(totalInterest)}`;
    });

    // Configurar o parser do math.js para cálculos seguros
    const mathParser = math.parser();

    function updateDisplay() {
        display.textContent = currentExpression;
    }

    // Função central para lidar com todas as entradas (cliques e teclado)
    function handleInput(value, action) {
        if (value) {
            // Se um cálculo acabou de ser feito e o próximo input não é um operador, limpa a expressão
            if (calculated && !isOperator(value)) {
                currentExpression = '';
            }
            calculated = false;

            if (currentExpression === '0' && value !== '.') {
                currentExpression = value;
            } else {
                currentExpression += value;
            }
        }

        if (action) {
            switch (action) {
                case 'clear':
                    currentExpression = '0';
                    calculated = false;
                    break;
                case 'backspace':
                    if (currentExpression.length > 1) {
                        currentExpression = currentExpression.slice(0, -1);
                    } else {
                        currentExpression = '0';
                    }
                    calculated = false;
                    break;
                case 'calculate':
                    // Evita calcular se a expressão estiver vazia ou for apenas "Erro"
                    if (!currentExpression || currentExpression === 'Erro') return;
                    try {
                        // Substitui símbolos visuais por operadores que o math.js entende
                        let expressionToEvaluate = currentExpression
                            .replace(/×/g, '*')
                            .replace(/÷/g, '/')
                            .replace(/%/g, '*0.01');
                        
                        // Adiciona parênteses de fechamento se necessário para evitar erros
                        const openBrackets = (expressionToEvaluate.match(/\(/g) || []).length;
                        const closeBrackets = (expressionToEvaluate.match(/\)/g) || []).length;
                        expressionToEvaluate += ')'.repeat(openBrackets - closeBrackets);

                        const result = mathParser.evaluate(expressionToEvaluate);
                        currentExpression = String(result);
                        calculated = true;
                    } catch (error) {
                        currentExpression = 'Erro';
                        calculated = true;
                    }
                    break;
            }
        }
        updateDisplay();
    }
    
    function isOperator(value) {
        // Verifica se o valor é um dos operadores que não devem limpar a expressão
        const operators = ['+', '-', '×', '÷', '%', '^2'];
        return operators.some(op => value.includes(op));
    }

    // --- Event Listener para os Botões do Mouse ---
    buttons.addEventListener('click', (event) => {
        const target = event.target;
        // Garante que o clique foi em um botão com ação ou valor
        if (!target.matches('.btn') || (!target.dataset.value && !target.dataset.action)) return;
        handleInput(target.dataset.value, target.dataset.action);
    });

    // --- Event Listener para o Teclado ---
    document.addEventListener('keydown', (event) => {
        // Não previne o default para teclas como F5 (refresh) ou F12 (dev tools)
        if (event.key.startsWith('F')) return;
        
        event.preventDefault(); // Previne ações padrão do navegador para as teclas mapeadas
        const key = event.key;
        
        if (key >= '0' && key <= '9' || key === '.') {
            handleInput(key, null);
        } else if (key === '+' || key === '-') {
            handleInput(key, null);
        } else if (key === '*') {
            handleInput('×', null); // Usa o símbolo visual
        } else if (key === '/') {
            handleInput('÷', null); // Usa o símbolo visual
        } else if (key === '%') {
            handleInput('%', null);
        } else if (key === 'Enter' || key === '=') {
            handleInput(null, 'calculate');
        } else if (key === 'Backspace') {
            handleInput(null, 'backspace');
        } else if (key.toLowerCase() === 'c' || key === 'Escape') {
            handleInput(null, 'clear');
        } else if (key === '(' || key === ')') {
            handleInput(key, null);
        }
    });

    // --- Lógica do Picture-in-Picture com Verificação de Compatibilidade ---
    
    // VERIFICAÇÃO: Checa se a API existe no objeto 'document'
    if ('requestPictureInPictureWindow' in document) {
        pipButton.addEventListener('click', async () => {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                try {
                    // Solicita a janela PiP com as dimensões do container da calculadora
                    const pipWindow = await document.requestPictureInPictureWindow({
                        width: pipContainer.clientWidth,
                        height: pipContainer.clientHeight,
                    });

                    // Copia todos os estilos da página principal para a janela PiP
                    const styleSheets = [...document.styleSheets].map(sheet => 
                        sheet.href 
                        ? `<link rel="stylesheet" href="${sheet.href}">` 
                        : `<style>${[...sheet.cssRules].map(rule => rule.cssText).join('')}</style>`
                    ).join('');
                    pipWindow.document.head.innerHTML = styleSheets;
                    
                    // Move o container da calculadora para o corpo da janela PiP
                    pipWindow.document.body.append(pipContainer);
                    pipContainer.id = 'pip-window'; // Renomeia o ID para aplicar estilos específicos se necessário

                    // Adiciona um listener para quando a janela PiP for fechada
                    pipWindow.addEventListener('pagehide', () => {
                        const mainContainer = document.querySelector('.calculator-container');
                        pipContainer.id = 'pip-container'; // Restaura o ID original
                        mainContainer.append(pipContainer); // Move a calculadora de volta para a página principal
                    });
                } catch (error) {
                    console.error("Erro ao tentar abrir a janela Picture-in-Picture:", error);
                    alert("Não foi possível abrir o modo flutuante. Tente novamente.");
                }
            }
        });
    } else {
        // AÇÃO DE FALLBACK: Se a API não for suportada
        pipButton.disabled = true; // Desabilita o botão
        pipButton.title = 'Modo Flutuante não é suportado no seu navegador.'; // Informa o usuário
        pipButton.style.cursor = 'not-allowed';
        pipButton.style.opacity = '0.5';
    }

    // Inicializa o display com o valor padrão
    updateDisplay();
});
