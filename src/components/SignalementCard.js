// components/SignalementCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import VotingButtons from './VotingButtons';
import { useTheme } from '../context/ThemeContext';
import { getStatusStyle, getStatusColor, getStatusLabel, getSeverityStyle, getSeverityColor, getTypeIcon, getTypeLabel, formatDate, formatRelativeDate } from '../theme/helpers';
import { fontSize, spacing, radius, shadow } from '../theme';

// Fonction utilitaire pour la localisation
const getLocationText = (location) => {
  if (!location) return 'Localisation non précisée';
  
  if (typeof location === 'string') return location;
  
  if (typeof location === 'object') {
    return location.address || 
           location.name || 
           (location.latitude && location.longitude 
             ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
             : 'Localisation non précisée');
  }
  
  return 'Localisation non précisée';
};

const SignalementCard = ({ 
  signalement, 
  onPress, 
  showVoting = true,
  showPriority = true 
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // ✅ Statut et priorité via helpers centralisés (theme/helpers.js)
  return (
    <TouchableOpacity 
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Text style={styles.typeIcon}>
            {getTypeIcon(signalement.type)}
          </Text>
          <Text style={styles.userName}>
            {signalement.userName}
          </Text>
        </View>
        <Text style={styles.date}>
          {formatDate(signalement.date)}
        </Text>
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={3}>
        {signalement.description}
      </Text>

      {/* Localisation */}
      <View style={styles.locationContainer}>
        <Text style={styles.locationIcon}>📍</Text>
        <Text style={styles.location}>
          {getLocationText(signalement.localisation)}
        </Text>
      </View>

      {/* Métriques */}
      <View style={styles.metricsContainer}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(signalement.status, colors) }]}>
          <Text style={styles.statusText}>
            {signalement.status.replace('_', ' ')}
          </Text>
        </View>

        {showPriority && (
          <View style={[styles.priorityBadge, { backgroundColor: getSeverityColor(signalement.priorite, colors) }]}>
            <Text style={styles.priorityText}>
              {signalement.priorite}
            </Text>
          </View>
        )}

        {/* Score visible */}
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>
            🏆 {signalement.score || 0}
          </Text>
        </View>
      </View>

      {/* Système de votes */}
      {showVoting && (
        <View style={styles.votingSection}>
          <VotingButtons 
            signalementId={signalement.id}
            compact={true}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: fontSize.xl,
    marginRight: 8,
  },
  userName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  description: {
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: fontSize.sm,
    marginRight: 4,
  },
  location: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  statusText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  priorityText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  scoreBadge: {
    backgroundColor: colors.backgroundAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  scoreText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  votingSection: {
    borderTopWidth: 1,
    borderTopColor: colors.backgroundAlt,
    paddingTop: 12,
  },
});

export default SignalementCard;