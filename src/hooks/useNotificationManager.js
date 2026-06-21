// src/hooks/useNotificationManager.js
import { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

/**
 * Hook principal — initialise les permissions au premier lancement.
 * À utiliser dans le composant racine de l'app (App.js ou Navigator).
 */
export const useNotificationManager = () => {
  const { requestPermissions } = useNotification();

  useEffect(() => {
    requestPermissions();
  }, []);
};

/**
 * Hook pour déclencher des notifications liées aux actions utilisateur.
 * À utiliser dans les écrans qui créent ou modifient des signalements.
 */
export const useNotificationActions = () => {
  const {
    notifyReportCreated,
    notifyStatusUpdate,
    notifyAchievement,
    notifyWelcome,
    sendLocalNotification,
  } = useNotification();

  /**
   * Appeler après la création réussie d'un signalement.
   * @param {Object} report - Le signalement créé
   */
  const onReportCreated = async (report) => {
    await notifyReportCreated(report);
  };

  /**
   * Appeler quand le statut d'un signalement change.
   * @param {Object} report - Le signalement mis à jour
   * @param {string} newStatus - Le nouveau statut (ex: 'in_progress', 'resolved')
   */
  const onStatusChanged = async (report, newStatus) => {
    await notifyStatusUpdate(report, newStatus);
  };

  /**
   * Appeler quand l'utilisateur débloque un badge.
   * @param {string} badgeName - Nom du badge
   * @param {string} message - Message de félicitations
   */
  const onAchievementUnlocked = async (badgeName, message) => {
    await notifyAchievement(badgeName, message);
  };

  /**
   * Appeler à la première connexion de l'utilisateur.
   * @param {string} firstName - Prénom de l'utilisateur
   */
  const onWelcome = async (firstName) => {
    await notifyWelcome(firstName);
  };

  return {
    onReportCreated,
    onStatusChanged,
    onAchievementUnlocked,
    onWelcome,
  };
};