// Servidor WebSocket para o chat

const WebSocket = require('ws');
const http = require('http');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carrega as variu00e1veis de ambiente
dotenv.config();

// Configurau00e7u00f5es
const PORT = process.env.WEBSOCKET_PORT || 8080;
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true';

// Inicializau00e7u00e3o do Firebase Admin (se necessu00e1rio)
function initializeFirebase() {
    if (!ENABLE_AUTH) {
        console.log('Autenticau00e7u00e3o desativada. O servidor nu00e3o verificaru00e1 tokens.');
        return false;
    }
    
    try {
        const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = require(serviceAccountPath);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.FIREBASE_DATABASE_URL || "https://planilha-8938f-default-rtdb.firebaseio.com"
            });
            console.log('Firebase Admin SDK inicializado com sucesso');
            return true;
        } else {
            console.warn('Arquivo de credenciais do Firebase nu00e3o encontrado. A verificau00e7u00e3o de tokens estu00e1 desativada.');
            return false;
        }
    } catch (error) {
        console.error('Erro ao inicializar o Firebase Admin SDK:', error);
        return false;
    }
}

// Inicializa o Firebase Admin
const firebaseInitialized = initializeFirebase();

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
    const clientId = generateClientId();
    clients.set(ws, { id: clientId });
    
    // Evento de mensagem recebida
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            await handleMessage(ws, data);
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
async function handleMessage(ws, data) {
    const client = clients.get(ws);
    
    switch (data.type) {
        case 'user_info':
            // Atualiza as informau00e7u00f5es do usuu00e1rio
            if (data.user) {
                // Verifica o token do usuu00e1rio se o Firebase Admin estiver configurado
                if (firebaseInitialized && data.token) {
                    try {
                        const decodedToken = await admin.auth().verifyIdToken(data.token);
                        if (decodedToken.uid !== data.user.uid) {
                            throw new Error('UID do token nu00e3o corresponde ao UID do usuu00e1rio');
                        }
                    } catch (error) {
                        console.error('Erro ao verificar token:', error);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Autenticau00e7u00e3o invu00e1lida'
                        }));
                        return;
                    }
                }
                
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

// Gera um ID u00fanico para o cliente
function generateClientId() {
    return Math.random().toString(36).substring(2, 15);
}

// Inicia o servidor
if (process.env.VERCEL) {
    // Na Vercel, exportamos o servidor como um mu00f3dulo
    module.exports = server;
} else {
    // Em ambiente local, iniciamos o servidor normalmente
    server.listen(PORT, () => {
        console.log(`Servidor WebSocket rodando na porta ${PORT}`);
        console.log(`Autenticau00e7u00e3o: ${firebaseInitialized ? 'Ativada' : 'Desativada'}`);
    });
}