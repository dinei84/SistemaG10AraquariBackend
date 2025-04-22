// api.js - Funções para comunicação com o backend

import { auth } from "./firebase-config.js";

// Configurações da API
const API_CONFIG = {
  BASE_URL: 'https://sistemag10araquaribackend.onrender.com/api',
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json'
  },
  TIMEOUT: 10000 // 10 segundos
};

/**
 * Função auxiliar para obter o token de autenticação atual
 */
async function getAuthToken() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Usuário não autenticado');
  }
  
  return await currentUser.getIdToken();
}

/**
 * Função auxiliar para fazer requisições autenticadas com timeout
 */
async function fetchWithAuth(url, options = {}) {
  try {
    const token = await getAuthToken();
    
    const headers = {
      ...API_CONFIG.DEFAULT_HEADERS,
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    // Adiciona timeout à requisição
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erro ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`A requisição excedeu o tempo limite de ${API_CONFIG.TIMEOUT/1000} segundos`);
    }
    console.error('Erro na requisição:', error);
    throw error;
  }
}

// API de usuários
export const userApi = {
  /**
   * Obtém os dados do usuário atual
   */
  getCurrentUser: async () => {
    return await fetchWithAuth(`${API_CONFIG.BASE_URL}/users/me`);
  },
  
  /**
   * Atualiza os dados do usuário atual
   */
  updateUser: async (userData) => {
    return await fetchWithAuth(`${API_CONFIG.BASE_URL}/users/me`, {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  }
};

// API de dados
export const dataApi = {
  /**
   * Obtém todos os documentos de uma coleção
   */
  getAll: async (collection) => {
    return await fetchWithAuth(`${API_CONFIG.BASE_URL}/data/${collection}`);
  },
  
  /**
   * Obtém um documento específico
   */
  getOne: async (collection, id) => {
    return await fetchWithAuth(`${API_CONFIG.BASE_URL}/data/${collection}/${id}`);
  },
  
  /**
   * Cria um novo documento
   */
  create: async (collection, data) => {
    return await fetchWithAuth(`${API_CONFIG.BASE_URL}/data/${collection}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * Atualiza um documento existente
   */
  update: async (collection, id, data) => {
    return await fetchWithAuth(`${API_CONFIG.BASE_URL}/data/${collection}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  /**
   * Exclui um documento
   */
  delete: async (collection, id) => {
    return await fetchWithAuth(`${API_CONFIG.BASE_URL}/data/${collection}/${id}`, {
      method: 'DELETE'
    });
  }
};