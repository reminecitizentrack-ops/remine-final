// components/VotingButtons.js
import React, { useState, useCallback, memo, useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  Animated,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSignalement } from '../context/SignalementContext';
import api from '../services/api';
import { fontSize, spacing, radius, shadow } from '../theme';

const VotingButtons = memo(({ 
  signalementId, 
  compact = false, 
  showCounts = true,
  onVote,
  disabled = false
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { addVote, getUserVote, getSignalementById } = useSignalement();
  
  const [isLoading, setIsLoading] = useState(false);
  const [localVote, setLocalVote] = useState(null);
  
  // ✅ CORRECTIF : plus de console.log en dehors de __DEV__
  const signalement = getSignalementById(signalementId);
  const userVote    = getUserVote(signalementId, user?.id);

  // Utiliser le vote local si disponible, sinon le vote de la base
  const currentVote = localVote !== null ? localVote : userVote;
  
  const score = signalement?.score || 0;
  const voteCount = signalement?.voteCount || 0;
  
  // Animations
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  const handleVote = async (voteType) => {
    if (__DEV__) console.log('🎯 handleVote:', { voteType, signalementId });

    if (!user) {
      Alert.alert('Connexion requise', 'Veuillez vous connecter pour voter', [{ text: 'OK' }]);
      return;
    }

    if (disabled || isLoading) return;

    // ✅ CORRECTIF : vote annulable — re-cliquer sur le même type retire le vote
    const isSameVote = currentVote?.voteType === voteType;
    setIsLoading(true);
    setLocalVote(isSameVote ? null : { voteType, userId: user.id });

    try {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1,   duration: 150, useNativeDriver: true }),
      ]).start();

      const reportId = signalement?._id || signalement?.id || signalementId;
      const response = await api.post(`/reports/${reportId}/vote`, { voteType });

      if (response.data?.success) {
        await addVote(signalementId, user.id, voteType);
        if (onVote) onVote(voteType);
      } else {
        throw new Error('Échec vote');
      }
    } catch (apiErr) {
      if (__DEV__) console.log('Fallback vote local:', apiErr.message);
      const success = await addVote(signalementId, user.id, voteType);
      if (success) {
        if (onVote) onVote(voteType);
      } else {
        setLocalVote(null);
        Alert.alert('Erreur', 'Impossible d\'enregistrer votre vote', [{ text: 'OK' }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = () => {
  const { colors } = useTheme();
    if (score > 0) return '#27ae60';
    if (score < 0) return '#e74c3c';
    return '#7f8c8d';
  };

  // Version compacte
  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity 
          style={[
            styles.compactButton,
            currentVote?.voteType === 'up' && styles.votedCompact
          ]}
          onPress={() => handleVote('up')}
          disabled={isLoading}
        >
          <Text style={styles.compactButtonText}>👍</Text>
        </TouchableOpacity>
        
        <Text style={[styles.compactScore, { color: getScoreColor() }]}>
          {score}
        </Text>
        
        <TouchableOpacity 
          style={[
            styles.compactButton,
            currentVote?.voteType === 'down' && styles.votedCompact
          ]}
          onPress={() => handleVote('down')}
          disabled={isLoading}
        >
          <Text style={styles.compactButtonText}>👎</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Version normale
  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceAlt }]}>
      <TouchableOpacity 
        style={[
          styles.button,
          styles.upvote,
          currentVote?.voteType === 'up' && styles.votedUp
        ]}
        onPress={() => handleVote('up')}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>👍</Text>
        {currentVote?.voteType === 'up' && (
          <Text style={styles.voteIndicator}>✓</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color: getScoreColor() }]}>
          {score}
        </Text>
        {showCounts && voteCount > 0 && (
          <Text style={[styles.voteCount, { color: colors.textMuted }]}>{voteCount} vote{voteCount > 1 ? 's' : ''}</Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.button,
          styles.downvote,
          currentVote?.voteType === 'down' && styles.votedDown
        ]}
        onPress={() => handleVote('down')}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>👎</Text>
        {currentVote?.voteType === 'down' && (
          <Text style={styles.voteIndicator}>✓</Text>
        )}
      </TouchableOpacity>
    </View>
  );
});

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 25,
    padding: 12,
    marginVertical: 8,
  },
  button: {
    padding: 12,
    borderRadius: radius.xl,
    backgroundColor: 'transparent',
    minWidth: 50,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.surfaceAlt,
  },
  upvote: {
    marginRight: 15,
  },
  downvote: {
    marginLeft: 15,
  },
  votedUp: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  votedDown: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  buttonText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  voteIndicator: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 2,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 60,
  },
  score: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  voteCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 15,
    padding: 6,
  },
  compactButton: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    minWidth: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  votedCompact: {
    backgroundColor: colors.blue,
  },
  compactButtonText: {
    fontSize: fontSize.md,
  },
  compactScore: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    minWidth: 25,
    textAlign: 'center',
  },
});

export default VotingButtons;