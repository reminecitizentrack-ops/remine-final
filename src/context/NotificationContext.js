// src/context/NotificationContext.js
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { wsService } from '../services/websocket';
import api from '../services/api';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const SETTINGS_KEY = 'remine_notification_settings';
const DEFAULT_SETTINGS = {
  enabled: true, newReports: true, statusUpdates: true,
  communityAlerts: false, emergencyAlerts: true, achievements: true,
};

const STATUS_LABELS = {
  new: 'Nouveau', verified: 'Verifie', in_progress: 'En cours',
  resolved: 'Resolu', rejected: 'Rejete',
};

const TYPE_LABELS = {
  water_pollution: 'Pollution eau', dust: 'Poussieres',
  abandoned_site: 'Site abandonne', waste_deposit: 'Dechets',
  air_pollution: 'Pollution air', soil_contamination: 'Sol contamine',
  noise_pollution: 'Bruit', other: 'Autre',
};

export const NotificationProvider = ({ children }) => {
  const [settings, setSettings]                   = useState(DEFAULT_SETTINGS);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [lastNotification, setLastNotification]   = useState(null);
  const notificationListener = useRef();
  const responseListener     = useRef();

  useEffect(() => {
    loadSettings();
    setupListeners();
    initWebSocket();
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      wsService.disconnect();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {}
  };

  const saveSettings = async (s) => {
    try { await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {}
  };

  const updateSettings = async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    await saveSettings(updated);
  };

  const setupListeners = () => {
    notificationListener.current = Notifications.addNotificationReceivedListener(n => {
      setLastNotification(n);
    });
    responseListener.current = Notifications.addNotificationResponseReceivedListener(r => {
      console.log('Notification tapee:', r.notification.request.content.data?.type);
    });
  };

  const initWebSocket = async () => {
    try {
      const raw = await AsyncStorage.getItem('userData');
      const user = raw ? JSON.parse(raw) : null;
      const userId = user?._id || user?.id;
      if (!userId) return;

      wsService.connect(userId);

      // Changement de statut
      wsService.on('status_update', async (data) => {
        if (!settings.statusUpdates) return;
        const label = STATUS_LABELS[data.newStatus] || data.newStatus;
        const type  = TYPE_LABELS[data.type] || 'Signalement';
        await send('Statut mis a jour', type + ' : ' + label, { type: 'status_update', ...data });
      });

      // Note ajoutee par un agent
      wsService.on('note_added', async (data) => {
        if (!settings.statusUpdates) return;
        await send('Message de votre agent', (data.addedBy || 'Un agent') + ' a ajoute une note sur votre signalement.', { type: 'note_added', ...data });
      });

      // Signalement assigne a un agent
      wsService.on('report_assigned', async (data) => {
        if (!settings.statusUpdates) return;
        await send('Signalement pris en charge', 'Votre signalement a ete assigne a ' + (data.agent || 'un agent') + '.', { type: 'report_assigned', ...data });
      });

      // Signalement verifie
      wsService.on('report_verified', async (data) => {
        if (!settings.statusUpdates) return;
        await send('Signalement verifie', 'Votre signalement a ete verifie et confirme par notre equipe.', { type: 'report_verified', ...data });
      });

      // Signalement resolu
      wsService.on('report_resolved', async (data) => {
        if (!settings.statusUpdates) return;
        const type = TYPE_LABELS[data.type] || 'Signalement';
        await send('Probleme resolu !', 'Votre signalement "' + type + '" a ete resolu. Merci pour votre contribution !', { type: 'report_resolved', ...data });
      });

      // Nouveau signalement critique dans la zone
      wsService.on('new-report', async (msg) => {
        const report = msg?.data || msg;
        if (report?.severity === 'critical' && settings.emergencyAlerts) {
          await notifyEmergencyAlert(report);
        }
      });
    } catch (e) {
      console.log('WS init error:', e.message);
    }
  };

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('remine', {
          name: 'ReMine Alertes',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#1a7a4a',
          sound: 'default',
        });
      }
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      const granted = final === 'granted';
      setPermissionGranted(granted);

      // ✅ Enregistrer le token Expo Push sur le serveur
      if (granted) {
        await registerPushToken();
      }

      return granted;
    } catch { return false; }
  };

  // ✅ NOUVEAU — Obtenir et enregistrer le token Expo Push sur le serveur
  const registerPushToken = async () => {
    try {
      // Seuls les vrais appareils physiques peuvent recevoir des push notifications
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications non disponibles sur simulateur');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '13e5fcd3-cd7e-45e7-9cd7-96741e02a994', // ← remplace par ton Expo project ID si différent
      });
      const expoPushToken = tokenData.data;
      console.log('📲 Expo Push Token:', expoPushToken);

      // Enregistrer sur le serveur
      await api.post('/users/push-token', {
        token:      expoPushToken,
        platform:   Platform.OS,
        deviceName: Device.deviceName || 'Unknown',
        appVersion: '1.0.0',
      });

      // Sauvegarder localement pour référence
      await AsyncStorage.setItem('expoPushToken', expoPushToken);
      console.log('✅ Token push enregistré sur le serveur');

    } catch (e) {
      console.log('⚠️ Erreur enregistrement token push:', e.message);
    }
  };

  const send = async (title, body, data = {}) => {
    if (!settings.enabled) return;
    if (!permissionGranted) {
      const ok = await requestPermissions();
      if (!ok) return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data, sound: true },
        trigger: null,
      });
    } catch (e) { console.log('Notif error:', e.message); }
  };

  const notifyReportCreated = async (report) => {
    if (!settings.newReports) return;
    await send('Signalement envoye',
      `Votre signalement "${TYPE_LABELS[report.type] || 'Signalement'}" a ete enregistre.`,
      { type: 'report_created', reportId: report._id || report.id });
  };

  const notifyStatusUpdate = async (report, newStatus) => {
    if (!settings.statusUpdates) return;
    await send('Statut mis a jour',
      `Votre signalement "${TYPE_LABELS[report.type] || 'Signalement'}" est maintenant : ${STATUS_LABELS[newStatus] || newStatus}`,
      { type: 'status_update', reportId: report._id || report.id, newStatus });
  };

  const notifyEmergencyAlert = async (report) => {
    if (!settings.emergencyAlerts) return;
    await send('Alerte urgente',
      `Signalement critique : ${report.location?.address || 'localisation inconnue'}`,
      { type: 'emergency', reportId: report._id || report.id });
  };

  const notifyCommunityAlert = async (region, count) => {
    if (!settings.communityAlerts) return;
    await send('Activite dans votre region',
      `${count} nouveau signalement(s) a ${region}`,
      { type: 'community', region });
  };

  const notifyAchievement = async (title, message) => {
    if (!settings.achievements) return;
    await send(title, message, { type: 'achievement' });
  };

  const notifyWelcome = async (firstName) => {
    await send(`Bienvenue ${firstName || ''} !`,
      'Merci de rejoindre ReMine.',
      { type: 'welcome' });
  };

  const value = {
    settings, permissionGranted, lastNotification, updateSettings,
    requestPermissions, registerPushToken, notifyReportCreated, notifyStatusUpdate,
    notifyEmergencyAlert, notifyCommunityAlert, notifyAchievement,
    notifyWelcome, sendLocalNotification: send,
    notificationsEnabled: settings.enabled,
    enableNotifications: async () => { await updateSettings('enabled', true); return requestPermissions(); },
    disableNotifications: () => updateSettings('enabled', false),
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};