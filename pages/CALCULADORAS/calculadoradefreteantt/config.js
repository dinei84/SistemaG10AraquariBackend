// Configurações da aplicação
export const CONFIG = {
    // Google Maps API
    GOOGLE_MAPS_API_KEY: 'AIzaSyA1eBHc0R3LEhm64qv9skwmYBMKXbi_Puw', // Chave do projeto
    GOOGLE_MAPS_BASE_URL: 'https://maps.googleapis.com/maps/api/distancematrix/json',
    
    // Tabelas ANTT (Portaria SUROC Nº 12/2024) - Carga Geral
    ANTT_TABLES: {
        '6': {
            ccd: 6.7301, // R$/km - Coeficiente de deslocamento
            cc: 660.12, // R$ - Coeficiente de carga/descarga
            maxWeight: 32, // toneladas
            operation: 'Tabela A - Carga Lotação',
            description: 'Veículo de 6 eixos'
        },
        '7': {
            ccd: 7.3085, // R$/km
            cc: 752.64, // R$
            maxWeight: 37, // toneladas
            operation: 'Tabela A - Carga Lotação',
            description: 'Veículo de 7 eixos'
        },
        '9': {
            ccd: 8.2680, // R$/km
            cc: 815.30, // R$
            maxWeight: 49, // toneladas
            operation: 'Tabela A - Carga Lotação',
            description: 'Veículo de 9 eixos'
        }
    },
    
    // Configurações de validação
    VALIDATION: {
        MIN_DISTANCE: 1,
        MAX_DISTANCE: 10000,
        MIN_ICMS: 0,
        MAX_ICMS: 100,
        MIN_MARGIN: 0,
        MAX_MARGIN: 100
    },
    
    // Configurações de UI
    UI: {
        ANIMATION_DURATION: 300,
        LOADING_TIMEOUT: 30000, // 30 segundos
        MAX_RESULTS: 50
    }
};

// Funções utilitárias
export const UTILS = {
    // Formatação de moeda
    formatCurrency: (value) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    },
    
    // Formatação de número
    formatNumber: (value, decimals = 2) => {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value);
    },
    
    // Validação de email
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Validação de número
    isValidNumber: (value, min = 0, max = Infinity) => {
        const num = parseFloat(value);
        return !isNaN(num) && num >= min && num <= max;
    },
    
    // Debounce para otimizar chamadas de API
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Gerar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Calcular distância entre coordenadas (fórmula de Haversine)
    calculateDistance: (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Raio da Terra em km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
};

// Constantes de erro
export const ERROR_MESSAGES = {
    REQUIRED_FIELD: 'Este campo é obrigatório',
    INVALID_EMAIL: 'Email inválido',
    INVALID_NUMBER: 'Número inválido',
    MIN_VALUE: (min) => `Valor mínimo: ${min}`,
    MAX_VALUE: (max) => `Valor máximo: ${max}`,
    NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
    API_ERROR: 'Erro na API. Tente novamente.',
    INVALID_ROUTE: 'Rota inválida. Verifique origem e destino.',
    CALCULATION_ERROR: 'Erro no cálculo. Verifique os dados.'
};

// Constantes de sucesso
export const SUCCESS_MESSAGES = {
    CALCULATION_SUCCESS: 'Cálculo realizado com sucesso!',
    ROUTE_SUCCESS: 'Rota calculada com sucesso!',
    DATA_SAVED: 'Dados salvos com sucesso!',
    RESULTS_CLEARED: 'Resultados limpos com sucesso!'
};
