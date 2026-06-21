import { logger } from './logger';

class RealtimeMonitor {
  constructor() {
    this.connections = new Set();
    this.isConnected = false;
  }

  connect() {
    // Simulation WebSocket - À remplacer par un vrai service
    this.isConnected = true;
    logger.info('Monitoring temps réel connecté');
    
    // Simuler des événements en temps réel
    this.interval = setInterval(() => {
      this.broadcast({
        type: 'HEARTBEAT',
        timestamp: new Date().toISOString(),
        stats: {
          activeUsers: Math.floor(Math.random() * 50) + 10,
          memoryUsage: Math.floor(Math.random() * 100) + 50
        }
      });
    }, 5000);
  }

  disconnect() {
    this.isConnected = false;
    clearInterval(this.interval);
    logger.info('Monitoring temps réel déconnecté');
  }

  onEvent(callback) {
    this.connections.add(callback);
    return () => this.connections.delete(callback);
  }

  broadcast(event) {
    this.connections.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        logger.error('Erreur broadcast', { error: error.message });
      }
    });
  }

  // Envoyer des événements personnalisés
  sendEvent(type, data) {
    this.broadcast({
      type,
      timestamp: new Date().toISOString(),
      data
    });
  }
}

export const realtimeMonitor = new RealtimeMonitor();