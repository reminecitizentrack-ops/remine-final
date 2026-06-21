// src/components/NetworkChecker.js — VERSION CORRIGÉE
import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet,
  TouchableOpacity, ActivityIndicator, Platform
} from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useTheme } from '../context/ThemeContext';

// ✅ CORRECTIF : utilise useNetworkStatus au lieu d'une simulation hardcodée
export const NetworkChecker = ({ children, requiredForActions = true }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const {
    isConnected,
    isBackendReachable,
    isChecking,
    checkFullConnection,
  } = useNetworkStatus();

  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const offline = !isConnected || !isBackendReachable;
    setModalVisible(offline && requiredForActions);
  }, [isConnected, isBackendReachable, requiredForActions]);

  const handleRetry = async () => {
    await checkFullConnection();
  };

  // ── Bannière non-bloquante ───────────────────────────────────────────────
  if (!requiredForActions && (!isConnected || !isBackendReachable)) {
    return (
      <View style={styles.overlayContainer}>
        <View style={styles.warningBanner}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            {!isConnected ? 'Connexion internet requise' : 'Connexion au serveur perdue'}
          </Text>
          <TouchableOpacity onPress={handleRetry} style={styles.miniRetry} disabled={isChecking}>
            {isChecking
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.miniRetryText}>⟳</Text>
            }
          </TouchableOpacity>
        </View>
        {children}
      </View>
    );
  }

  // ── Modal bloquant ───────────────────────────────────────────────────────
  return (
    <>
      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>
              {!isConnected ? '📡' : '🔧'}
            </Text>
            <Text style={styles.modalTitle}>
              {!isConnected ? 'Pas de connexion internet' : 'Serveur inaccessible'}
            </Text>
            <Text style={styles.modalMessage}>
              {!isConnected
                ? 'Vérifiez votre connexion Wi-Fi ou données mobiles pour continuer.'
                : 'Impossible de contacter le serveur. Veuillez réessayer dans quelques instants.'}
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleRetry}
              disabled={isChecking}
            >
              {isChecking
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.modalButtonText}>⟳ Réessayer</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {children}
    </>
  );
};

const createStyles = (colors) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.textInverse,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 8 },
    }),
  },
  modalIcon:        { fontSize: 56, marginBottom: 16 },
  modalTitle:       { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  modalMessage:     { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalButton:      { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center' },
  modalButtonText:  { color: colors.textInverse, fontWeight: '600', fontSize: 16 },
  overlayContainer: { flex: 1 },
  warningBanner:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerLight, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.dangerLight },
  warningIcon:      { fontSize: 18, marginRight: 10 },
  warningText:      { flex: 1, fontSize: 13, color: colors.danger },
  miniRetry:        { padding: 6, backgroundColor: colors.danger, borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  miniRetryText:    { color: colors.textInverse, fontWeight: 'bold', fontSize: 16 },
});