// src/utils/notifications.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration du handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Enregistrement pour les notifications push
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (!Device.isDevice) {
    console.log('⚠️ Les notifications push nécessitent un vrai appareil');
    return null;
  }
  
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('❌ Permission notifications refusée');
    return null;
  }
  
  try {
    // Récupérer le projectId depuis app.json ou config
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                      Constants.expoConfig?.projectId || 
                      'votre-project-id';
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('✅ Push token obtenu:', token.substring(0, 20) + '...');
    
    // Sauvegarder localement
    await AsyncStorage.setItem('expoPushToken', token);
    
  } catch (error) {
    console.log('❌ Erreur obtention token:', error);
  }
  
  // Configuration Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Défaut',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2ecc71',
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('emergency', {
      name: 'Urgence',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 500, 500],
      lightColor: '#e74c3c',
      sound: 'default',
    });
    
    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Succès',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 100, 200],
      lightColor: '#f39c12',
      sound: 'default',
    });
  }
  
  return token;
}

// Sauvegarder le token sur le backend
export async function savePushTokenToBackend(token) {
  try {
    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    
    if (!user?._id) {
      console.log('⚠️ Utilisateur non connecté, token non sauvegardé');
      return;
    }
    
    const api = (await import('../services/api')).default;
    await api.post('/users/push-token', {
      userId: user._id,
      token: token,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Mobile',
      appVersion: Constants.expoConfig?.version || '1.0.0'
    });
    
    console.log('✅ Token push sauvegardé sur le serveur');
  } catch (error) {
    console.log('❌ Erreur sauvegarde token:', error?.message);
  }
}

// Envoyer notification locale
export async function sendLocalNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null,
    });
    console.log('📱 Notification locale envoyée:', title);
    return true;
  } catch (error) {
    console.log('❌ Erreur notification locale:', error);
    return false;
  }
}

// Planifier une notification future
export async function scheduleNotification(title, body, seconds, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: { seconds },
    });
    console.log(`📅 Notification planifiée dans ${seconds}s:`, title);
    return true;
  } catch (error) {
    console.log('❌ Erreur planification:', error);
    return false;
  }
}

// Annuler toutes les notifications planifiées
export async function cancelAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ Toutes les notifications planifiées annulées');
  } catch (error) {
    console.log('❌ Erreur annulation:', error);
  }
}

// Obtenir le statut des permissions
export async function getNotificationPermissions() {
  try {
    const settings = await Notifications.getPermissionsAsync();
    return {
      granted: settings.granted,
      ios: settings.ios,
      android: settings.android,
    };
  } catch (error) {
    console.log('❌ Erreur permissions:', error);
    return { granted: false };
  }
}