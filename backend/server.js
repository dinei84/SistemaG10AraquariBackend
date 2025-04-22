const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Carrega as variu00e1veis de ambiente
dotenv.config();

// Inicializa o Express
const app = express();
const PORT = process.env.PORT || 5000;

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

// Verifica se estamos em ambiente de produção na Vercel
if (process.env.VERCEL) {
  // Na Vercel, exportamos a aplicação como um módulo
  module.exports = app;
} else {
  // Em ambiente local, iniciamos o servidor normalmente
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
}