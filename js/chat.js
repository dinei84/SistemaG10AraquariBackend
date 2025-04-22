// chat.js - Gerencia a interface do chat e a comunicau00e7u00e3o com o WebSocket

import { auth } from "./firebase-config.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Configurau00e7u00f5es
const WEBSOCKET_URL = 'ws://localhost:8080';
const CHAT_HISTORY_KEY = 'chat_history';
const MAX_STORED_MESSAGES = 100;
const RECONNECT_INTERVAL = 3000; // Tentar reconectar a cada 3 segundos

// Elementos do DOM
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const chatMessages = document.getElementById('chatMessages');
const onlineUsersList = document.getElementById('onlineUsersList');
const userNameElement = document.getElementById('userName');
const userAvatarElement = document.getElementById('userAvatar');
const logoutBtn = document.getElementById('logoutBtn');

// Variu00e1veis globais
let socket;
let currentUser = null;
let onlineUsers = [];
let reconnectInterval = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Inicializau00e7u00e3o
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se o usuu00e1rio estu00e1 autenticado
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Configura o usuu00e1rio atual
            currentUser = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || user.email.split('@')[0],
                photoURL: user.photoURL
            };
            
            // Inicializau00e7u00e3o em sequu00eancia
            initializeChat();
        } else {
            // Redireciona para a pu00e1gina de login se nu00e3o estiver autenticado
            window.location.href = '../../login.html';
        }
    });
});

// Funu00e7u00e3o para inicializar o chat de forma organizada
function initializeChat() {
    // 1. Atualiza a interface com os dados do usuu00e1rio
    updateUserInfo();
    
    // 2. Carrega o histu00f3rico de mensagens do localStorage
    loadChatHistory();
    
    // 3. Configura os event listeners
    setupEventListeners();
    
    // 4. Conecta ao WebSocket
    connectWebSocket();
}

// Atualiza as informau00e7u00f5es do usuu00e1rio na interface
function updateUserInfo() {
    userNameElement.textContent = currentUser.displayName;
    
    // Configura o avatar do usuu00e1rio
    if (currentUser.photoURL) {
        userAvatarElement.innerHTML = `<img src="${currentUser.photoURL}" alt="${currentUser.displayName}" />`;
    } else {
        // Usa as iniciais do nome como avatar
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
            
            // Limpa o intervalo de reconexão se existir
            if (reconnectInterval) {
                clearInterval(reconnectInterval);
                reconnectInterval = null;
            }
            
            // Envia informações do usuário para o servidor
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
    if (reconnectInterval) return; // Já está tentando reconectar
    
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
            
            // Envia sem o token em caso de erro
            socket.send(JSON.stringify({
                type: 'user_info',
                user: currentUser
            }));
        }
    }
}

// Configura os event listeners
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
            
            // Fecha a conexu00e3o WebSocket
            if (socket) {
                socket.close();
            }
            
            // Faz logout no Firebase
            await signOut(auth);
            window.location.href = '../../index.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    });
}

// Envia uma mensagem
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText && socket && socket.readyState === WebSocket.OPEN) {
        const message = {
            type: 'chat_message',
            content: messageText,
            sender: currentUser,
            timestamp: new Date().toISOString()
        };
        
        socket.send(JSON.stringify(message));
        messageInput.value = '';
    }
}

// Trata as mensagens recebidas do WebSocket
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'chat_message':
            displayMessage(data);
            saveMessageToHistory(data);
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

// Exibe uma mensagem no chat
function displayMessage(message) {
    const messageElement = document.createElement('div');
    const isSentByCurrentUser = message.sender.uid === currentUser.uid;
    
    messageElement.className = `message ${isSentByCurrentUser ? 'sent' : 'received'}`;
    
    // Formata a data/hora
    const timestamp = new Date(message.timestamp);
    const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-info">
            <span class="message-sender">${isSentByCurrentUser ? 'Vocu00ea' : message.sender.displayName}</span>
            <span class="message-time">${timeString}</span>
        </div>
        <div class="message-content">${message.content}</div>
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

// Atualiza a lista de usuu00e1rios online
function updateOnlineUsers(users) {
    onlineUsers = users;
    renderOnlineUsers();
}

// Adiciona um usuu00e1rio u00e0 lista de online
function addOnlineUser(user) {
    if (!onlineUsers.some(u => u.uid === user.uid)) {
        onlineUsers.push(user);
        renderOnlineUsers();
    }
}

// Remove um usuu00e1rio da lista de online
function removeOnlineUser(user) {
    onlineUsers = onlineUsers.filter(u => u.uid !== user.uid);
    renderOnlineUsers();
}

// Renderiza a lista de usuu00e1rios online
function renderOnlineUsers() {
    onlineUsersList.innerHTML = '';
    
    onlineUsers.forEach(user => {
        const listItem = document.createElement('li');
        
        // Destaca o usuu00e1rio atual
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

// Rola o chat para o final
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Salva uma mensagem no histu00f3rico local
function saveMessageToHistory(message) {
    let chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    
    // Adiciona a nova mensagem
    chatHistory.push(message);
    
    // Limita o nu00famero de mensagens armazenadas
    if (chatHistory.length > MAX_STORED_MESSAGES) {
        chatHistory = chatHistory.slice(chatHistory.length - MAX_STORED_MESSAGES);
    }
    
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
}

// Carrega o histu00f3rico de mensagens do localStorage
function loadChatHistory() {
    const chatHistory = JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || '[]');
    
    // Exibe as mensagens do histu00f3rico
    chatHistory.forEach(message => {
        displayMessage(message);
    });
    
    // Se houver mensagens, exibe uma divisu00f3ria
    if (chatHistory.length > 0) {
        displaySystemMessage('Mensagens anteriores carregadas do histu00f3rico local');
    }
}