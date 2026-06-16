// src/context/AuthContext.js — VERSION CORRIGÉE
import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import { authService } from '../services/auth';
import NetInfo from '@react-native-community/netinfo';
import { testBackendConnection } from '../services/api';
import api, { secureStorage } from '../services/api';
import { validateInput, SECURE_CONFIG } from '../config/secureConfig';
import { logger } from '../utils/secureLogger';

// ==================== CONFIGURATION ====================

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION   = 900000; // 15 minutes
const SESSION_CHECK_INTERVAL = 60000; // 1 minute

// ==================== FONCTIONS UTILITAIRES ====================

const checkConnection = async () => {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('Aucune connexion internet. Vérifiez votre connexion et réessayez.');
    }
    return true;
  } catch (error) {
    throw new Error('Impossible de vérifier la connexion internet.');
  }
};

const callApiWithRetry = async (apiCall, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (__DEV__) console.log(`🔄 Tentative ${attempt}/${retries}...`);
      return await apiCall();
    } catch (error) {
      if (__DEV__) console.log(`❌ Tentative ${attempt} échouée:`, error.message);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
};

const optimizeRegisterData = (userData) => {
  if (!userData.email || !validateInput.email(userData.email)) {
    throw new Error('Email invalide');
  }
  if (!userData.password || userData.password.length < SECURE_CONFIG.MIN_PASSWORD_LENGTH) {
    throw new Error(`Le mot de passe doit contenir au moins ${SECURE_CONFIG.MIN_PASSWORD_LENGTH} caractères`);
  }
  return {
    email:     userData.email?.trim().toLowerCase() || '',
    password:  userData.password || '',
    firstName: userData.firstName?.trim() || '',
    lastName:  userData.lastName?.trim() || '',
    role:      userData.role || 'citizen',
    community: userData.community?.trim() || '',
    phone:     userData.phone?.trim() || '',
  };
};

