const express = require('express');
const router = express.Router();
const dataController = require('../controllers/dataController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/:collection', dataController.getAllDocuments);
router.get('/:collection/:id', dataController.getDocument);
router.post('/:collection', dataController.createDocument);
router.put('/:collection/:id', dataController.updateDocument);
router.delete('/:collection/:id', dataController.deleteDocument);

module.exports = router;