// src/hooks/useNetworkStatus.js — VERSION CORRIGÉE
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

// ✅ CORRECTIF : URL importée depuis la config centrale pour éviter la duplication
import { API_BASE_URL } from '../services/api';

const BACKEND_CHECK_TIMEOUT = 5000;  // 5 secondes max pour le health check
const POLL_INTERVAL         = 30000; // vérification toutes les 30 secondes

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected]           = useState(true);
  const [isBackendReachable, setIsBackendReachable] = useState(true);
  const [connectionType, setConnectionType]     = useState(null);
  const [backendStatus, setBackendStatus]       = useState(null);
  const [isChecking, setIsChecking]             = useState(false);
  const [lastCheck, setLastCheck]               = useState(null);

  // ✅ CORRECTIF : isChecking en ref pour éviter la recréation de checkFullConnection
  // à chaque changement d'état (boucle infinie)
  const isCheckingRef = useRef(false);

  // ==================== VÉRIFICATION COMPLÈTE ====================

  const checkFullConnection = useCallback(async () => {
    // Utiliser la ref pour le guard, pas l'état
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      const netState = await NetInfo.fetch();
      const hasInternet = netState.isConnected;
      setIsConnected(hasInternet);
      setConnectionType(netState.type);

      if (!hasInternet) {
        setIsBackendReachable(false);
        setBackendStatus(null);
        setLastCheck(new Date().toISOString());
        return { hasInternet: false, isReachable: false };
      }

      // ✅ CORRECTIF : vraie vérification du backend avec timeout
      let isReachable = false;
      let status = null;

      try {
        const controller = new AbortController();
        const timeoutId  = setTimeout(() => controller.abort(), BACKEND_CHECK_TIMEOUT);

        const response = await fetch(`${API_BASE_URL}/health`, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        isReachable = response.ok;

        if (response.ok) {
          try {
            const data = await response.json();
            status = {
              api:       true,
              database:  data.database ?? true,
              websocket: data.websocket ?? true,
            };
          } catch {
            status = { api: true, database: true, websocket: true };
          }
        }
      } catch {
        // Timeout ou erreur réseau → backend inaccessible
        isReachable = false;
        status = null;
      }

      setIsBackendReachable(isReachable);
      setBackendStatus(status);
      setLastCheck(new Date().toISOString());
      return { hasInternet, isReachable };

    } catch (error) {
      if (__DEV__) console.error('Erreur vérification connexion:', error);
      setIsBackendReachable(false);
      return { hasInternet: false, isReachable: false, error: error.message };
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  // ✅ CORRECTIF : tableau de dépendances vide — checkFullConnection est stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== VÉRIFICATION RAPIDE (réseau seulement) ====================

  const quickCheck = useCallback(async () => {
    try {
      const netState = await NetInfo.fetch();
      return {
        isConnected:       netState.isConnected,
        isBackendReachable: true,
        connectionType:    netState.type,
      };
    } catch (error) {
      return { isConnected: false, isBackendReachable: false, error: error.message };
    }
  }, []);

  // ==================== EFFETS ====================

  useEffect(() => {
    let interval;
    let appStateSub;

    checkFullConnection();

    const unsubNetInfo = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      setConnectionType(state.type);

      if (state.isConnected) {
        checkFullConnection();
      } else {
        setIsBackendReachable(false);
        setBackendStatus(null);
      }
    });

    appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkFullConnection();
      }
    });

    interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        checkFullConnection();
      }
    }, POLL_INTERVAL);

    return () => {
      unsubNetInfo();
      appStateSub.remove();
      clearInterval(interval);
    };
  }, [checkFullConnection]);

  return {
    isConnected,
    isBackendReachable,
    connectionType,
    backendStatus,
    isChecking,
    lastCheck,
    checkFullConnection,
    quickCheck,
  };
};