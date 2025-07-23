const admin = require('../config/firebase-admin');

const inMemoryDb = {
  collections: {}
};

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Função para obter a instância do banco de dados (Firestore ou em memória)
function getDb() {
  if (admin.isInitialized) {
    return admin.firestore();
  } else {
    console.warn('Firestore não disponível. Usando armazenamento em memória.');
    return null;
  }
}

/**
 * Obtém todos os documentos de uma coleção
 */
const getAllDocuments = async (req, res) => {
  try {
    const { collection } = req.params;
    
    // Validação básica
    if (!collection) {
      return res.status(400).json({ message: 'Nome da coleção não fornecido' });
    }
    
    // Verifica se o Firestore está disponível
    const db = getDb();
    if (db) {
      // Obtém os documentos da coleção do Firestore
      const snapshot = await db.collection(collection).get();
      
      if (snapshot.empty) {
        return res.status(200).json([]);
      }
      
      const documents = [];
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return res.status(200).json(documents);
    } else {
      // Usa o armazenamento em memória
      const collectionData = inMemoryDb.collections[collection] || {};
      const documents = Object.keys(collectionData).map(id => ({
        id,
        ...collectionData[id]
      }));
      
      return res.status(200).json(documents);
    }
  } catch (error) {
    console.error('Erro ao obter documentos:', error);
    return res.status(500).json({ message: 'Erro ao obter documentos' });
  }
};

/**
 * Obtém um documento específico
 */
const getDocument = async (req, res) => {
  try {
    const { collection, id } = req.params;
    
    // Validação básica
    if (!collection || !id) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }
    
    // Verifica se o Firestore está disponível
    const db = getDb();
    if (db) {
      // Obtém o documento do Firestore
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ message: 'Documento não encontrado' });
      }
      
      return res.status(200).json({
        id: doc.id,
        ...doc.data()
      });
    } else {
      // Usa o armazenamento em memória
      if (!inMemoryDb.collections[collection] || !inMemoryDb.collections[collection][id]) {
        return res.status(404).json({ message: 'Documento não encontrado' });
      }
      
      return res.status(200).json({
        id,
        ...inMemoryDb.collections[collection][id]
      });
    }
  } catch (error) {
    console.error('Erro ao obter documento:', error);
    return res.status(500).json({ message: 'Erro ao obter documento' });
  }
};

/**
 * Cria um novo documento
 */
const createDocument = async (req, res) => {
  try {
    const { collection } = req.params;
    const data = req.body;
    
    // Validação básica
    if (!collection || !data) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }
    
    // Adiciona metadados
    const timestamp = new Date().toISOString();
    const enhancedData = {
      ...data,
      createdBy: req.user.uid,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Verifica se o Firestore está disponível
    const db = getDb();
    if (db) {
      // Cria o documento no Firestore
      const docRef = await db.collection(collection).add(enhancedData);
      
      return res.status(201).json({
        id: docRef.id,
        ...enhancedData
      });
    } else {
      // Usa o armazenamento em memória
      if (!inMemoryDb.collections[collection]) {
        inMemoryDb.collections[collection] = {};
      }
      
      const id = generateId();
      inMemoryDb.collections[collection][id] = enhancedData;
      
      return res.status(201).json({
        id,
        ...enhancedData
      });
    }
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    return res.status(500).json({ message: 'Erro ao criar documento' });
  }
};

/**
 * Atualiza um documento existente
 */
const updateDocument = async (req, res) => {
  try {
    const { collection, id } = req.params;
    const data = req.body;
    
    // Validação básica
    if (!collection || !id || !data) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }
    
    // Adiciona metadados de atualização
    const timestamp = new Date().toISOString();
    const enhancedData = {
      ...data,
      updatedBy: req.user.uid,
      updatedAt: timestamp
    };
    
    // Verifica se o Firestore está disponível
    const db = getDb();
    if (db) {
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ message: 'Documento não encontrado' });
      }
      
      await docRef.update(enhancedData);
      
      return res.status(200).json({
        id,
        ...enhancedData
      });
    } else {
      if (!inMemoryDb.collections[collection] || !inMemoryDb.collections[collection][id]) {
        return res.status(404).json({ message: 'Documento não encontrado' });
      }
      
      // Atualiza o documento em memória
      inMemoryDb.collections[collection][id] = {
        ...inMemoryDb.collections[collection][id],
        ...enhancedData
      };
      
      return res.status(200).json({
        id,
        ...inMemoryDb.collections[collection][id]
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar documento:', error);
    return res.status(500).json({ message: 'Erro ao atualizar documento' });
  }
};

/**
 * Exclui um documento
 */
const deleteDocument = async (req, res) => {
  try {
    const { collection, id } = req.params;
    
    // Validação básica
    if (!collection || !id) {
      return res.status(400).json({ message: 'Parâmetros inválidos' });
    }
    
    const db = getDb();
    if (db) {
      const docRef = db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return res.status(404).json({ message: 'Documento não encontrado' });
      }
      
      await docRef.delete();
    } else {
      if (!inMemoryDb.collections[collection] || !inMemoryDb.collections[collection][id]) {
        return res.status(404).json({ message: 'Documento não encontrado' });
      }
      
      delete inMemoryDb.collections[collection][id];
    }
    
    return res.status(200).json({ message: 'Documento excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    return res.status(500).json({ message: 'Erro ao excluir documento' });
  }
};

module.exports = {
  getAllDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument
};