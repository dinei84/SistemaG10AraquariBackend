const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/auth');

// Todas as rotas de dados requerem autenticau00e7u00e3o
router.use(authMiddleware);

// Rotas para manipulau00e7u00e3o de documentos
router.get('/:collection', dataController.getAllDocuments);
router.get('/:collection/:id', dataController.getDocument);
router.post('/:collection', dataController.createDocument);
router.put('/:collection/:id', dataController.updateDocument);
router.delete('/:collection/:id', dataController.deleteDocument);

module.exports = router;