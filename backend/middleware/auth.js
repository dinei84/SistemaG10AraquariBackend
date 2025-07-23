const admin = require('../config/firebase-admin');

/**
 * Middleware para verificar se o usuário está autenticado
 * Verifica o token JWT do Firebase no cabeçalho Authorization
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Verifica se o Firebase Admin está inicializado
    if (!admin.isInitialized) {
      console.warn('Firebase Admin não inicializado. Permitindo acesso sem autenticação.');
      // Adiciona um usuário anônimo para desenvolvimento
      req.user = { uid: 'dev-user', email: 'dev@example.com', name: 'Desenvolvedor' };
      return next();
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Não autorizado: Token não fornecido' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken; 
      next();
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return res.status(401).json({ message: 'Não autorizado: Token inválido' });
    }
  } catch (error) {
    console.error('Erro no middleware de autenticação:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

module.exports = authMiddleware;