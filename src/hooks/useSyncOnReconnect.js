// src/hooks/useSyncOnReconnect.js
// ─────────────────────────────────────────────────────────────────────────────
// Hook qui surveille la connexion réseau et déclenche automatiquement
// la synchronisation des signalements hors-ligne quand le réseau revient.
//
// UTILISATION dans App.js (dans AppNavigator) :
//
//   import { useSyncOnReconnect } from './src/hooks/useSyncOnReconnect';
//
//   function AppNavigator() {
//     const { user } = useAuth();
//     useSyncOnReconnect(user);   // ← ajouter cette ligne
//     ...
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import reportService from '../services/reports';

export function useSyncOnReconnect(user) {
  const wasOffline     = useRef(false);
  const isSyncing      = useRef(false);
  const appState       = useRef(AppState.currentState);

  const sync = useCallback(async (reason) => {
    if (!user || isSyncing.current) return;
    const pending = reportService.getPendingCount();
    if (pending === 0) return;

    isSyncing.current = true;
    if (__DEV__) console.log(`🔄 [useSyncOnReconnect] Déclenchement sync (${reason}) — ${pending} en attente`);

    const result = await reportService.syncPendingReports(user);
    isSyncing.current = false;

    if (__DEV__ && result.synced > 0) {
      console.log(`✅ [useSyncOnReconnect] ${result.synced} signalement(s) synchronisé(s)`);
    }
  }, [user]);

  // ── Surveiller le réseau ──────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;
      if (wasOffline.current && isConnected) {
        if (__DEV__) console.log('📶 [useSyncOnReconnect] Réseau rétabli — sync déclenchée');
        sync('reconnexion réseau');
      }
      wasOffline.current = !isConnected;
    });
    return () => unsubscribe();
  }, [sync]);

  // ── Surveiller le retour au premier plan ─────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (__DEV__) console.log('📲 [useSyncOnReconnect] App revenue au premier plan — vérification sync');
        sync('retour premier plan');
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [sync]);

  // ── Sync au démarrage (si signalements en attente) ────────────────────────
  // ✅ CORRECTIF : cleanup du timer pour éviter la fuite mémoire si le composant
  // se démonte avant les 3 secondes
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => sync('démarrage'), 3000);
    return () => clearTimeout(timer);
  }, [user, sync]);
}