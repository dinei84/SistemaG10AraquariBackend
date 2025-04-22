// Configuração do WebSocket para integração com o servidor HTTP principal

const WebSocket = require('ws');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configurações
const ENABLE_AUTH = process.env.ENABLE_AUTH === 'true';

// Inicialização do Firebase Admin (se necessário)
function initializeFirebase() {
    if (!ENABLE_AUTH) {
        console.log('Autenticação desativada. O servidor não verificará tokens.');
        return false;
    }
    
    try {
        const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = require(serviceAccountPath);
            // Verifica se o Firebase Admin já foi inicializado
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://planilha-8938f-default-rtdb.firebaseio.com"
                });
            }
            console.log('Firebase Admin SDK inicializado com sucesso');
            return true;
        } else {
            console.warn('Arquivo de credenciais do Firebase não encontrado. A verificação de tokens está desativada.');
            return false;
        }
    } catch (error) {
        console.error('Erro ao inicializar o Firebase Admin SDK:', error);
        return false;
    }
}

module.exports = function setupWebSocket(server) {
    // Inicializa o Firebase Admin
    const firebaseInitialized = initializeFirebase();

    // Cria o servidor WebSocket
    const wss = new WebSocket.Server({ server });

    // Armazena os clientes conectados
    const clients = new Map();

    // Evento de conexão
    wss.on('connection', (ws) => {
        console.log('Nova conexão WebSocket estabelecida');
        
        // Gera um ID temporário para o cliente até que ele se identifique
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
        
        // Evento de desconexão
        ws.on('close', () => {
            const client = clients.get(ws);
            if (client && client.user) {
                // Notifica os outros usuários que este usuário saiu
                broadcastMessage({
                    type: 'user_left',
                    user: client.user
                }, ws);
                
                console.log(`Usuário desconectado: ${client.user.displayName}`);
            }
            
            clients.delete(ws);
            broadcastUserList();
        });
        
        // Evento de erro
        ws.on('error', (error) => {
            console.error('Erro na conexão WebSocket:', error);
            clients.delete(ws);
        });
    });

    // Trata as mensagens recebidas
    async function handleMessage(ws, data) {
        const client = clients.get(ws);
        
        switch (data.type) {
            case 'user_info':
                // Atualiza as informações do usuário
                if (data.user) {
                    // Verifica o token do usuário se o Firebase Admin estiver configurado
                    if (firebaseInitialized && data.token) {
                        try {
                            const decodedToken = await admin.auth().verifyIdToken(data.token);
                            if (decodedToken.uid !== data.user.uid) {
                                throw new Error('UID do token não corresponde ao UID do usuário');
                            }
                        } catch (error) {
                            console.error('Erro ao verificar token:', error);
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Autenticação inválida'
                            }));
                            return;
                        }
                    }
                    
                    // Atualiza as informações do cliente
                    clients.set(ws, { ...client, user: data.user });
                    
                    // Notifica os outros usuários que este usuário entrou
                    broadcastMessage({
                        type: 'user_joined',
                        user: data.user
                    }, ws);
                    
                    // Envia a lista de usuários online para o novo usuário
                    ws.send(JSON.stringify({
                        type: 'user_list',
                        users: getOnlineUsers()
                    }));
                    
                    console.log(`Usuário conectado: ${data.user.displayName}`);
                }
                break;
                
            case 'chat_message':
                // Verifica se o usuário está identificado
                if (client && client.user) {
                    // Transmite a mensagem para todos os clientes
                    broadcastMessage(data);
                    console.log(`Mensagem de ${client.user.displayName}: ${data.content}`);
                }
                break;
                
            case 'user_logout':
                // Usuário fez logout explicitamente
                if (client && client.user) {
                    broadcastMessage({
                        type: 'user_left',
                        user: client.user
                    }, ws);
                    
                    console.log(`Usuário fez logout: ${client.user.displayName}`);
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

    // Transmite a lista atualizada de usuários online para todos os clientes
    function broadcastUserList() {
        const users = getOnlineUsers();
        
        broadcastMessage({
            type: 'user_list',
            users: users
        });
    }

    // Obtém a lista de usuários online
    function getOnlineUsers() {
        const users = [];
        
        clients.forEach((client) => {
            if (client.user) {
                users.push(client.user);
            }
        });
        
        return users;
    }

    // Gera um ID único para o cliente
    function generateClientId() {
        return Math.random().toString(36).substring(2, 15);
    }

    console.log('WebSocket configurado e pronto para conexões');
    return wss;
};