const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');

// Carrega as variáveis de ambiente
dotenv.config();

// Inicializa o Express
const app = express();
const PORT = process.env.PORT || 5000;

// Cria o servidor HTTP usando o app Express
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para logging de requisiu00e7u00f5es
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Rotas
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/data', require('./routes/dataRoutes'));

// Rota de teste/sau00fade
app.get('/', (req, res) => {
  res.json({ message: 'API funcionando corretamente' });
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Configuração do WebSocket
const setupWebSocket = require('./websocket/setup-websocket');

// Configura o WebSocket no mesmo servidor HTTP
setupWebSocket(server);

// Inicia o servidor HTTP
server.listen(PORT, () => {
  console.log(`Servidor HTTP e WebSocket rodando na porta ${PORT}`);
});