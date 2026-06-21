// src/services/apiOptimized.js
import api from './api';
import { cache } from '../utils/cache';
import NetInfo from '@react-native-community/netinfo';

const REQUEST_QUEUE = [];
let isProcessing = false;

class ApiOptimizer {
  constructor() {
    this.pendingRequests = new Map();
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      requests: 0
    };
  }

  // Debounce pour éviter les appels multiples
  debounce(fn, delay = 300) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // Throttle pour limiter la fréquence
  throttle(fn, limit = 1000) {
    let lastCall = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        return fn(...args);
      }
    };
  }

  // Requête avec cache
  async getWithCache(endpoint, params = {}, ttl = 300000) {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // Vérifier le cache
    const cached = await cache.get(cacheKey, ttl);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }
    
    this.stats.cacheMisses++;
    this.stats.requests++;
    
    // Faire la requête
    const response = await api.get(endpoint, { params });
    await cache.set(cacheKey, response.data, ttl);
    return response.data;
  }

  // Requête avec déduplication (évite les appels parallèles identiques)
  async getDeduplicated(endpoint, params = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    const promise = api.get(endpoint, { params })
      .then(response => response.data)
      .finally(() => {
        this.pendingRequests.delete(cacheKey);
      });
    
    this.pendingRequests.set(cacheKey, promise);
    return promise;
  }

  // Requête avec fallback (offline first)
  async getWithFallback(endpoint, params = {}, fallbackData = null) {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('Offline: using fallback data');
        return fallbackData;
      }
      
      const response = await api.get(endpoint, { params });
      return response.data;
    } catch (error) {
      console.log('API error, using fallback:', error.message);
      return fallbackData;
    }
  }

  // Requête avec retry
  async getWithRetry(endpoint, params = {}, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await api.get(endpoint, { params });
        return response.data;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // Requête batch (regroupe plusieurs requêtes)
  async batchRequests(requests) {
    const batchKey = JSON.stringify(requests);
    
    if (this.pendingRequests.has(batchKey)) {
      return this.pendingRequests.get(batchKey);
    }
    
    const promises = requests.map(req => 
      api.get(req.endpoint, { params: req.params })
    );
    
    const promise = Promise.all(promises)
      .then(responses => responses.map(r => r.data))
      .finally(() => {
        this.pendingRequests.delete(batchKey);
      });
    
    this.pendingRequests.set(batchKey, promise);
    return promise;
  }

  // Préchargement des données
  async preload(endpoints) {
    const promises = endpoints.map(async (endpoint) => {
      const cacheKey = endpoint;
      const cached = await cache.get(cacheKey, 300000);
      if (!cached) {
        const data = await api.get(endpoint);
        await cache.set(cacheKey, data.data, 300000);
      }
    });
    
    await Promise.all(promises);
  }

  // Pagination optimisée
  createPaginationManager(endpoint, pageSize = 20) {
    let currentPage = 1;
    let hasMore = true;
    let isLoading = false;
    let items = [];
    
    return {
      async loadMore() {
        if (isLoading || !hasMore) return;
        
        isLoading = true;
        try {
          const response = await api.get(endpoint, {
            params: { page: currentPage, limit: pageSize }
          });
          
          const newItems = response.data?.data?.reports || [];
          items = [...items, ...newItems];
          hasMore = newItems.length === pageSize;
          currentPage++;
          
          return { items, hasMore };
        } finally {
          isLoading = false;
        }
      },
      
      async refresh() {
        currentPage = 1;
        hasMore = true;
        items = [];
        await this.loadMore();
        return items;
      },
      
      getItems() { return items; },
      hasMore() { return hasMore; },
      isLoading() { return isLoading; }
    };
  }

  getStats() {
    return this.stats;
  }
}

export const apiOptimizer = new ApiOptimizer();