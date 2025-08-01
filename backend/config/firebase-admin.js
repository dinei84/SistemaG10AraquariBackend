const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Função para inicializar o Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('Arquivo de credenciais do Firebase não encontrado. Algumas funcionalidades estarão indisponíveis.');
      return null;
    }
    
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://planilha-8938f-default-rtdb.firebaseio.com"
    });
    
    console.log('Firebase Admin SDK inicializado com sucesso');
    return admin;
  } catch (error) {
    console.error('Erro ao inicializar o Firebase Admin SDK:', error.message);
    console.warn('O servidor continuará funcionando, mas a autenticação e outras funcionalidades do Firebase estarão indisponíveis.');
    return null;
  }
}

const firebaseAdmin = initializeFirebaseAdmin();

module.exports = firebaseAdmin || {
  auth: () => ({
    verifyIdToken: async () => ({ uid: 'anonymous' })
  }),
  firestore: () => ({
    collection: () => ({})
  }),
  isInitialized: false
};