// src/utils/cache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
  }

  async get(key, ttl = DEFAULT_TTL) {
    // Vérifier d'abord le cache mémoire
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
      this.memoryCache.delete(key);
    }
    
    // Vérifier AsyncStorage
    try {
      const cached = await AsyncStorage.getItem(CACHE_PREFIX + key);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - data.timestamp < ttl) {
          // Mettre en cache mémoire
          this.memoryCache.set(key, data);
          return data.data;
        }
        await this.remove(key);
      }
    } catch (error) {
      console.log('Cache get error:', error);
    }
    
    return null;
  }

  async set(key, data, ttl = DEFAULT_TTL) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    };
    
    // Cache mémoire
    this.memoryCache.set(key, cacheData);
    
    // Cache persistant
    try {
      await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheData));
    } catch (error) {
      console.log('Cache set error:', error);
    }
  }

  async remove(key) {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.log('Cache remove error:', error);
    }
  }

  async clear() {
    this.memoryCache.clear();
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.log('Cache clear error:', error);
    }
  }

  async getOrFetch(key, fetcher, ttl = DEFAULT_TTL) {
    const cached = await this.get(key, ttl);
    if (cached) return cached;
    
    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }
}

export const cache = new CacheManager();

// Hook pour utiliser le cache
export const useCache = () => {
  const getOrFetch = async (key, fetcher, ttl) => {
    return cache.getOrFetch(key, fetcher, ttl);
  };
  
  return { getOrFetch, clearCache: cache.clear.bind(cache) };
};