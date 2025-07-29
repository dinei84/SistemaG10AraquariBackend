// chat.js - Gerencia a interface do chat e a comunicau00e7u00e3o com o WebSocket

import { auth } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import config from "./config.js";

const WEBSOCKET_URL = config.WEBSOCKET_URL;
const CHAT_HISTORY_KEY = 'chat_history';
const MAX_STORED_MESSAGES = 100;
const RECONNECT_INTERVAL = 3000; 

// Elementos do DOM
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const onlineUsersList = document.getElementById('onlineUsersList');
const userNameElement = document.getElementById('userName');
const userAvatarElement = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

let socket;
let currentUser = null;
let onlineUsers = [];
let reconnectInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.email.split('@')[0], // Sempre pega antes do @
                photoURL: user.photoURL
            };
            
            initializeChat();
        } else {
            window.location.href = '../../login.html';
        }
    });

    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
});

function initializeChat() {
    updateUserInfo();
    
    loadChatHistory();
    
    setupEventListeners();
    
    connectWebSocket();
}

function updateUserInfo() {
    userNameElement.textContent = currentUser.displayName;
    
    if (currentUser.photoURL) {
        userAvatarElement.innerHTML = `<img src="${currentUser.photoURL}" alt="${currentUser.displayName}" />`;
    } else {
        const initials = currentUser.displayName.split(' ')
            .map(name => name.charAt(0))
            .join('')
            .toUpperCase();
        userAvatarElement.textContent = initials;
    }
}

// Conecta ao servidor WebSocket
function connectWebSocket() {
    try {
        socket = new WebSocket(WEBSOCKET_URL);
        
        socket.onopen = () => {
            console.log('Conexão WebSocket estabelecida');
            reconnectAttempts = 0;
            
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
            
            sendUserInfo();
        };
        
        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };
        
        socket.onclose = (event) => {
            console.log('Conexão WebSocket fechada:', event.code, event.reason);
            attemptReconnect();
        };
        
        socket.onerror = (error) => {
            console.error('Erro na conexão WebSocket:', error);
            attemptReconnect();
        };
    } catch (error) {
        console.error('Erro ao conectar ao WebSocket:', error);
        attemptReconnect();
    }
}

