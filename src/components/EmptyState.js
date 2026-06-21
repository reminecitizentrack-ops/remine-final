// src/components/EmptyState.js
// ─────────────────────────────────────────────────────────────────────────────
// Composant d'état vide réutilisable — remplace les textes gris basiques
// par une illustration engageante avec un appel à l'action.
//
// UTILISATION :
//
//   import EmptyState from '../components/EmptyState';
//
//   // Aucun signalement sur la liste
//   <EmptyState
//     preset="noReports"
//     onAction={() => navigation.navigate('Report')}
//   />
//
//   // Aucun résultat de recherche
//   <EmptyState preset="noResults" />
//
//   // Pas de connexion réseau
//   <EmptyState preset="offline" onAction={retry} />
//
//   // Entièrement personnalisé
//   <EmptyState
//     emoji="📭"
//     title="Boîte vide"
//     subtitle="Vous n'avez reçu aucune notification pour l'instant."
//   />
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = {
  noReports: {
    emoji:        '📋',
    title:        'Aucun signalement pour l\'instant',
    subtitle:     'Soyez le premier à documenter un impact environnemental dans votre zone.',
    actionLabel:  '➕ Créer un signalement',
    actionColor:  '#2563eb',
  },
  myReports: {
    emoji:        '🌱',
    title:        'Vous n\'avez pas encore signalé',
    subtitle:     'Chaque signalement compte. Votre contribution aide à protéger l\'environnement.',
    actionLabel:  '➕ Mon premier signalement',
    actionColor:  '#16a34a',
  },
  noResults: {
    emoji:        '🔍',
    title:        'Aucun résultat',
    subtitle:     'Essayez de modifier vos filtres ou votre recherche.',
    actionLabel:  null,
    actionColor:  null,
  },
  offline: {
    emoji:        '📡',
    title:        'Pas de connexion',
    subtitle:     'Vérifiez votre connexion internet et réessayez.',
    actionLabel:  '🔄 Réessayer',
    actionColor:  '#ea580c',
  },
  noNotifications: {
    emoji:        '🔔',
    title:        'Aucune notification',
    subtitle:     'Vous serez notifié dès qu\'un de vos signalements évolue.',
    actionLabel:  null,
    actionColor:  null,
  },
  noMapReports: {
    emoji:        '🗺️',
    title:        'Aucun signalement sur la carte',
    subtitle:     'Il n\'y a pas encore de signalement dans cette zone. Peut-être que vous pouvez en créer un ?',
    actionLabel:  '📍 Signaler ici',
    actionColor:  '#ea580c',
  },
  error: {
    emoji:        '⚠️',
    title:        'Une erreur est survenue',
    subtitle:     'Les données n\'ont pas pu être chargées. Veuillez réessayer.',
    actionLabel:  '🔄 Réessayer',
    actionColor:  '#ef4444',
  },
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function EmptyState({
  // Preset prédéfini (voir PRESETS ci-dessus)
  preset,
  // Surcharge individuelle
  emoji,
  title,
  subtitle,
  actionLabel,
  actionColor,
  // Callback du bouton d'action
  onAction,
  // Style conteneur
  style,
  // Taille : 'normal' | 'compact'
  size = 'normal',
}) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const config = preset ? PRESETS[preset] || {} : {};

  const resolvedEmoji       = emoji       ?? config.emoji       ?? '📭';
  const resolvedTitle       = title       ?? config.title       ?? 'Rien ici';
  const resolvedSubtitle    = subtitle    ?? config.subtitle    ?? '';
  const resolvedActionLabel = actionLabel ?? config.actionLabel ?? null;
  const resolvedActionColor = actionColor ?? config.actionColor ?? '#16a34a';

  // Animation d'entrée
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue:         1,
        duration:        400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue:         0,
        duration:        400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isCompact = size === 'compact';

  return (
    <Animated.View
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        style,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      {/* Illustration */}
      <View style={[styles.emojiWrapper, isCompact && styles.emojiWrapperCompact]}>
        <Text style={[styles.emoji, isCompact && styles.emojiCompact]}>
          {resolvedEmoji}
        </Text>
      </View>

      {/* Textes */}
      <Text style={[styles.title, isCompact && styles.titleCompact]}>
        {resolvedTitle}
      </Text>

      {!!resolvedSubtitle && (
        <Text style={[styles.subtitle, isCompact && styles.subtitleCompact]}>
          {resolvedSubtitle}
        </Text>
      )}

      {/* Bouton d'action */}
      {resolvedActionLabel && onAction && (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: resolvedActionColor }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={styles.actionButtonText}>{resolvedActionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors) => StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 28,
  },
  containerCompact: {
    paddingVertical: 20,
  },

  emojiWrapper: {
    width:           100,
    height:          100,
    borderRadius:    50,
    backgroundColor: '#f0fdf4',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    20,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    6,
    elevation:       3,
  },
  emojiWrapperCompact: {
    width:        70,
    height:       70,
    borderRadius: 35,
    marginBottom: 12,
  },

  emoji: {
    fontSize: 46,
  },
  emojiCompact: {
    fontSize: 32,
  },

  title: {
    fontSize:   18,
    fontWeight: '700',
    color:      colors.textPrimary,
    textAlign:  'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  titleCompact: {
    fontSize:   15,
    marginBottom: 6,
  },

  subtitle: {
    fontSize:   14,
    color:      colors.textSecondary,
    textAlign:  'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  subtitleCompact: {
    fontSize:     12,
    marginBottom: 16,
  },

  actionButton: {
    paddingHorizontal: 28,
    paddingVertical:   14,
    borderRadius:      14,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 3 },
    shadowOpacity:     0.15,
    shadowRadius:      6,
    elevation:         4,
  },
  actionButtonText: {
    color:      colors.textInverse,
    fontSize:   15,
    fontWeight: '700',
  },
});