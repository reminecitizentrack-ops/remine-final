// src/services/api.js — VERSION PRODUCTION RENFORCÉE
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// ==================== CONFIGURATION ====================

const PORT = 5001;

// Configuration de sécurité
const SECURITY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes avant expiration
  MAX_REQUEST_SIZE: 5 * 1024 * 1024, // 5MB
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 60
};

// Détection automatique de l'IP en développement
const getDevApiUrl = () => {
  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (expoHost) {
    return `http://${expoHost}:${PORT}/api`;
  }
  
  // Fallback : IPs courantes
  const fallbackIPs = [
    '192.168.1.16',
    '192.168.1.10',
    '192.168.1.100',
    'localhost'
  ];
  
  for (const ip of fallbackIPs) {
    try {
      return `http://${ip}:${PORT}/api`;
    } catch {}
  }
  
  return `http://localhost:${PORT}/api`;
};

const DEV_API_URL  = getDevApiUrl();

// ✅ CORRECTIF : avertissement explicite si EXPO_PUBLIC_API_URL n'est pas définie en prod
const PROD_API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!__DEV__ && !PROD_API_URL) {
  console.error('⚠️  EXPO_PUBLIC_API_URL non définie — configurez votre fichier .env avant de builder en production.');
}

// ✅ CORRECTIF : export de API_BASE_URL pour useNetworkStatus et d'autres modules
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? DEV_API_URL : 'https://VOTRE-DOMAINE.com/api');

// ✅ CORRECTIF : logs uniquement en développement
if (__DEV__) {
  if (__DEV__) console.log('🌐 API URL:', API_BASE_URL);
  if (__DEV__) console.log('🔐 Mode: Développement');
}

// ==================== STOCKAGE SÉCURISÉ ====================

const secureStorage = {
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
      return true;
    } catch (error) {
      if (__DEV__) console.error('SecureStorage set error:', error);
      return false;
    }
  },
  
  async getItem(key) {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        return await SecureStore.getItemAsync(key);
      }
    } catch (error) {
      if (__DEV__) console.error('SecureStorage get error:', error);
      return null;
    }
  },
  
  async deleteItem(key) {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      return true;
    } catch (error) {
      if (__DEV__) console.error('SecureStorage delete error:', error);
      return false;
    }
  }
};

// ==================== RATE LIMITING ====================

class RateLimiter {
  constructor() {
    this.requests = new Map();
  }
  
  canRequest(endpoint) {
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
    
    if (!this.requests.has(endpoint)) {
      this.requests.set(endpoint, []);
    }
    
    const requests = this.requests.get(endpoint).filter(time => time > windowStart);
    
    if (requests.length >= SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
      return false;
    }
    
    requests.push(now);
    this.requests.set(endpoint, requests);
    return true;
  }
  
  reset() {
    this.requests.clear();
  }
}

const rateLimiter = new RateLimiter();

// ==================== INSTANCE AXIOS ====================

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': `ReMine-Mobile-App/1.0.0 (${Platform.OS})`,
    'X-App-Version': Constants.expoConfig?.version || '1.0.0',
    'X-Platform': Platform.OS,
    'X-Platform-Version': Platform.Version,
    'ngrok-skip-browser-warning': 'true'
  },
  maxContentLength: SECURITY_CONFIG.MAX_REQUEST_SIZE,
  maxBodyLength: SECURITY_CONFIG.MAX_REQUEST_SIZE
});

// ==================== GESTION DU TOKEN ====================

let tokenRefreshPromise = null;

const refreshToken = async () => {
  try {
    const refreshToken = await secureStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token');
    }
    
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken
    }, {
      timeout: 10000
    });
    
    if (response.data?.token) {
      await secureStorage.setItem('authToken', response.data.token);
      if (response.data.refreshToken) {
        await secureStorage.setItem('refreshToken', response.data.refreshToken);
      }
      return response.data.token;
    }
    
    throw new Error('Invalid refresh response');
  } catch (error) {
    // Nettoyage complet en cas d'échec
    await secureStorage.deleteItem('authToken');
    await secureStorage.deleteItem('refreshToken');
    await AsyncStorage.removeItem('userData');
    throw error;
  }
};

// ==================== INTERCEPTEUR REQUÊTES ====================

