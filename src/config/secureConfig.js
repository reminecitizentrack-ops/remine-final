// src/config/secureConfig.js
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Configuration sécurisée
export const SECURE_CONFIG = {
  // Timeouts
  API_TIMEOUT: 30000,
  SESSION_TIMEOUT: 3600000, // 1 heure
  TOKEN_REFRESH_INTERVAL: 300000, // 5 minutes
  
  // Limites
  MAX_RETRY_ATTEMPTS: 3,
  MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_REPORT_IMAGES: 5,
  
  // Sécurité
  MIN_PASSWORD_LENGTH: 8,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 900000, // 15 minutes
};

// Gestion sécurisée du stockage
export const secureStorage = {
  async setItem(key, value) {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
      return true;
    } catch (error) {
      console.error('SecureStorage set error:', error);
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
      console.error('SecureStorage get error:', error);
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
      console.error('SecureStorage delete error:', error);
      return false;
    }
  },
  
  async clearAll() {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
      } else {
        // Liste des clés à supprimer
        const keys = ['userData', 'authToken', 'refreshToken', 'appSettings'];
        for (const key of keys) {
          await SecureStore.deleteItemAsync(key);
        }
      }
      return true;
    } catch (error) {
      console.error('SecureStorage clear error:', error);
      return false;
    }
  }
};

// Validation des entrées
export const validateInput = {
  email(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  password(password) {
    const hasMinLength = password.length >= SECURE_CONFIG.MIN_PASSWORD_LENGTH;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return {
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumbers,
      details: { hasMinLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar }
    };
  },
  
  phone(phone) {
    const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,6}[-\s\.]?[0-9]{1,6}$/;
    return phoneRegex.test(phone);
  },
  
  sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>]/g, '') // Éviter les injections HTML
      .substring(0, 1000); // Limiter la longueur
  }
};

// Gestion des erreurs sécurisée
export class SecureErrorHandler {
  static handle(error, context = '') {
    // Ne jamais exposer les détails internes en production
    if (__DEV__) {
      console.error(`[${context}]`, error);
      return error.message;
    }
    
    // Messages génériques pour l'utilisateur
    if (error.response?.status === 401) {
      return 'Session expirée. Veuillez vous reconnecter.';
    }
    if (error.response?.status === 403) {
      return 'Accès non autorisé.';
    }
    if (error.response?.status === 429) {
      return 'Trop de tentatives. Veuillez réessayer plus tard.';
    }
    if (error.code === 'ECONNABORTED') {
      return 'La requête a expiré. Vérifiez votre connexion.';
    }
    
    return 'Une erreur est survenue. Veuillez réessayer.';
  }
}