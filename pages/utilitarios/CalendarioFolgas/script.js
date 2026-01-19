
import { dataApi } from '../../../js/api.js';
import { auth } from '../../../js/firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Configuração Day.js
dayjs.locale('pt-br');

// Variáveis Globais
let calendar = null;
let colaboradores = [];
let folgas = [];
let isInitialized = false;

// Elementos do DOM
const modalFolga = document.getElementById('modalFolga');
const modalColaborador = document.getElementById('modalColaborador');
const modalFolgaLote = document.getElementById('modalFolgaLote');
const modalPlantaoLote = document.getElementById('modalPlantaoLote');
const formFolga = document.getElementById('formFolga');
const formColaborador = document.getElementById('formColaborador');
const formFolgaLote = document.getElementById('formFolgaLote');
const formPlantaoLote = document.getElementById('formPlantaoLote');
const selectColaborador = document.getElementById('colaborador');
const selectColaboradorLote = document.getElementById('colaboradorLote');
const selectColaboradorPlantaoLote = document.getElementById('colaboradorPlantaoLote');
const btnAddFolga = document.getElementById('btnAddFolga');
const btnAddPlantao = document.getElementById('btnAddPlantao');
const btnAddFolgaLote = document.getElementById('btnAddFolgaLote');
const btnAddPlantaoLote = document.getElementById('btnAddPlantaoLote');
const btnNovoColaborador = document.getElementById('btnNovoColaborador');
const btnDeleteFolga = document.getElementById('btnDeleteFolga');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorMessage = document.getElementById('errorMessage');
const tipoRecorrencia = document.getElementById('tipoRecorrencia');
const tipoRecorrenciaPlantao = document.getElementById('tipoRecorrenciaPlantao');

// Função para mostrar loading
function showLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
}

function hideLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// Função para mostrar erro
function showError(message) {
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
    console.error(message);
}

// Função para mostrar sucesso
function showSuccess(message) {
    // Criar notificação de sucesso
    const notification = document.createElement('div');
    notification.className = 'success-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Verificar se FullCalendar está disponível
function waitForFullCalendar() {
    return new Promise((resolve, reject) => {
        if (typeof FullCalendar !== 'undefined') {
            resolve();
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50;
        const interval = setInterval(() => {
            attempts++;
            if (typeof FullCalendar !== 'undefined') {
                clearInterval(interval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                reject(new Error('FullCalendar não carregou após 5 segundos'));
            }
        }, 100);
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    showLoading();
    
    try {
        // Aguardar FullCalendar carregar
        await waitForFullCalendar();
    
    // Aguardar autenticação antes de carregar dados
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log('Usuário autenticado, carregando dados...');
                try {
            await loadColaboradores();
            await loadFolgas();
                    initCalendar();
                    setupEventListeners();
                    isInitialized = true;
                    hideLoading();
                } catch (error) {
                    hideLoading();
                    showError('Erro ao inicializar o sistema. Recarregue a página.');
                    console.error('Erro na inicialização:', error);
                }
        } else {
                hideLoading();
            console.error('Usuário não autenticado. Redirecionando para login...');
            alert('Você precisa estar logado para acessar esta página.');
            window.location.href = '../../../index.html';
        }
    });
    } catch (error) {
        hideLoading();
        showError('Erro ao carregar bibliotecas. Verifique sua conexão.');
        console.error('Erro ao carregar FullCalendar:', error);
    }
});

// Configuração do FullCalendar
function initCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        console.error('Elemento do calendário não encontrado');
        return;
    }
    
    try {
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'pt-br',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,listMonth'
        },
        buttonText: {
            today: 'Hoje',
            month: 'Mês',
            list: 'Lista'
        },
        height: '100%',
            contentHeight: 'auto',
        events: [],
        dateClick: function(info) {
            openModalFolga(null, info.dateStr, 'folga');
        },
        eventClick: function(info) {
            openModalFolga(info.event);
        },
        eventContent: function(arg) {
            return {
                html: `<div class="fc-content">
                        <span class="fc-title">🌴 ${arg.event.title}</span>
                      </div>`
            };
        }
    });
    
    calendar.render();
        updateCalendarEvents();
    } catch (error) {
        console.error('Erro ao inicializar calendário:', error);
        showError('Erro ao inicializar o calendário.');
    }
}

