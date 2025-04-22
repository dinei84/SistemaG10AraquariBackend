// Script para iniciar o servidor WebSocket sem depender do Firebase Admin

const WebSocket = require('ws');
const http = require('http');

// Porta para o servidor WebSocket
const PORT = 8080;

// Cria o servidor HTTP
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Servidor WebSocket para o chat');
});

// Cria o servidor WebSocket
const wss = new WebSocket.Server({ server });

// Armazena os clientes conectados
const clients = new Map();

// Evento de conexu00e3o
wss.on('connection', (ws) => {
    console.log('Nova conexu00e3o WebSocket estabelecida');
    
    // Gera um ID temporu00e1rio para o cliente atu00e9 que ele se identifique
    const clientId = Math.random().toString(36).substring(2, 15);
    clients.set(ws, { id: clientId });
    
    // Evento de mensagem recebida
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            handleMessage(ws, data);
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });
    
    // Evento de desconexu00e3o
    ws.on('close', () => {
        const client = clients.get(ws);
        if (client && client.user) {
            // Notifica os outros usuu00e1rios que este usuu00e1rio saiu
            broadcastMessage({
                type: 'user_left',
                user: client.user
            }, ws);
            
            console.log(`Usuu00e1rio desconectado: ${client.user.displayName}`);
        }
        
        clients.delete(ws);
        broadcastUserList();
    });
    
    // Evento de erro
    ws.on('error', (error) => {
        console.error('Erro na conexu00e3o WebSocket:', error);
        clients.delete(ws);
    });
});

// Trata as mensagens recebidas
function handleMessage(ws, data) {
    const client = clients.get(ws);
    
    switch (data.type) {
        case 'user_info':
            // Atualiza as informau00e7u00f5es do usuu00e1rio
            if (data.user) {
                // Atualiza as informau00e7u00f5es do cliente
                clients.set(ws, { ...client, user: data.user });
                
                // Notifica os outros usuu00e1rios que este usuu00e1rio entrou
                broadcastMessage({
                    type: 'user_joined',
                    user: data.user
                }, ws);
                
                // Envia a lista de usuu00e1rios online para o novo usuu00e1rio
                ws.send(JSON.stringify({
                    type: 'user_list',
                    users: getOnlineUsers()
                }));
                
                console.log(`Usuu00e1rio conectado: ${data.user.displayName}`);
            }
            break;
            
        case 'chat_message':
            // Verifica se o usuu00e1rio estu00e1 identificado
            if (client && client.user) {
                // Transmite a mensagem para todos os clientes
                broadcastMessage(data);
                console.log(`Mensagem de ${client.user.displayName}: ${data.content}`);
            }
            break;
            
        case 'user_logout':
            // Usuu00e1rio fez logout explicitamente
            if (client && client.user) {
                broadcastMessage({
                    type: 'user_left',
                    user: client.user
                }, ws);
                
                console.log(`Usuu00e1rio fez logout: ${client.user.displayName}`);
            }
            break;
            
        default:
            console.log('Tipo de mensagem desconhecido:', data.type);
    }
}

// Transmite uma mensagem para todos os clientes (exceto o remetente, se especificado)
function broadcastMessage(message, excludeWs = null) {
    const messageStr = JSON.stringify(message);
    
    clients.forEach((client, ws) => {
        if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
            ws.send(messageStr);
        }
    });
}

// Transmite a lista atualizada de usuu00e1rios online para todos os clientes
function broadcastUserList() {
    const users = getOnlineUsers();
    
    broadcastMessage({
        type: 'user_list',
        users: users
    });
}

// Obtu00e9m a lista de usuu00e1rios online
function getOnlineUsers() {
    const users = [];
    
    clients.forEach((client) => {
        if (client.user) {
            users.push(client.user);
        }
    });
    
    return users;
}

// Inicia o servidor
server.listen(PORT, () => {
    console.log(`Servidor WebSocket simplificado rodando na porta ${PORT}`);
    console.log(`Acesse o chat em seu navegador apu00f3s fazer login no sistema`);
});