api.interceptors.request.use(
  async (config) => {
    // Rate limiting
    if (!rateLimiter.canRequest(config.url || config.baseURL)) {
      const error = new Error('Trop de requêtes. Veuillez patienter.');
      error.status = 429;
      error.isRateLimit = true;
      return Promise.reject(error);
    }
    
    try {
      // Utiliser SecureStore pour le token
      const token = await secureStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Ajouter un timestamp anti-replay
      config.headers['X-Timestamp'] = Date.now();
      
      // Ajouter un nonce (nombre aléatoire) pour éviter les attaques par rejeu
      config.headers['X-Nonce'] = Math.random().toString(36).substring(2, 15);
      
      if (__DEV__) {
        if (__DEV__) console.log(`🌐 [REQUEST] ${config.method?.toUpperCase()} ${config.url}`);
        // ✅ Ne jamais logguer les headers en prod (tokens exposés)
      }
    } catch (error) {
      if (__DEV__) console.log('❌ Erreur intercepteur requête:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==================== INTERCEPTEUR RÉPONSES ====================

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      if (__DEV__) console.log(`✅ [RESPONSE] ${response.status} ${response.config.url}`);
    }
    
    // Vérifier si le token doit être rafraîchi
    const tokenExpiry = response.headers['x-token-expiry'];
    if (tokenExpiry) {
      const timeToExpiry = parseInt(tokenExpiry) - Date.now();
      if (timeToExpiry > 0 && timeToExpiry < SECURITY_CONFIG.TOKEN_REFRESH_THRESHOLD) {
        // Rafraîchir le token en arrière-plan
        refreshToken().catch((e) => { if (__DEV__) console.error('Refresh token error:', e); });
      }
    }
    
    return response;
  },
  async (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.error || error.response?.data?.message || error.message;
    const originalRequest = error.config;

    // Token expiré → tentative de rafraîchissement
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        if (!tokenRefreshPromise) {
          tokenRefreshPromise = refreshToken();
        }
        
        const newToken = await tokenRefreshPromise;
        tokenRefreshPromise = null;
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        tokenRefreshPromise = null;
        if (__DEV__) console.log('🔐 Refresh token failed:', refreshError);
        
        // Déconnexion automatique
        await secureStorage.deleteItem('authToken');
        await secureStorage.deleteItem('refreshToken');
        await AsyncStorage.removeItem('userData');
        
        // Émettre un événement de déconnexion
        if (typeof global !== 'undefined' && global.eventEmitter) {
          global.eventEmitter.emit('unauthorized');
        }
      }
    }

    // Gestion des erreurs de rate limiting
    if (status === 429) {
      const retryAfter = error.response?.headers?.['retry-after'] || 60;
      const waitError = new Error(`Trop de requêtes. Réessayez dans ${retryAfter} secondes.`);
      waitError.status = 429;
      waitError.retryAfter = retryAfter;
      return Promise.reject(waitError);
    }

    // Messages utilisateur personnalisés
    const userMessages = {
      400: 'Requête invalide. Vérifiez les données saisies.',
      401: 'Session expirée, veuillez vous reconnecter',
      403: 'Accès non autorisé. Vous ne disposez pas des droits nécessaires.',
      404: 'Ressource non disponible',
      409: 'Conflit avec les données existantes',
      422: 'Données invalides. Vérifiez votre saisie.',
      429: 'Trop de requêtes. Veuillez patienter.',
      500: 'Erreur serveur, veuillez réessayer plus tard',
      502: 'Service temporairement indisponible',
      503: 'Service en maintenance'
    };

    const enhancedError = new Error(userMessages[status] || message || 'Erreur de connexion réseau');
    enhancedError.status = status;
    enhancedError.isApiError = true;
    enhancedError.originalError = message;
    enhancedError.details = {
      url: error.config?.url,
      status,
      message,
      timestamp: new Date().toISOString()
    };

    if (__DEV__) {
      if (__DEV__) console.error(`❌ [API ERROR] ${status || 'NETWORK'} ${error.config?.url}`);
      if (__DEV__) console.error('Details:', enhancedError.details);
    }

    return Promise.reject(enhancedError);
  }
);

// ==================== FONCTIONS UTILITAIRES ====================

// Test de connexion avec retry
export const testBackendConnection = async (retries = 2) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const start = Date.now();
      const response = await api.get('/health', { timeout: 45000 });
      
      return {
        success: true,
        status: response.status,
        responseTime: Date.now() - start,
        message: `Backend accessible (${Date.now() - start}ms)`,
        url: API_BASE_URL,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message,
    message: `Backend inaccessible: ${lastError?.message || 'Erreur inconnue'}`,
    url: API_BASE_URL,
    timestamp: new Date().toISOString()
  };
};

// Fonction pour réinitialiser l'état API (utile pour les tests)
export const resetApiState = () => {
  rateLimiter.reset();
  tokenRefreshPromise = null;
};

// Fonction pour vérifier la santé détaillée du backend
export const getBackendStatus = async () => {
  try {
    const results = await Promise.allSettled([
      api.get('/health'),
      api.get('/health/db'),
      api.get('/health/ws')
    ]);
    
    return {
      api: results[0].status === 'fulfilled',
      database: results[1].status === 'fulfilled',
      websocket: results[2].status === 'fulfilled',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      api: false,
      database: false,
      websocket: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

// Nettoyage des événements globaux
if (typeof global !== 'undefined') {
  global.cleanupApi = () => {
    rateLimiter.reset();
    tokenRefreshPromise = null;
  };
}

export { secureStorage };
export default api;