// Tenta reconectar ao WebSocket
function attemptReconnect() {
    if (reconnectInterval) return; 
    
    reconnectInterval = setInterval(() => {
        reconnectAttempts++;
        
        console.log(`Tentativa de reconexão ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
        connectWebSocket();
        
        if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            console.error('Não foi possível reconectar ao servidor após várias tentativas.');
            
            // Adiciona uma mensagem no chat informando o problema
            const systemMessage = document.createElement('div');
            systemMessage.className = 'message system';
            systemMessage.innerHTML = `
                <div class="message-content system-message error-message">
                    Erro de conexão com o servidor. Verifique se o servidor WebSocket está em execução ou recarregue a página.
                </div>
            `;
            
            chatMessages.appendChild(systemMessage);
            scrollToBottom();
        }
    }, RECONNECT_INTERVAL);
}

// Envia informações do usuário para o servidor
async function sendUserInfo() {
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            // Obtém o token de autenticação atual
            const token = await auth.currentUser.getIdToken();
            
            socket.send(JSON.stringify({
                type: 'user_info',
                user: currentUser,
                token: token
            }));
        } catch (error) {
            console.error('Erro ao obter token de autenticação:', error);
            
            socket.send(JSON.stringify({
                type: 'user_info',
                user: currentUser
            }));
        }
    }
}

function setupEventListeners() {
    // Enviar mensagem ao clicar no botu00e3o
    sendButton.addEventListener('click', sendMessage);
    
    // Enviar mensagem ao pressionar Enter
    messageInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Logout
    logoutBtn.addEventListener('click', async () => {
        try {
            // Informa o servidor que o usuu00e1rio estu00e1 saindo
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'user_logout',
                    user: currentUser
                }));
            }
            
            if (socket) {
                socket.close();
            }
            
            await signOut(auth);
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    });
}

// 1. Adicione o painel de figurinhas e o botão de upload no DOM após o campo de mensagem
// (adicione após o campo de input e botão de enviar)

// Função para criar painel de figurinhas
function criarPainelFigurinhas() {
    const stickers = [
        // Stickers já existentes
        '../../assets/icons/icon chat.png',
        '../../assets/icons/icon calculator.png',
        '../../assets/icons/icon manual order.png',
        '../../assets/icons/icon phone.png',
        '../../assets/icons/icon search.png',
        '../../assets/icons/icon spreedsheet.png',
        '../../assets/g10.png',
        '../../assets/team.jpeg',
        // Twemoji (CDN oficial)
        '😀', // 😍
        'https://twemoji.maxcdn.com/v/latest/72x72/1f602.png', // 😂
        'https://twemoji.maxcdn.com/v/latest/72x72/1f62d.png', // 😭
        'https://twemoji.maxcdn.com/v/latest/72x72/1f609.png', // 😉
        'https://twemoji.maxcdn.com/v/latest/72x72/1f60e.png', // 😎
        'https://twemoji.maxcdn.com/v/latest/72x72/1f973.png', // 🥳
        'https://twemoji.maxcdn.com/v/latest/72x72/1f621.png', // 😡
        'https://twemoji.maxcdn.com/v/latest/72x72/1f622.png', // 😢
        'https://twemoji.maxcdn.com/v/latest/72x72/1f44d.png', // 👍
        'https://twemoji.maxcdn.com/v/latest/72x72/1f44e.png', // 👎
        'https://twemoji.maxcdn.com/v/latest/72x72/1f525.png', // 🔥
        'https://twemoji.maxcdn.com/v/latest/72x72/1f47b.png', // 👻
        'https://twemoji.maxcdn.com/v/latest/72x72/1f480.png', // 💀
        // OpenMoji (CDN oficial)
        'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/72x72/1f92a.png', // 🤪
        'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/72x72/1f60f.png', // 😏
        'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/72x72/1f618.png', // 😘
        'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/72x72/1f4af.png', // 💯
        'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/72x72/1f389.png', // 🎉
        'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/72x72/1f643.png', // 🙃
        'https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@14.0.0/color/72x72/1f60a.png', // 😊
    ];
    const painel = document.createElement('div');
    painel.id = 'painelFigurinhas';
    painel.style.display = 'none';
    painel.style.position = 'absolute';
    painel.style.bottom = '60px';
    painel.style.left = '20px';
    painel.style.background = '#fff';
    painel.style.border = '1px solid #ccc';
    painel.style.borderRadius = '8px';
    painel.style.padding = '10px';
    painel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
    painel.style.zIndex = '999';
    painel.style.maxWidth = '300px';
    painel.style.display = 'flex';
    painel.style.flexWrap = 'wrap';
    painel.style.gap = '8px';
    stickers.forEach(url => {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'sticker';
        img.style.width = '48px';
        img.style.height = '48px';
        img.style.cursor = 'pointer';
        img.onclick = () => {
            enviarMensagem(`<img src=\"${url}\" class=\"sticker\">`);
            painel.style.display = 'none';
        };
        painel.appendChild(img);
    });
    document.body.appendChild(painel);
    return painel;
}

// Função para mostrar/ocultar painel de figurinhas
function togglePainelFigurinhas() {
    const painel = document.getElementById('painelFigurinhas') || criarPainelFigurinhas();
    painel.style.display = painel.style.display === 'none' ? 'flex' : 'none';
}

// Adicione botão de figurinhas e upload ao lado do campo de mensagem
const chatInputContainer = document.querySelector('.chat-input-container');
if (chatInputContainer) {
    // Botão de figurinhas
    const btnSticker = document.createElement('button');
    btnSticker.type = 'button';
    btnSticker.id = 'btnSticker';
    btnSticker.title = 'Enviar figurinha';
    btnSticker.innerHTML = '😀';
    btnSticker.style.marginRight = '8px';
    btnSticker.onclick = togglePainelFigurinhas;
    chatInputContainer.insertBefore(btnSticker, chatInputContainer.firstChild);

    // Botão de upload de imagem
    const btnUpload = document.createElement('button');
    btnUpload.type = 'button';
    btnUpload.id = 'btnUpload';
    btnUpload.title = 'Enviar imagem';
    btnUpload.innerHTML = '📎';
    btnUpload.style.marginRight = '8px';
    chatInputContainer.insertBefore(btnUpload, chatInputContainer.firstChild.nextSibling);

    // Input file escondido
    const inputFile = document.createElement('input');
    inputFile.type = 'file';
    inputFile.accept = 'image/*';
    inputFile.style.display = 'none';
    inputFile.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                enviarMensagem(`<img src=\"${evt.target.result}\" class=\"chat-image\">`);
            };
            reader.readAsDataURL(file);
        }
        inputFile.value = '';
    };
    document.body.appendChild(inputFile);
    btnUpload.onclick = () => inputFile.click();
}

// Função para enviar mensagem (texto, figurinha ou imagem)
function enviarMensagem(conteudo) {
    if (conteudo && socket && socket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'chat_message',
            content: conteudo,
            sender: currentUser,
            timestamp: new Date().toISOString()
        };
        socket.send(JSON.stringify(message));
        messageInput.value = '';
    }
}

