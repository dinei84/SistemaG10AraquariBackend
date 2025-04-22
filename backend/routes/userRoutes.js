const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Todas as rotas de usuário requerem autenticação
router.use(authMiddleware);

// Rota para obter dados do usuário atual
router.get('/me', userController.getCurrentUser);

// Rota para atualizar dados do usuário
router.put('/me', userController.updateUser);

module.exports = router;