// Carregar Colaboradores
async function loadColaboradores() {
    try {
        console.log('Carregando colaboradores...');
        const response = await dataApi.getAll('colaboradores');
        colaboradores = Array.isArray(response) ? response : [];
        console.log(`${colaboradores.length} colaborador(es) carregado(s)`);
        updateSelectColaboradores();
    } catch (error) {
        console.error('Erro ao carregar colaboradores:', error);
        
        // Mensagem mais específica baseada no erro
        let mensagem = 'Erro ao carregar colaboradores.';
        if (error.message.includes('tempo limite')) {
            mensagem = 'O servidor está demorando para responder. Tente novamente em alguns instantes.';
        } else if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
            mensagem = 'Sua sessão expirou. Faça login novamente.';
            setTimeout(() => {
                window.location.href = '../../../index.html';
            }, 2000);
        } else if (error.message.includes('conexão')) {
            mensagem = 'Erro de conexão. Verifique sua internet.';
        }
        
        showError(mensagem);
        colaboradores = [];
        updateSelectColaboradores();
    }
}

function updateSelectColaboradores() {
    if (!selectColaborador || !selectColaboradorLote) return;
    
    // Atualizar select do modal de folga/plantão
    selectColaborador.innerHTML = '<option value="">Selecione...</option>';
    
    // Atualizar select do modal de lote
    selectColaboradorLote.innerHTML = '<option value="">Selecione...</option>';
    
    // Atualizar select do modal de plantão em lote
    if (selectColaboradorPlantaoLote) {
        selectColaboradorPlantaoLote.innerHTML = '<option value="">Selecione...</option>';
    }
    
    // Ordenar por nome
    colaboradores.sort((a, b) => a.nome.localeCompare(b.nome));
    
    colaboradores.forEach(colab => {
        if (colab.ativo !== false) {
            // Select modal folga/plantão
            const option = document.createElement('option');
            option.value = colab.id;
            option.textContent = colab.nome;
            selectColaborador.appendChild(option);
            
            // Select modal lote
            const optionLote = document.createElement('option');
            optionLote.value = colab.id;
            optionLote.textContent = colab.nome;
            selectColaboradorLote.appendChild(optionLote);
            
            // Select modal plantão em lote
            if (selectColaboradorPlantaoLote) {
                const optionPlantaoLote = document.createElement('option');
                optionPlantaoLote.value = colab.id;
                optionPlantaoLote.textContent = colab.nome;
                selectColaboradorPlantaoLote.appendChild(optionPlantaoLote);
            }
        }
    });

    renderColaboradoresList();
}

