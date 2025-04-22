// config.js - Configurau00e7u00f5es globais da aplicau00e7u00e3o

const CONFIG = {
  // URLs de produu00e7u00e3o (Render)
  PRODUCTION: {
    API_URL: 'https://sistemag10araquaribackend.onrender.com/api',
    WEBSOCKET_URL: 'wss://sistemag10araquaribackend.onrender.com'
  },
  
  // URLs de desenvolvimento (local)
  DEVELOPMENT: {
    API_URL: 'http://localhost:5000/api',
    WEBSOCKET_URL: 'ws://localhost:8080'
  },
  
  // Define qual ambiente usar
  ENVIRONMENT: 'PRODUCTION' // Mude para 'DEVELOPMENT' quando estiver desenvolvendo localmente
};

// Exporta as configurau00e7u00f5es do ambiente atual
export default {
  API_URL: CONFIG[CONFIG.ENVIRONMENT].API_URL,
  WEBSOCKET_URL: CONFIG[CONFIG.ENVIRONMENT].WEBSOCKET_URL
};