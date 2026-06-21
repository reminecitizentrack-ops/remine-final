// src/services/websocket.js
// Écoute les événements du backend et déclenche les notifications push
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Détecte automatiquement l'IP Expo — plus jamais besoin de la changer manuellement
const getWsUrl = () => {
  if (process.env.EXPO_PUBLIC_WS_URL) return process.env.EXPO_PUBLIC_WS_URL;
  if (!__DEV__) return 'wss://TON-DOMAINE.com';
  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return expoHost ? `ws://${expoHost}:5001` : 'ws://192.168.1.16:5001';
};

const WS_URL = getWsUrl();

class WebSocketService {
  constructor() {
    this.ws          = null;
    this.userId      = null;
    this.listeners   = new Map();
    this.reconnectTimer = null;
    this.reconnectDelay = 3000;
    this.maxDelay       = 30000;
    this.shouldReconnect = false;
  }

  // Connexion avec l'ID de l'utilisateur connecté
  connect(userId) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.userId = userId;
    this.shouldReconnect = true;
    this._connect();
  }

  _connect() {
    try {
      console.log('🔌 WebSocket: connexion vers', WS_URL);
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connecté');
        this.reconnectDelay = 3000; // reset du délai
        // S'identifier auprès du serveur
        this._send({ type: 'identify', userId: this.userId });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this._handleMessage(message);
        } catch (e) {
          console.log('WebSocket message invalide:', e.message);
        }
      };

      this.ws.onerror = (error) => {
        console.log('⚠️ WebSocket erreur:', error.message || 'connexion impossible');
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket déconnecté');
        if (this.shouldReconnect) {
          this._scheduleReconnect();
        }
      };

    } catch (e) {
      console.log('WebSocket init error:', e.message);
      if (this.shouldReconnect) this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log('🔄 WebSocket: tentative de reconnexion...');
      this._connect();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxDelay);
    }, this.reconnectDelay);
  }

  _send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  _handleMessage(message) {
    console.log('📨 WebSocket message:', message.type);

    // Notifier tous les listeners enregistrés pour ce type
    const handlers = this.listeners.get(message.type) || [];
    handlers.forEach(fn => {
      try { fn(message.data || message); } catch (e) { console.log('Handler error:', e); }
    });

    // Listener "all" pour tout recevoir
    const allHandlers = this.listeners.get('*') || [];
    allHandlers.forEach(fn => {
      try { fn(message); } catch (e) { console.log('Handler error:', e); }
    });
  }

  // S'abonner à un type d'événement
  on(eventType, callback) {
    const existing = this.listeners.get(eventType) || [];
    this.listeners.set(eventType, [...existing, callback]);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    const existing = this.listeners.get(eventType) || [];
    this.listeners.set(eventType, existing.filter(fn => fn !== callback));
  }

  disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsService = new WebSocketService();