// Substitua sendMessage() para usar enviarMensagem()
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (messageText) {
        enviarMensagem(messageText);
    }
}

// Trata as mensagens recebidas do WebSocket
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'chat_message':
            displayMessage(data);
            saveMessageToHistory(data);

            // Notificação: só se não for sua mensagem e a aba não estiver em foco
            if (data.sender && data.sender.uid !== currentUser.uid && document.visibilityState !== 'visible') {
                let nomeRemetente = data.sender.email ? data.sender.email.split('@')[0] : (data.sender.displayName || 'Usuário');
                mostrarNotificacao(
                    `Nova mensagem de ${nomeRemetente}`,
                    data.content.length > 60 ? data.content.substring(0, 60) + '...' : data.content
                );
            }
            break;
            
        case 'user_list':
            updateOnlineUsers(data.users);
            break;
            
        case 'user_joined':
            addOnlineUser(data.user);
            displaySystemMessage(`${data.user.displayName} entrou no chat`);
            break;
            
        case 'user_left':
            removeOnlineUser(data.user);
            displaySystemMessage(`${data.user.displayName} saiu do chat`);
            break;
            
        default:
            console.log('Mensagem desconhecida:', data);
    }
}

// Ajuste displayMessage para exibir imagens/figurinhas corretamente
function displayMessage(message) {
    const messageElement = document.createElement('div');
    const isSentByCurrentUser = message.sender.uid === currentUser.uid;
    let nomeExibido = 'Usuário';
    if (isSentByCurrentUser) {
        nomeExibido = 'Você';
    } else if (message.sender && message.sender.email) {
        nomeExibido = message.sender.email.split('@')[0];
    } else if (message.sender && message.sender.displayName) {
        nomeExibido = message.sender.displayName;
    }
    messageElement.className = `message ${isSentByCurrentUser ? 'sent' : 'received'}`;
    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // Detecta se é uma imagem/figurinha
    let conteudo = message.content;
    if (/^<img\s/i.test(conteudo)) {
        // Segurança: só permite src de data:image ou das pastas de assets
        conteudo = conteudo.replace(/src=\"([^\"]+)\"/g, (match, src) => {
            if (src.startsWith('data:image') || src.startsWith('../../assets/')) {
                return `src=\"${src}\"`;
            } else {
                return 'src=\"#\"';
            }
        });
    } else {
        // Escapa HTML para texto normal
        conteudo = conteudo.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    messageElement.innerHTML = `
        <div class="message-info">
            <span class="message-sender">${nomeExibido}</span>
            <span class="message-time">${timeString}</span>
        </div>
        <div class="message-content">${conteudo}</div>
    `;
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

// Exibe uma mensagem de sistema
function displaySystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message system';
    messageElement.innerHTML = `
        <div class="message-content system-message">${text}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    scrollToBottom();
}

function updateOnlineUsers(users) {
    onlineUsers = users;
    renderOnlineUsers();
}

function addOnlineUser(user) {
    if (!onlineUsers.some(u => u.uid === user.uid)) {
        onlineUsers.push(user);
        renderOnlineUsers();
    }
}

function removeOnlineUser(user) {
    onlineUsers = onlineUsers.filter(u => u.uid !== user.uid);
    renderOnlineUsers();
}

function renderOnlineUsers() {
    onlineUsersList.innerHTML = '';
    
    onlineUsers.forEach(user => {
        const listItem = document.createElement('li');
        
        if (user.uid === currentUser.uid) {
            listItem.classList.add('current-user');
        }
        
        listItem.innerHTML = `
            <span class="user-status"></span>
            <span>${user.displayName}</span>
        `;
        
        onlineUsersList.appendChild(listItem);
    });
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function saveMessageToHistory(message) {
    let chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    
    chatHistory.push(message);
    
    if (chatHistory.length > MAX_STORED_MESSAGES) {
        chatHistory = chatHistory.slice(chatHistory.length - MAX_STORED_MESSAGES);
    }
    
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
}

function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    
    chatHistory.forEach(message => {
        displayMessage(message);
    });
    
    if (chatHistory.length > 0) {
        displaySystemMessage('Mensagens anteriores carregadas do histórico local');
    }
}

// Função utilitária para mostrar notificação do navegador
function mostrarNotificacao(titulo, corpo) {
    if (Notification.permission === "granted") {
        new Notification(titulo, {
            body: corpo,
            icon: "../../assets/favcom.png"
        });
    }
}