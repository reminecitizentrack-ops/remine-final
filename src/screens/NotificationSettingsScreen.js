// src/screens/NotificationSettingsScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Switch, TouchableOpacity, Platform
} from 'react-native';
import { useNotification } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';

const NOTIFICATION_TYPES = [
  {
    key: 'statusUpdates',
    emoji: '🔄',
    label: 'Mises à jour de vos signalements',
    description: 'Recevez une notification quand le statut d\'un de vos signalements change.',
  },
  {
    key: 'emergencyAlerts',
    emoji: '🚨',
    label: 'Alertes urgentes',
    description: 'Signalements critiques dans votre zone géographique.',
  },
  {
    key: 'communityAlerts',
    emoji: '👥',
    label: 'Activité communautaire',
    description: 'Nouveaux signalements dans votre région.',
  },
  {
    key: 'newReports',
    emoji: '📤',
    label: 'Confirmation d\'envoi',
    description: 'Confirmation quand votre signalement est bien enregistré.',
  },
  {
    key: 'achievements',
    emoji: '🏆',
    label: 'Badges et récompenses',
    description: 'Quand vous débloquez un nouveau badge ou franchissez un palier.',
  },
];

export default function NotificationSettingsScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const {
    settings,
    updateSettings,
    requestPermissions,
    permissionGranted,
    sendLocalNotification,
  } = useNotification();

  const [testSent, setTestSent] = useState(false);

  const handleToggleGlobal = async (value) => {
    if (value) {
      const granted = await requestPermissions();
      if (granted) await updateSettings('enabled', true);
    } else {
      await updateSettings('enabled', false);
    }
  };

  const handleTest = async () => {
    await sendLocalNotification(
      '🧪 Test réussi !',
      'Les notifications ReMine fonctionnent correctement.',
      { type: 'test' }
    );
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>Gérez vos préférences de notification</Text>
      </View>

      {/* Activation globale */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>🔔 Notifications ReMine</Text>
            <Text style={styles.rowDesc}>
              {settings.enabled
                ? 'Les notifications sont activées'
                : 'Les notifications sont désactivées'}
            </Text>
          </View>
          <Switch
            value={settings.enabled}
            onValueChange={handleToggleGlobal}
            trackColor={{ false: '#d1d5db', true: '#86efac' }}
            thumbColor={settings.enabled ? '#1a7a4a' : '#9ca3af'}
          />
        </View>

        {!permissionGranted && settings.enabled && (
          <View style={styles.permissionWarning}>
            <Text style={styles.permissionWarningText}>
              ⚠️ Les notifications système ne sont pas autorisées. Allez dans les Réglages de votre appareil pour les activer.
            </Text>
          </View>
        )}
      </View>

      {/* Types de notifications */}
      {settings.enabled && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Types de notifications</Text>

          {NOTIFICATION_TYPES.map((item, index) => (
            <View
              key={item.key}
              style={[styles.row, index < NOTIFICATION_TYPES.length - 1 && styles.rowBorder]}
            >
              <View style={styles.rowInfo}>
                <Text style={styles.rowTitle}>{item.emoji} {item.label}</Text>
                <Text style={styles.rowDesc}>{item.description}</Text>
              </View>
              <Switch
                value={settings[item.key] ?? true}
                onValueChange={(val) => updateSettings(item.key, val)}
                trackColor={{ false: '#d1d5db', true: '#86efac' }}
                thumbColor={settings[item.key] ? '#1a7a4a' : '#9ca3af'}
              />
            </View>
          ))}
        </View>
      )}

      {/* Bouton test */}
      {settings.enabled && permissionGranted && (
        <TouchableOpacity
          style={[styles.testButton, testSent && styles.testButtonSent]}
          onPress={handleTest}
          disabled={testSent}
        >
          <Text style={styles.testButtonText}>
            {testSent ? '✅ Notification envoyée !' : '🧪 Envoyer une notification test'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Comment ça fonctionne</Text>
        <Text style={styles.infoText}>
          Les notifications vous permettent de suivre vos signalements en temps réel.
          Vous serez alerté dès qu'une équipe prend en charge votre signalement ou
          le résout. Les alertes urgentes sont envoyées pour les problèmes
          environnementaux critiques près de chez vous.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a7a4a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowInfo: {
    flex: 1,
    marginRight: 16,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 3,
  },
  rowDesc: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  permissionWarning: {
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  permissionWarningText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  testButton: {
    backgroundColor: '#1a7a4a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  testButtonSent: {
    backgroundColor: '#22c55e',
  },
  testButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
});