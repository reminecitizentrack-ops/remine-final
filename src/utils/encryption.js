// src/utils/encryption.js
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

class EncryptionManager {
  constructor() {
    this.algorithm = 'AES-GCM';
  }
  
  async generateKey() {
    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Date.now().toString() + Math.random().toString()
    );
    return key;
  }
  
  async hashPassword(password) {
    const hashed = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password
    );
    return hashed;
  }
  
  async encryptData(data, key) {
    if (!__DEV__) {
      // En production, implémenter un vrai chiffrement
      // Pour l'instant, on retourne les données encodées
      const jsonString = JSON.stringify(data);
      const encoded = btoa(jsonString);
      return encoded;
    }
    return data;
  }
  
  async decryptData(encryptedData, key) {
    if (!__DEV__) {
      try {
        const decoded = atob(encryptedData);
        return JSON.parse(decoded);
      } catch {
        return null;
      }
    }
    return encryptedData;
  }
  
  async storeEncrypted(key, value) {
    try {
      const encrypted = await this.encryptData(value, key);
      await SecureStore.setItemAsync(key, encrypted);
      return true;
    } catch (error) {
      console.error('Encryption store error:', error);
      return false;
    }
  }
  
  async retrieveEncrypted(key) {
    try {
      const encrypted = await SecureStore.getItemAsync(key);
      if (encrypted) {
        return await this.decryptData(encrypted, key);
      }
      return null;
    } catch (error) {
      console.error('Encryption retrieve error:', error);
      return null;
    }
  }
}

export const encryption = new EncryptionManager();