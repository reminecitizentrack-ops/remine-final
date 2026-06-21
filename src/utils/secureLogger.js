// src/utils/secureLogger.js
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

class SecureLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 100;
    this.logLevel = __DEV__ ? 'debug' : 'error';
  }
  
  // Niveaux de log
  levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    none: 4
  };
  
  setLogLevel(level) {
    if (this.levels[level] !== undefined) {
      this.logLevel = level;
    }
  }
  
  async log(level, message, data = null) {
    if (this.levels[level] < this.levels[this.logLevel]) {
      return;
    }
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? this.sanitizeData(data) : null,
      platform: Platform.OS,
      version: '1.0.0'
    };
    
    // En développement, afficher dans la console
    if (__DEV__) {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}]`, message, data || '');
    }
    
    // Stocker les logs
    this.logs.unshift(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    
    // En production, envoyer au serveur pour les erreurs critiques
    if (!__DEV__ && (level === 'error' || level === 'warn')) {
      await this.sendToServer(logEntry);
    }
  }
  
  sanitizeData(data) {
    if (!data) return null;
    
    // Éviter les logs sensibles
    const sensitiveFields = ['password', 'token', 'refreshToken', 'authorization', 'apiKey'];
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
  
  async sendToServer(logEntry) {
    try {
      // Envoyer au serveur de logging (optionnel)
      // await api.post('/logs', logEntry);
    } catch (error) {
      // Ne pas logguer l'erreur pour éviter les boucles
    }
  }
  
  async exportLogs() {
    if (!__DEV__) return null;
    
    const logsString = JSON.stringify(this.logs, null, 2);
    const logPath = `${FileSystem.documentDirectory}logs_${Date.now()}.json`;
    
    await FileSystem.writeAsStringAsync(logPath, logsString);
    return logPath;
  }
  
  clearLogs() {
    this.logs = [];
  }
  
  debug(message, data) {
    this.log('debug', message, data);
  }
  
  info(message, data) {
    this.log('info', message, data);
  }
  
  warn(message, data) {
    this.log('warn', message, data);
  }
  
  error(message, data) {
    this.log('error', message, data);
  }
}

export const logger = new SecureLogger();