function renderColaboradoresList() {
    const listaColaboradores = document.getElementById('listaColaboradores');
    if (!listaColaboradores) return;

    listaColaboradores.innerHTML = '';

    if (colaboradores.length === 0) {
        listaColaboradores.innerHTML = '<li class="colaborador-item" style="justify-content: center; color: #888;">Nenhum colaborador cadastrado.</li>';
        return;
    }

    colaboradores.forEach(colab => {
        if (colab.ativo !== false) {
            const li = document.createElement('li');
            li.className = 'colaborador-item';
            
            li.innerHTML = `
                <span class="colaborador-info">${colab.nome}</span>
                <button type="button" class="btn-delete-colab" title="Excluir Colaborador" data-id="${colab.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            const btnDelete = li.querySelector('.btn-delete-colab');
            btnDelete.addEventListener('click', () => deleteColaborador(colab.id, colab.nome));
            
            listaColaboradores.appendChild(li);
        }
    });
}

async function deleteColaborador(id, nome) {
    if (confirm(`Tem certeza que deseja excluir o colaborador "${nome}"? Isso também pode afetar as folgas associadas.`)) {
        try {
            await dataApi.delete('colaboradores', id);
            colaboradores = colaboradores.filter(c => c.id !== id);
            updateSelectColaboradores();
            showSuccess('Colaborador excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir colaborador:', error);
            showError('Erro ao excluir colaborador. Tente novamente.');
        }
    }
}

// Carregar Folgas
async function loadFolgas() {
    try {
        console.log('Carregando folgas...');
        const response = await dataApi.getAll('folgas');
        folgas = Array.isArray(response) ? response : [];
        console.log(`${folgas.length} folga(s) carregada(s)`);
        if (calendar) {
        updateCalendarEvents();
        }
    } catch (error) {
        console.error('Erro ao carregar folgas:', error);
        
        // Mensagem mais específica baseada no erro
        let mensagem = 'Erro ao carregar folgas.';
        if (error.message.includes('tempo limite')) {
            mensagem = 'O servidor está demorando para responder. As folgas podem não aparecer.';
        } else if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
            mensagem = 'Sua sessão expirou. Faça login novamente.';
            setTimeout(() => {
                window.location.href = '../../../index.html';
            }, 2000);
        } else if (error.message.includes('conexão')) {
            mensagem = 'Erro de conexão. Verifique sua internet.';
        }
        
        showError(mensagem);
        folgas = [];
    }
}

function updateCalendarEvents() {
    if (!calendar) return;
    
    try {
    const events = folgas.map(folga => {
        const colab = colaboradores.find(c => c.id === folga.colaboradorId);
            const tipo = folga.tipo || 'folga'; // Default para folga se não especificado
            const isFolga = tipo === 'folga';
            
        return {
            id: folga.id,
                title: `${isFolga ? '🌴' : '💼'} ${colab ? colab.nome : 'Desconhecido'}`,
            start: folga.data,
            allDay: true,
                backgroundColor: isFolga ? '#28a745' : '#dc3545',
                borderColor: isFolga ? '#218838' : '#c82333',
                classNames: [tipo],
            extendedProps: {
                    colaboradorId: folga.colaboradorId,
                    tipo: tipo
            }
        };
    });
    
        // Remover todos os eventos
    calendar.removeAllEvents();
        
        // Adicionar eventos um por um (método correto do FullCalendar 6.x)
        if (events.length > 0) {
            events.forEach(event => {
                try {
                    calendar.addEvent(event);
                } catch (err) {
                    console.warn('Erro ao adicionar evento individual:', event, err);
                }
            });
        }
    } catch (error) {
        console.error('Erro ao atualizar eventos do calendário:', error);
        showError('Erro ao atualizar eventos do calendário.');
    }
}

// Event Listeners
function setupEventListeners() {
    // Abrir Modal de Folga (Botão Principal)
    if (btnAddFolga) {
    btnAddFolga.addEventListener('click', () => {
            openModalFolga(null, null, 'folga');
        });
    }
    
    // Abrir Modal de Plantão (Botão Principal)
    if (btnAddPlantao) {
        btnAddPlantao.addEventListener('click', () => {
            openModalFolga(null, null, 'plantao');
        });
    }
    
    // Abrir Modal de Folga em Lote
    if (btnAddFolgaLote) {
        btnAddFolgaLote.addEventListener('click', () => {
            openModalFolgaLote('folga');
        });
    }
    
    // Abrir Modal de Plantão em Lote
    if (btnAddPlantaoLote) {
        btnAddPlantaoLote.addEventListener('click', () => {
            openModalPlantaoLote();
        });
    }
    
    // Seletores de tipo (folga/plantão)
    document.querySelectorAll('.tipo-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tipo = this.dataset.tipo;
            const isLote = this.dataset.lote === 'true';
            const container = isLote ? 
                (this.closest('#formFolgaLote') ? 'lote' : 'plantaoLote') : 
                'individual';
            
            // Remover active de todos
            const selector = isLote ? 
                (container === 'lote' ? 
                    document.querySelectorAll('#formFolgaLote .tipo-btn') :
                    document.querySelectorAll('#formPlantaoLote .tipo-btn')) :
                document.querySelectorAll('#formFolga .tipo-btn');
            
            selector.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Atualizar campo hidden
            if (isLote) {
                if (container === 'lote') {
                    document.getElementById('tipoEventoLote').value = tipo;
                    document.getElementById('modalLoteTitle').textContent = 
                        tipo === 'folga' ? 'Folgas em Lote (Recorrentes)' : 'Plantões em Lote (Recorrentes)';
                } else {
                    document.getElementById('tipoEventoPlantaoLote').value = tipo;
                }
            } else {
                document.getElementById('tipoEvento').value = tipo;
                const titleEl = document.getElementById('modalTitle');
                if (titleEl) {
                    titleEl.textContent = tipo === 'folga' ? 'Registrar Folga' : 'Registrar Plantão';
                }
            }
        });
    });
    
    // Abrir Modal de Colaborador
    if (btnNovoColaborador) {
    btnNovoColaborador.addEventListener('click', () => {
        modalColaborador.classList.add('active');
    });
    }
    
    // Fechar Modais
    const closeModalBtns = document.querySelectorAll('.close-modal, .close-modal-colab, .close-modal-lote, .close-modal-plantao-lote');
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) modal.classList.remove('active');
        });
    });
    
    // Fechar ao clicar fora
    window.addEventListener('click', (e) => {
        if (e.target === modalFolga) modalFolga.classList.remove('active');
        if (e.target === modalColaborador) modalColaborador.classList.remove('active');
        if (e.target === modalFolgaLote) modalFolgaLote.classList.remove('active');
        if (e.target === modalPlantaoLote) modalPlantaoLote.classList.remove('active');
    });
    
    // Mudança no tipo de recorrência
    if (tipoRecorrencia) {
        tipoRecorrencia.addEventListener('change', (e) => {
            const tipo = e.target.value;
            // Esconder todas as opções
            document.querySelectorAll('.opcao-recorrencia').forEach(op => {
                op.style.display = 'none';
            });
            // Mostrar opção selecionada
            if (tipo === 'semanal') {
                document.getElementById('opcaoSemanal').style.display = 'block';
            } else if (tipo === 'intervalo') {
                document.getElementById('opcaoIntervalo').style.display = 'block';
            } else if (tipo === 'dias-semana') {
                document.getElementById('opcaoDiasSemana').style.display = 'block';
            }
        });
    }
    
    // Salvar Colaborador
    if (formColaborador) {
    formColaborador.addEventListener('submit', async (e) => {
        e.preventDefault();
            const nome = document.getElementById('nomeColaborador').value.trim();
            
            if (!nome) {
                showError('Por favor, informe o nome do colaborador.');
                return;
            }
        
        try {
            const novoColab = {
                nome: nome,
                ativo: true,
                createdAt: new Date().toISOString()
            };
            
            const result = await dataApi.create('colaboradores', novoColab);
                colaboradores.push(result);
            updateSelectColaboradores();
            selectColaborador.value = result.id;
            modalColaborador.classList.remove('active');
            formColaborador.reset();
                showSuccess('Colaborador cadastrado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar colaborador:', error);
                showError('Erro ao salvar colaborador. Tente novamente.');
        }
    });
    }
    
    // Salvar Folga
    if (formFolga) {
    formFolga.addEventListener('submit', async (e) => {
        e.preventDefault();
            
            // Validação: Verificar se há colaboradores
            if (colaboradores.length === 0) {
                showError('Cadastre pelo menos um colaborador antes de criar folgas.');
                return;
            }
        
        const colaboradorId = selectColaborador.value;
        const data = document.getElementById('dataFolga').value;
        const folgaId = document.getElementById('folgaId').value;
            const tipo = document.getElementById('tipoEvento').value || 'folga';
        
            if (!colaboradorId || !data) {
                showError('Preencha todos os campos obrigatórios.');
                return;
            }
        
        // Validação: Mês passado
        const dataFolga = dayjs(data);
        const inicioMesAtual = dayjs().startOf('month');
        
        if (dataFolga.isBefore(inicioMesAtual)) {
                showError('Não é permitido lançar eventos em meses passados.');
            return;
        }
        
            // Validação: Duplicidade (verificar também no formato correto da data)
            const dataFormatada = dayjs(data).format('YYYY-MM-DD');
            const duplicada = folgas.find(f => {
                const fData = dayjs(f.data).format('YYYY-MM-DD');
                return f.colaboradorId === colaboradorId && 
                       fData === dataFormatada && 
                       f.id !== folgaId;
            });
        
        if (duplicada) {
                showError(`Este colaborador já possui ${duplicada.tipo === 'plantao' ? 'plantão' : 'folga'} nesta data.`);
            return;
        }
        
        try {
            const folgaDados = {
                colaboradorId,
                data,
                    tipo: tipo,
                    periodoId: dataFolga.format('MM-YYYY'),
                updatedAt: new Date().toISOString()
            };
            
            if (folgaId) {
                // Atualizar
                await dataApi.update('folgas', folgaId, folgaDados);
                const index = folgas.findIndex(f => f.id === folgaId);
                if (index !== -1) {
                    folgas[index] = { ...folgas[index], ...folgaDados };
                }
                    showSuccess(`${tipo === 'plantao' ? 'Plantão' : 'Folga'} atualizada com sucesso!`);
            } else {
                // Criar
                folgaDados.createdAt = new Date().toISOString();
                const result = await dataApi.create('folgas', folgaDados);
                folgas.push(result);
                    showSuccess(`${tipo === 'plantao' ? 'Plantão' : 'Folga'} cadastrada com sucesso!`);
            }
            
            updateCalendarEvents();
            modalFolga.classList.remove('active');
                formFolga.reset();
                // Resetar tipo para folga
                document.getElementById('tipoEvento').value = 'folga';
                document.querySelectorAll('#formFolga .tipo-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.tipo === 'folga') btn.classList.add('active');
                });
            } catch (error) {
                console.error('Erro ao salvar evento:', error);
                
                let mensagem = 'Erro ao salvar evento.';
                if (error.message.includes('tempo limite')) {
                    mensagem = 'O servidor está demorando para responder. Tente novamente.';
                } else if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
                    mensagem = 'Sua sessão expirou. Faça login novamente.';
                    setTimeout(() => {
                        window.location.href = '../../../index.html';
                    }, 2000);
                } else if (error.message.includes('conexão')) {
                    mensagem = 'Erro de conexão. Verifique sua internet.';
                } else if (error.message) {
                    mensagem = error.message;
                }
                
                showError(mensagem);
            }
        });
    }

    // Salvar Folgas em Lote
    if (formFolgaLote) {
        formFolgaLote.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validação: Verificar se há colaboradores
            if (colaboradores.length === 0) {
                showError('Cadastre pelo menos um colaborador antes de criar folgas.');
                return;
            }
            
            const colaboradorId = selectColaboradorLote.value;
            const tipoRecorrenciaValue = tipoRecorrencia.value;
            const tipoEvento = document.getElementById('tipoEventoLote').value || 'folga';
            const dataInicio = document.getElementById('dataInicioLote').value;
            const dataFim = document.getElementById('dataFimLote').value;
            const sobrescrever = document.getElementById('sobrescreverFolgas').checked;
            
            if (!colaboradorId || !tipoRecorrenciaValue || !dataInicio) {
                showError('Preencha todos os campos obrigatórios.');
                return;
            }
            
            try {
                showLoading();
                const folgasGeradas = await gerarFolgasEmLote(
                    colaboradorId,
                    tipoRecorrenciaValue,
                    dataInicio,
                    dataFim,
                    sobrescrever,
                    tipoEvento
                );
                
                if (folgasGeradas.length === 0) {
                    showError('Nenhuma folga foi gerada. Verifique os parâmetros.');
                    hideLoading();
                    return;
                }
                
                // Primeiro, deletar folgas existentes se sobrescrever
                const folgasParaDeletar = folgasGeradas
                    .filter(f => f._existeId)
                    .map(f => f._existeId);
                
                let deletadas = 0;
                for (const id of folgasParaDeletar) {
                    try {
                        await dataApi.delete('folgas', id);
                        folgas = folgas.filter(f => f.id !== id);
                        deletadas++;
                    } catch (error) {
                        console.error('Erro ao excluir folga existente:', error);
                    }
                }
                
                // Remover propriedade temporária antes de salvar
                const folgasParaSalvar = folgasGeradas.map(({ _existeId, ...rest }) => rest);
                
                // Salvar todas as folgas
                let sucessos = 0;
                let erros = 0;
                
                for (const folga of folgasParaSalvar) {
                    try {
                        const result = await dataApi.create('folgas', folga);
                        folgas.push(result);
                        sucessos++;
        } catch (error) {
            console.error('Erro ao salvar folga:', error);
                        erros++;
                    }
                }
                
                updateCalendarEvents();
                modalFolgaLote.classList.remove('active');
                formFolgaLote.reset();
                document.querySelectorAll('.opcao-recorrencia').forEach(op => {
                    op.style.display = 'none';
                });
                
                hideLoading();
                const tipoTexto = tipoEvento === 'plantao' ? 'plantão(ões)' : 'folga(s)';
                let mensagem = `${sucessos} ${tipoTexto} gerado(s) com sucesso!`;
                if (deletadas > 0) {
                    mensagem += ` ${deletadas} ${tipoTexto} existente(s) substituído(s).`;
                }
                if (erros > 0) {
                    mensagem += ` ${erros} erro(s).`;
                }
                showSuccess(mensagem);
            } catch (error) {
                hideLoading();
                console.error('Erro ao gerar folgas em lote:', error);
                
                let mensagem = 'Erro ao gerar folgas em lote.';
                if (error.message.includes('tempo limite')) {
                    mensagem = 'O servidor está demorando para responder. Tente novamente em alguns instantes.';
                } else if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
                    mensagem = 'Sua sessão expirou. Faça login novamente.';
                    setTimeout(() => {
                        window.location.href = '../../../index.html';
                    }, 2000);
                } else if (error.message.includes('conexão')) {
                    mensagem = 'Erro de conexão. Verifique sua internet.';
                } else if (error.message) {
                    mensagem = error.message;
                }
                
                showError(mensagem);
            }
        });
    }

    // Excluir Folga
    if (btnDeleteFolga) {
    btnDeleteFolga.addEventListener('click', async () => {
        const folgaId = document.getElementById('folgaId').value;
        if (!folgaId) return;
        
        if (confirm('Tem certeza que deseja excluir esta folga?')) {
            try {
                await dataApi.delete('folgas', folgaId);
                folgas = folgas.filter(f => f.id !== folgaId);
                updateCalendarEvents();
                modalFolga.classList.remove('active');
                    showSuccess('Folga excluída com sucesso!');
            } catch (error) {
                console.error('Erro ao excluir folga:', error);
                    
                    let mensagem = 'Erro ao excluir folga.';
                    if (error.message.includes('tempo limite')) {
                        mensagem = 'O servidor está demorando para responder. Tente novamente.';
                    } else if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
                        mensagem = 'Sua sessão expirou. Faça login novamente.';
                        setTimeout(() => {
                            window.location.href = '../../../index.html';
                        }, 2000);
                    } else if (error.message.includes('conexão')) {
                        mensagem = 'Erro de conexão. Verifique sua internet.';
                    }
                    
                    showError(mensagem);
                }
            }
        });
    }

    // Salvar Plantões em Lote
    if (formPlantaoLote) {
        formPlantaoLote.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (colaboradores.length === 0) {
                showError('Cadastre pelo menos um colaborador antes de criar plantões.');
                return;
            }
            
            const colaboradorId = selectColaboradorPlantaoLote.value;
            const tipoRecorrenciaValue = tipoRecorrenciaPlantao.value;
            const dataInicio = document.getElementById('dataInicioPlantaoLote').value;
            const dataFim = document.getElementById('dataFimPlantaoLote').value;
            const sobrescrever = document.getElementById('sobrescreverPlantoes').checked;
            
            if (!colaboradorId || !tipoRecorrenciaValue || !dataInicio) {
                showError('Preencha todos os campos obrigatórios.');
                return;
            }
            
            try {
                showLoading();
                const folgasGeradas = await gerarFolgasEmLote(
                    colaboradorId,
                    tipoRecorrenciaValue,
                    dataInicio,
                    dataFim,
                    sobrescrever,
                    'plantao',
                    true // isPlantaoLote
                );
                
                if (folgasGeradas.length === 0) {
                    showError('Nenhum plantão foi gerado. Verifique os parâmetros.');
                    hideLoading();
                    return;
                }
                
                const folgasParaDeletar = folgasGeradas
                    .filter(f => f._existeId)
                    .map(f => f._existeId);
                
                let deletadas = 0;
                for (const id of folgasParaDeletar) {
                    try {
                        await dataApi.delete('folgas', id);
                        folgas = folgas.filter(f => f.id !== id);
                        deletadas++;
                    } catch (error) {
                        console.error('Erro ao excluir plantão existente:', error);
                    }
                }
                
                const folgasParaSalvar = folgasGeradas.map(({ _existeId, ...rest }) => rest);
                
                let sucessos = 0;
                let erros = 0;
                
                for (const folga of folgasParaSalvar) {
                    try {
                        const result = await dataApi.create('folgas', folga);
                        folgas.push(result);
                        sucessos++;
                    } catch (error) {
                        console.error('Erro ao salvar plantão:', error);
                        erros++;
                    }
                }
                
                updateCalendarEvents();
                modalPlantaoLote.classList.remove('active');
                formPlantaoLote.reset();
                document.querySelectorAll('#formPlantaoLote .opcao-recorrencia').forEach(op => {
                    op.style.display = 'none';
                });
                
                hideLoading();
                let mensagem = `${sucessos} plantão(ões) gerado(s) com sucesso!`;
                if (deletadas > 0) {
                    mensagem += ` ${deletadas} plantão(ões) existente(s) substituído(s).`;
                }
                if (erros > 0) {
                    mensagem += ` ${erros} erro(s).`;
                }
                showSuccess(mensagem);
            } catch (error) {
                hideLoading();
                console.error('Erro ao gerar plantões em lote:', error);
                
                let mensagem = 'Erro ao gerar plantões em lote.';
                if (error.message.includes('tempo limite')) {
                    mensagem = 'O servidor está demorando para responder. Tente novamente em alguns instantes.';
                } else if (error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
                    mensagem = 'Sua sessão expirou. Faça login novamente.';
                    setTimeout(() => {
                        window.location.href = '../../../index.html';
                    }, 2000);
                } else if (error.message.includes('conexão')) {
                    mensagem = 'Erro de conexão. Verifique sua internet.';
                } else if (error.message) {
                    mensagem = error.message;
                }
                
                showError(mensagem);
            }
        });
    }

    // Mudança no tipo de recorrência (Plantão)
    if (tipoRecorrenciaPlantao) {
        tipoRecorrenciaPlantao.addEventListener('change', (e) => {
            const tipo = e.target.value;
            document.querySelectorAll('#formPlantaoLote .opcao-recorrencia').forEach(op => {
                op.style.display = 'none';
            });
            if (tipo === 'semanal') {
                document.getElementById('opcaoSemanalPlantao').style.display = 'block';
            } else if (tipo === 'intervalo') {
                document.getElementById('opcaoIntervaloPlantao').style.display = 'block';
            } else if (tipo === 'dias-semana') {
                document.getElementById('opcaoDiasSemanaPlantao').style.display = 'block';
            }
        });
    }

    // Cancelar modal de plantão em lote
    const btnCancelarPlantaoLote = document.getElementById('btnCancelarPlantaoLote');
    if (btnCancelarPlantaoLote) {
        btnCancelarPlantaoLote.addEventListener('click', () => {
            modalPlantaoLote.classList.remove('active');
            formPlantaoLote.reset();
            document.querySelectorAll('#formPlantaoLote .opcao-recorrencia').forEach(op => {
                op.style.display = 'none';
            });
        });
    }

    // Cancelar modal de lote
    const btnCancelarLote = document.getElementById('btnCancelarLote');
    if (btnCancelarLote) {
        btnCancelarLote.addEventListener('click', () => {
            modalFolgaLote.classList.remove('active');
            formFolgaLote.reset();
            document.querySelectorAll('.opcao-recorrencia').forEach(op => {
                op.style.display = 'none';
            });
        });
    }
}

// Função para gerar folgas em lote
async function gerarFolgasEmLote(colaboradorId, tipo, dataInicio, dataFim, sobrescrever, tipoEvento = 'folga', isPlantaoLote = false) {
    const folgasGeradas = [];
    const inicio = dayjs(dataInicio);
    const fim = dataFim ? dayjs(dataFim) : dayjs().add(1, 'year'); // 1 ano se não especificado
    const inicioMesAtual = dayjs().startOf('month');
    
    // Não permitir gerar folgas antes do mês atual
    if (inicio.isBefore(inicioMesAtual)) {
        throw new Error('Não é permitido gerar folgas em meses passados.');
    }
    
    let dataAtual = inicio;
    
    if (tipo === 'semanal') {
        // Toda semana (dia fixo)
        const diaSemanaEl = isPlantaoLote ? 
            document.getElementById('diaSemanaPlantao') : 
            document.getElementById('diaSemana');
        const diaSemana = parseInt(diaSemanaEl.value);
        
        // Encontrar a primeira ocorrência do dia da semana
        while (dataAtual.day() !== diaSemana && dataAtual.isBefore(fim)) {
            dataAtual = dataAtual.add(1, 'day');
        }
        
        // Gerar folgas semanais
        while (dataAtual.isBefore(fim) || dataAtual.isSame(fim, 'day')) {
            if (dataAtual.isSameOrAfter(inicioMesAtual, 'day')) {
                const dataStr = dataAtual.format('YYYY-MM-DD');
                
                // Verificar se já existe (normalizar datas para comparação)
                const existe = folgas.find(f => {
                    const fData = dayjs(f.data).format('YYYY-MM-DD');
                    return f.colaboradorId === colaboradorId && fData === dataStr;
                });
                
                if (!existe || sobrescrever) {
                    // Se existe e vamos sobrescrever, vamos deletar depois
                    if (existe && sobrescrever) {
                        // Marcar para deletar depois (não deletar agora para não bloquear)
                        // Vamos deletar após criar todas as novas
                    }
                    
                    folgasGeradas.push({
                        colaboradorId,
                        data: dataStr,
                        tipo: tipoEvento,
                        periodoId: dataAtual.format('MM-YYYY'),
                        createdAt: new Date().toISOString(),
                        recorrente: true,
                        tipoRecorrencia: 'semanal',
                        diaSemana: diaSemana,
                        _existeId: existe && sobrescrever ? existe.id : null
                    });
                }
            }
            
            dataAtual = dataAtual.add(1, 'week');
        }
    } else if (tipo === 'intervalo') {
        // A cada X dias
        const intervaloEl = isPlantaoLote ? 
            document.getElementById('intervaloDiasPlantao') : 
            document.getElementById('intervaloDias');
        const dataInicioIntervaloEl = isPlantaoLote ? 
            document.getElementById('dataInicioIntervaloPlantao') : 
            document.getElementById('dataInicioIntervalo');
        const intervalo = parseInt(intervaloEl.value);
        const dataInicioIntervalo = dayjs(dataInicioIntervaloEl.value || dataInicio);
        
        if (!intervalo || intervalo < 1) {
            throw new Error('O intervalo deve ser maior que zero.');
        }
        
        dataAtual = dataInicioIntervalo;
        
        while (dataAtual.isBefore(fim) || dataAtual.isSame(fim, 'day')) {
            if (dataAtual.isSameOrAfter(inicioMesAtual, 'day')) {
                const dataStr = dataAtual.format('YYYY-MM-DD');
                
                const existe = folgas.find(f => 
                    f.colaboradorId === colaboradorId && 
                    f.data === dataStr
                );
                
                if (!existe || sobrescrever) {
                    folgasGeradas.push({
                        colaboradorId,
                        data: dataStr,
                        tipo: tipoEvento,
                        periodoId: dataAtual.format('MM-YYYY'),
                        createdAt: new Date().toISOString(),
                        recorrente: true,
                        tipoRecorrencia: 'intervalo',
                        intervaloDias: intervalo,
                        _existeId: existe && sobrescrever ? existe.id : null
                    });
                }
            }
            
            dataAtual = dataAtual.add(intervalo, 'day');
        }
    } else if (tipo === 'dias-semana') {
        // Dias específicos da semana
        const checkboxSelector = isPlantaoLote ? 
            '.dia-checkbox-plantao:checked' : 
            '.dia-checkbox:checked';
        const diasSelecionados = Array.from(document.querySelectorAll(checkboxSelector))
            .map(cb => parseInt(cb.value));
        
        if (diasSelecionados.length === 0) {
            throw new Error('Selecione pelo menos um dia da semana.');
        }
        
        dataAtual = inicio;
        
        while (dataAtual.isBefore(fim) || dataAtual.isSame(fim, 'day')) {
            if (diasSelecionados.includes(dataAtual.day()) && 
                dataAtual.isSameOrAfter(inicioMesAtual, 'day')) {
                const dataStr = dataAtual.format('YYYY-MM-DD');
                
                const existe = folgas.find(f => 
                    f.colaboradorId === colaboradorId && 
                    f.data === dataStr
                );
                
                if (!existe || sobrescrever) {
                    folgasGeradas.push({
                        colaboradorId,
                        data: dataStr,
                        tipo: tipoEvento,
                        periodoId: dataAtual.format('MM-YYYY'),
                        createdAt: new Date().toISOString(),
                        recorrente: true,
                        tipoRecorrencia: 'dias-semana',
                        diasSemana: diasSelecionados,
                        _existeId: existe && sobrescrever ? existe.id : null
                    });
                }
            }
            
            dataAtual = dataAtual.add(1, 'day');
        }
    }
    
    return folgasGeradas;
}

// Funções Auxiliares
function openModalFolga(event = null, dateStr = null, tipoInicial = 'folga') {
    if (!modalFolga) return;
    
    const titleEl = document.getElementById('modalTitle');
    const folgaIdEl = document.getElementById('folgaId');
    const tipoEventoEl = document.getElementById('tipoEvento');
    const dataInput = document.getElementById('dataFolga');
    
    if (!titleEl || !folgaIdEl || !dataInput) return;
    
    formFolga.reset();
    
    if (event) {
        // Edição
        const tipo = event.extendedProps.tipo || 'folga';
        titleEl.textContent = tipo === 'plantao' ? 'Editar Plantão' : 'Editar Folga';
        folgaIdEl.value = event.id;
        tipoEventoEl.value = tipo;
        
        // Atualizar botões de tipo
        document.querySelectorAll('#formFolga .tipo-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tipo === tipo) btn.classList.add('active');
        });
        
        const colabId = event.extendedProps.colaboradorId;
        selectColaborador.value = colabId;
        
        const data = dayjs(event.start).format('YYYY-MM-DD');
        dataInput.value = data;
        
        if (btnDeleteFolga) btnDeleteFolga.style.display = 'block';
    } else {
        // Nova
        tipoEventoEl.value = tipoInicial;
        titleEl.textContent = tipoInicial === 'plantao' ? 'Registrar Plantão' : 'Registrar Folga';
        folgaIdEl.value = '';
        
        // Atualizar botões de tipo
        document.querySelectorAll('#formFolga .tipo-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tipo === tipoInicial) btn.classList.add('active');
        });
        
        if (dateStr) {
            dataInput.value = dateStr;
        } else {
            dataInput.value = dayjs().format('YYYY-MM-DD');
        }
        if (btnDeleteFolga) btnDeleteFolga.style.display = 'none';
    }
    
    modalFolga.classList.add('active');
}

function openModalFolgaLote(tipoInicial = 'folga') {
    if (!modalFolgaLote) return;
    
    formFolgaLote.reset();
    document.getElementById('tipoEventoLote').value = tipoInicial;
    document.getElementById('modalLoteTitle').textContent = 
        tipoInicial === 'plantao' ? 'Plantões em Lote (Recorrentes)' : 'Folgas em Lote (Recorrentes)';
    
    // Atualizar botões de tipo
    document.querySelectorAll('#formFolgaLote .tipo-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tipo === tipoInicial) btn.classList.add('active');
    });
    
    document.querySelectorAll('#formFolgaLote .opcao-recorrencia').forEach(op => {
        op.style.display = 'none';
    });
    
    // Definir data de início padrão como hoje
    const dataInicioLote = document.getElementById('dataInicioLote');
    if (dataInicioLote) {
        dataInicioLote.value = dayjs().format('YYYY-MM-DD');
    }
    
    modalFolgaLote.classList.add('active');
}

function openModalPlantaoLote() {
    if (!modalPlantaoLote) return;
    
    formPlantaoLote.reset();
    document.getElementById('tipoEventoPlantaoLote').value = 'plantao';
    
    document.querySelectorAll('#formPlantaoLote .opcao-recorrencia').forEach(op => {
        op.style.display = 'none';
    });
    
    // Definir data de início padrão como hoje
    const dataInicioPlantaoLote = document.getElementById('dataInicioPlantaoLote');
    if (dataInicioPlantaoLote) {
        dataInicioPlantaoLote.value = dayjs().format('YYYY-MM-DD');
    }
    
    modalPlantaoLote.classList.add('active');
}
