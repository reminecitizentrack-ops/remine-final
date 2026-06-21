// src/components/ConnectionStatus.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const ConnectionStatus = ({ 
  onRetry, 
  showDetails = false,
  autoHide = false,
  autoHideDelay = 5000
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [isConnected, setIsConnected] = React.useState(true);
  const [isBackendReachable, setIsBackendReachable] = React.useState(true);
  const [isChecking, setIsChecking] = React.useState(false);
  const [slideAnim] = React.useState(new Animated.Value(-100));
  const autoHideTimer = useRef(null);

  // Simuler la vérification de connexion (à remplacer par votre vraie logique)
  React.useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true);
      try {
        // Simulation - à remplacer par votre vraie vérification
        setIsConnected(true);
        setIsBackendReachable(true);
      } catch (error) {
        setIsBackendReachable(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkConnection();
  }, []);

  useEffect(() => {
    const shouldShow = !isConnected || !isBackendReachable;
    
    if (shouldShow) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
      
      if (autoHide && autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
        autoHideTimer.current = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true
          }).start();
        }, autoHideDelay);
      }
    } else {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
    
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, [isConnected, isBackendReachable, autoHide, autoHideDelay, slideAnim]);

  if (isConnected && isBackendReachable) {
    return null;
  }

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    }
  };

  const getStatusMessage = () => {
    if (!isConnected) {
      return {
        title: '📡 Pas de connexion internet',
        message: 'Vérifiez votre connexion Wi-Fi ou données mobiles',
        icon: '📡',
        color: colors.danger,
        bgColor: '#fef5f5'
      };
    }
    if (!isBackendReachable) {
      return {
        title: '🔧 Serveur inaccessible',
        message: 'Nous ne pouvons pas joindre le serveur. Réessayez plus tard.',
        icon: '🔧',
        color: colors.orange,
        bgColor: '#fef9f0'
      };
    }
    return null;
  };

  const status = getStatusMessage();
  if (!status) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { transform: [{ translateY: slideAnim }] },
        { backgroundColor: status.bgColor }
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: status.color + '20' }]}>
          <Text style={styles.icon}>{status.icon}</Text>
        </View>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: status.color }]}>{status.title}</Text>
          <Text style={styles.message}>{status.message}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: status.color }]}
          onPress={handleRetry}
          disabled={isChecking}
        >
          {isChecking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.retryText}>⟳ Réessayer</Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const createStyles = (colors) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  message: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  retryButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 13,
  },
});