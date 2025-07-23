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

wss.on('connection', (ws) => {
    console.log('Nova conexu00e3o WebSocket estabelecida');
    
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
    
    ws.on('close', () => {
        const client = clients.get(ws);
        if (client && client.user) {
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
            if (data.user) {
                clients.set(ws, { ...client, user: data.user });
                
                broadcastMessage({
                    type: 'user_joined',
                    user: data.user
                }, ws);
                
                ws.send(JSON.stringify({
                    type: 'user_list',
                    users: getOnlineUsers()
                }));
                
                console.log(`Usuu00e1rio conectado: ${data.user.displayName}`);
            }
            break;
            
        case 'chat_message':
            if (client && client.user) {
                broadcastMessage(data);
                console.log(`Mensagem de ${client.user.displayName}: ${data.content}`);
            }
            break;
            
        case 'user_logout':
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