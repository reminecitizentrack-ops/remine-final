import { useNotification } from '../context/NotificationContext';

export const useNotificationTester = () => {
  const { 
    sendLocalNotification, 
    notifyNewReport, 
    notifyStatusUpdate,
    notifyEmergencyAlert 
  } = useNotification();

  const testAllNotifications = async () => {
    // Test notification simple
    await sendLocalNotification(
      '🧪 Test de Notification',
      'Ceci est un test des notifications ReMine!',
      { type: 'test' }
    );

    // Test notification de signalement
    const testReport = {
      id: 'test-' + Date.now(),
      type: 'water_pollution',
      localisation: 'Dakar, Test Zone',
      description: 'Signalement de test pour les notifications'
    };
    await notifyNewReport(testReport);

    // Test notification de statut
    await notifyStatusUpdate(
      testReport,
      'nouveau',
      'en_cours'
    );

    // Test alerte urgente
    await notifyEmergencyAlert(testReport);
  };

  return {
    testAllNotifications
  };
};