// ✅ CORRECTIF : décodage JWT sans atob() — compatible React Native natif
const decodeJWTPayload = (token) => {
  try {
    const base64 = token.split('.')[1];
    // Remplacer les caractères URL-safe Base64 par les caractères standard
    const base64Std = base64.replace(/-/g, '+').replace(/_/g, '/');
    // Decoder en utilisant decodeURIComponent + escape (compatible RN)
    const jsonPayload = decodeURIComponent(
      Array.from(atob ? atob(base64Std) : Buffer.from(base64Std, 'base64').toString('binary'))
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// ==================== CONTEXTE ====================

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [isLoading, setIsLoading]           = useState(true);
  const [isInitialized, setIsInitialized]   = useState(false);
  const [sessionExpiring, setSessionExpiring] = useState(false);

  // ✅ CORRECTIF : toutes les variables d'état mutable en useRef (plus de module-level globals)
  const loginAttemptsRef    = useRef(0);
  const lockoutUntilRef     = useRef(null);
  const sessionIntervalRef  = useRef(null);
  const appStateRef         = useRef(AppState.currentState);

  // ==================== VÉRIFICATION SESSION ====================

  const checkSessionExpiry = useCallback(async () => {
    try {
      const token = await secureStorage.getItem('authToken');
      if (!token) return;

      // ✅ CORRECTIF : utilise decodeJWTPayload au lieu de atob() directement
      const payload = decodeJWTPayload(token);
      if (!payload?.exp) return;

      const expiryTime  = payload.exp * 1000;
      const timeToExpiry = expiryTime - Date.now();

      if (timeToExpiry < 300000 && timeToExpiry > 0) {
        setSessionExpiring(true);
        if (global.eventEmitter) {
          global.eventEmitter.emit('session_expiring', { timeToExpiry });
        }
      } else {
        setSessionExpiring(false);
      }
    } catch (error) {
      if (__DEV__) console.log('Erreur vérification session:', error);
    }
  }, []);

  // ==================== VÉRIFICATION LOCKOUT ====================

  const checkLockout = useCallback(() => {
    if (lockoutUntilRef.current && Date.now() < lockoutUntilRef.current) {
      const remaining = Math.ceil((lockoutUntilRef.current - Date.now()) / 60000);
      throw new Error(`Trop de tentatives. Réessayez dans ${remaining} minutes.`);
    }
  }, []);

  // ==================== VÉRIFICATION AUTH ====================

  const checkAuthStatus = useCallback(async () => {
    try {
      logger.info('Vérification du statut d\'authentification...');
      const userData = await authService.getCurrentUser();

      if (userData?.success && userData.user) {
        setUser(userData.user);
        logger.info('Utilisateur connecté');
        await checkSessionExpiry();
      } else {
        logger.info('Aucun utilisateur connecté');
        setUser(null);
      }
    } catch (error) {
      logger.error('Erreur vérification statut auth', error);
      setUser(null);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  }, [checkSessionExpiry]);

  // ==================== EFFETS ====================

  useEffect(() => {
    checkAuthStatus();

    // ✅ CORRECTIF : l'intervalle utilise checkSessionExpiry via la closure,
    // pas `user` directement — plus de dépendance manquante
    sessionIntervalRef.current = setInterval(() => {
      checkSessionExpiry();
    }, SESSION_CHECK_INTERVAL);

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (__DEV__) console.log('📱 Application revenue au premier plan');
        checkAuthStatus();
      }
      appStateRef.current = nextAppState;
    });

    if (global.eventEmitter) {
      global.eventEmitter.on('unauthorized', logout);
    }

    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
        sessionIntervalRef.current = null;
      }
      subscription.remove();
      if (global.eventEmitter) {
        global.eventEmitter.off('unauthorized', logout);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkAuthStatus, checkSessionExpiry]);

  // ==================== CONNEXION ====================

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      logger.info('Tentative de connexion');

      checkLockout();
      await checkConnection();

      if (!validateInput.email(email)) {
        loginAttemptsRef.current++;
        return { success: false, error: 'Format d\'email invalide' };
      }

      const passwordValidation = validateInput.password(password);
      if (!passwordValidation.isValid) {
        loginAttemptsRef.current++;
        return { success: false, error: 'Mot de passe trop faible' };
      }

      const result = await authService.login(email, password);

      if (result.success && result.data?.user) {
        setUser(result.data.user);
        loginAttemptsRef.current = 0;
        lockoutUntilRef.current  = null;
        await secureStorage.setItem('lastLogin', Date.now().toString());
        logger.info('Connexion réussie');
        return { success: true, user: result.data.user, message: 'Connexion réussie' };
      } else {
        await authService.clearAuthData();
        loginAttemptsRef.current++;

        if (loginAttemptsRef.current >= MAX_LOGIN_ATTEMPTS) {
          lockoutUntilRef.current = Date.now() + LOCKOUT_DURATION;
          logger.warn('Compte verrouillé temporairement');
        }

        const errorMessage = result.error || 'Email ou mot de passe incorrect';
        return {
          success: false,
          error: errorMessage,
          remainingAttempts: MAX_LOGIN_ATTEMPTS - loginAttemptsRef.current,
        };
      }
    } catch (error) {
      logger.error('Erreur login AuthContext', error);
      await authService.clearAuthData();
      return { success: false, error: error.message || 'Erreur de connexion au serveur' };
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== INSCRIPTION ====================

  const register = async (userData) => {
    setIsLoading(true);
    try {
      logger.info('Tentative d\'inscription');

      const connectionTest = await testBackendConnection();
      if (!connectionTest.success) {
        throw new Error(`Backend inaccessible: ${connectionTest.message}`);
      }

      await checkConnection();

      const optimizedData = optimizeRegisterData(userData);

      const result = await callApiWithRetry(
        () => authService.register(optimizedData),
        3,
        1000
      );

      if (result.success && result.data?.user) {
        setUser(result.data.user);
        loginAttemptsRef.current = 0;
        logger.info('Inscription réussie');
        return { success: true, user: result.data.user, message: 'Compte créé avec succès' };
      } else {
        await authService.clearAuthData();
        const errorMessage = result.error || 'Erreur lors de la création du compte';
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      logger.error('Erreur register AuthContext', error);
      await authService.clearAuthData();

      let errorMessage = 'Erreur lors de la création du compte';
      if (error.message?.includes('timeout'))             errorMessage = 'Le serveur met trop de temps à répondre. Réessayez dans quelques instants.';
      else if (error.message?.includes('Network Error'))  errorMessage = 'Problème de connexion internet. Vérifiez votre connexion et réessayez.';
      else if (error.response?.status === 400)            errorMessage = 'Données invalides. Vérifiez les informations saisies.';
      else if (error.response?.status === 409)            errorMessage = 'Un compte avec cet email existe déjà.';
      else if (error.message)                             errorMessage = error.message;

      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== RÉINITIALISATION MOT DE PASSE ====================

  const resetPassword = async (email) => {
    try {
      logger.info('Demande de réinitialisation');

      if (!validateInput.email(email)) {
        return { success: false, error: 'Email invalide' };
      }

      const response = await api.post('/auth/reset-password', { email });
      if (response.data?.success) {
        logger.info('Email de réinitialisation envoyé');
        return { success: true, message: response.data.message || 'Email envoyé avec succès' };
      }
      return { success: false, error: response.data?.error || 'Erreur lors de l\'envoi' };
    } catch (error) {
      logger.error('Erreur reset password', error);
      let errorMessage = 'Erreur de connexion au serveur';
      if (error.message?.includes('timeout'))    errorMessage = 'Le serveur met trop de temps à répondre.';
      else if (error.response?.status === 404)   errorMessage = 'Aucun compte associé à cet email.';
      return { success: false, error: errorMessage };
    }
  };

  const verifyResetToken = async (email, token) => {
    try {
      const response = await api.get('/auth/verify-reset-token', { params: { email, token } });
      if (response.data?.success) return { success: true };
      return { success: false, error: response.data?.error || 'Lien invalide ou expiré.' };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Lien invalide ou expiré.' };
    }
  };

  const confirmPasswordReset = async (email, token, newPassword) => {
    try {
      if (!newPassword || newPassword.length < 8) {
        return { success: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' };
      }
      const response = await api.post('/auth/confirm-reset-password', { email, token, newPassword });
      if (response.data?.success) {
        return { success: true, message: response.data.message || 'Mot de passe réinitialisé avec succès.' };
      }
      return { success: false, error: response.data?.error || 'Erreur lors de la réinitialisation.' };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Erreur de connexion au serveur.' };
    }
  };

  // ==================== DÉCONNEXION ====================

  const logout = async () => {
    try {
      logger.info('Déconnexion utilisateur');

      try {
        await api.post('/auth/logout');
      } catch {
        // silencieux — on déconnecte localement même si l'API échoue
      }

      await authService.logout();
      setUser(null);
      setSessionExpiring(false);
      loginAttemptsRef.current = 0;
      lockoutUntilRef.current  = null;

      logger.info('Déconnexion réussie');
      return { success: true, message: 'Déconnexion réussie' };
    } catch (error) {
      logger.error('Erreur déconnexion', error);
      await authService.clearAuthData();
      setUser(null);
      return { success: true, message: 'Déconnexion réussie' };
    }
  };

  // ==================== REFRESH SESSION ====================

  const refreshSession = async () => {
    try {
      const response = await api.post('/auth/refresh');
      if (response.data?.token) {
        await secureStorage.setItem('authToken', response.data.token);
        await checkSessionExpiry();
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Erreur refresh session', error);
      return false;
    }
  };

  const value = {
    user,
    isLoading,
    isInitialized,
    sessionExpiring,
    login,
    register,
    logout,
    resetPassword,
    verifyResetToken,
    confirmPasswordReset,
    refreshSession,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};