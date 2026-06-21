class AppLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.listeners = new Set();
  }

  levels = {
    ERROR: 'ERROR',
    WARN: 'WARN', 
    INFO: 'INFO',
    DEBUG: 'DEBUG'
  };

  log(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      id: Date.now() + Math.random(),
      timestamp,
      level,
      message,
      data,
      screen: this.getCurrentScreen()
    };

    // Ajouter au tableau des logs
    this.logs.unshift(logEntry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Afficher dans la console
    const colors = {
      ERROR: '🔴',
      WARN: '🟡', 
      INFO: '🔵',
      DEBUG: '🟢'
    };
    
    console.log(
      `${colors[level]} [${timestamp}] ${level}: ${message}`,
      data ? data : ''
    );

    // Notifier les écouteurs
    this.emitLogEvent(logEntry);
  }

  error(message, data = null) {
    this.log(this.levels.ERROR, message, data);
  }

  warn(message, data = null) {
    this.log(this.levels.WARN, message, data);
  }

  info(message, data = null) {
    this.log(this.levels.INFO, message, data);
  }

  debug(message, data = null) {
    this.log(this.levels.DEBUG, message, data);
  }

  // Suivi des écrans
  trackScreen(screenName) {
    this.info(`Navigation: ${screenName}`);
  }

  // Suivi des actions utilisateur
  trackAction(action, data = null) {
    this.info(`Action: ${action}`, data);
  }

  // Suivi des performances
  trackPerformance(operation, duration) {
    this.debug(`Performance: ${operation}`, { duration: `${duration}ms` });
  }

  // Suivi des erreurs
  trackError(error, context = null) {
    this.error(`Erreur: ${error.message}`, {
      stack: error.stack,
      context
    });
  }

  // Obtenir les logs
  getLogs(limit = 100) {
    return this.logs.slice(0, limit);
  }

  // Obtenir les statistiques
  getStats() {
    const total = this.logs.length;
    const errors = this.logs.filter(log => log.level === 'ERROR').length;
    const warnings = this.logs.filter(log => log.level === 'WARN').length;
    const infos = this.logs.filter(log => log.level === 'INFO').length;

    return {
      total,
      errors,
      warnings,
      infos,
      lastUpdate: new Date().toISOString()
    };
  }

  // Vider les logs
  clearLogs() {
    this.logs = [];
    this.info('Logs cleared');
  }

  // Export des logs
  exportLogs() {
    return this.logs.map(log => 
      `[${log.timestamp}] ${log.level}: ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`
    ).join('\n');
  }

  // Système d'écouteurs
  onLog(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emitLogEvent(logEntry) {
    this.listeners.forEach(callback => {
      try {
        callback(logEntry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    });
  }

  getCurrentScreen() {
    // Cette fonction peut être améliorée avec React Navigation
    return 'Unknown';
  }
}

// Instance singleton
export const logger = new AppLogger();
export default logger;