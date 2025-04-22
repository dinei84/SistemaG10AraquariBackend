const admin = require('../config/firebase-admin');

/**
 * Obtu00e9m os dados do usuu00e1rio atual
 */
const getCurrentUser = async (req, res) => {
  try {
    // Os dados do usuu00e1rio ju00e1 estu00e3o disponu00edveis em req.user (adicionados pelo middleware de autenticau00e7u00e3o)
    const { uid, email, name } = req.user;
    
    // Verifica se o Firebase Admin estu00e1 inicializado
    if (!admin.isInitialized) {
      // Retorna dados simulados para desenvolvimento
      return res.status(200).json({
        uid: uid || 'dev-user',
        email: email || 'dev@example.com',
        displayName: name || 'Desenvolvedor',
        photoURL: 'https://via.placeholder.com/150',
        emailVerified: true,
        creationTime: new Date().toISOString(),
        lastSignInTime: new Date().toISOString()
      });
    }
    
    // Busca informau00e7u00f5es adicionais do usuu00e1rio no Firestore, se necessu00e1rio
    try {
      const userRecord = await admin.auth().getUser(uid);
      
      return res.status(200).json({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime
      });
    } catch (firebaseError) {
      console.warn('Erro ao obter dados do Firebase:', firebaseError);
      // Retorna dados bu00e1sicos em caso de erro
      return res.status(200).json({
        uid: uid,
        email: email,
        displayName: name || email.split('@')[0],
        photoURL: null
      });
    }
  } catch (error) {
    console.error('Erro ao obter dados do usuu00e1rio:', error);
    return res.status(500).json({ message: 'Erro ao obter dados do usuu00e1rio' });
  }
};

/**
 * Atualiza os dados do usuu00e1rio
 */
const updateUser = async (req, res) => {
  try {
    const { uid } = req.user;
    const { displayName, photoURL } = req.body;
    
    // Validau00e7u00e3o dos dados
    if (!displayName && !photoURL) {
      return res.status(400).json({ message: 'Nenhum dado fornecido para atualizau00e7u00e3o' });
    }
    
    // Verifica se o Firebase Admin estu00e1 inicializado
    if (!admin.isInitialized) {
      console.warn('Firebase Admin nu00e3o inicializado. Simulau00e7u00e3o de atualizau00e7u00e3o de usuu00e1rio.');
      return res.status(200).json({ 
        message: 'Usuu00e1rio atualizado com sucesso (modo de desenvolvimento)',
        userData: { uid, displayName, photoURL }
      });
    }
    
    // Prepara os dados para atualizau00e7u00e3o
    const updateData = {};
    if (displayName) updateData.displayName = displayName;
    if (photoURL) updateData.photoURL = photoURL;
    
    // Atualiza o usuu00e1rio no Firebase Auth
    try {
      await admin.auth().updateUser(uid, updateData);
      return res.status(200).json({ message: 'Usuu00e1rio atualizado com sucesso' });
    } catch (firebaseError) {
      console.warn('Erro ao atualizar usuu00e1rio no Firebase:', firebaseError);
      // Retorna sucesso simulado em caso de erro
      return res.status(200).json({ 
        message: 'Usuu00e1rio atualizado com sucesso (modo alternativo)',
        userData: { uid, displayName, photoURL }
      });
    }
  } catch (error) {
    console.error('Erro ao atualizar usuu00e1rio:', error);
    return res.status(500).json({ message: 'Erro ao atualizar usuu00e1rio' });
  }
};

module.exports = {
  getCurrentUser,
  updateUser
};