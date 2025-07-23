
const CONFIG = {  
  PRODUCTION: {
    API_URL: 'https://sistemag10araquaribackend.onrender.com/api',
    WEBSOCKET_URL: 'wss://sistemag10araquaribackend.onrender.com'
  },
  
  DEVELOPMENT: {
    API_URL: 'http://localhost:5000/api',
    WEBSOCKET_URL: 'ws://localhost:8080'
  },
  
  
  ENVIRONMENT: 'PRODUCTION' 
};

export default {
  API_URL: CONFIG[CONFIG.ENVIRONMENT].API_URL,
  WEBSOCKET_URL: CONFIG[CONFIG.ENVIRONMENT].WEBSOCKET_URL
};