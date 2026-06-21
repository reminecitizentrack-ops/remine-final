import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

export const useLogger = () => {
  const componentName = useRef('Unknown');

  // Définir le nom du composant pour le logging
  const setComponentName = (name) => {
    componentName.current = name;
  };

  // Logger avec contexte du composant
  const logWithContext = (level, message, data = null) => {
    const enhancedData = {
      ...data,
      component: componentName.current,
      timestamp: new Date().toISOString()
    };
    
    logger[level](`[${componentName.current}] ${message}`, enhancedData);
  };

  // Méthodes de logging spécifiques
  const info = (message, data = null) => {
    logWithContext('info', message, data);
  };

  const warn = (message, data = null) => {
    logWithContext('warn', message, data);
  };

  const error = (message, data = null) => {
    logWithContext('error', message, data);
  };

  const debug = (message, data = null) => {
    logWithContext('debug', message, data);
  };

  // Suivi des actions utilisateur
  const trackAction = (action, data = null) => {
    info(`User Action: ${action}`, data);
  };

  // Suivi des erreurs
  const trackError = (error, context = null) => {
    logger.trackError(error, { 
      component: componentName.current,
      ...context 
    });
  };

  // Suivi des performances
  const trackPerformance = (operation, startTime) => {
    const duration = Date.now() - startTime;
    debug(`Performance: ${operation}`, { duration: `${duration}ms` });
  };

  return {
    setComponentName,
    info,
    warn,
    error,
    debug,
    trackAction,
    trackError,
    trackPerformance,
    getLogs: logger.getLogs,
    getStats: logger.getStats
  };
};

// Hook pour le suivi des écrans
export const useScreenTracker = (screenName) => {
  const { setComponentName, info } = useLogger();

  useEffect(() => {
    setComponentName(screenName);
    info(`Screen mounted: ${screenName}`);
    
    return () => {
      info(`Screen unmounted: ${screenName}`);
    };
  }, [screenName]);

  return useLogger();
};