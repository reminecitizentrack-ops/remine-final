// src/services/reports.js - VERSION COMPLÈTE AVEC NORMALISATION DES PHOTOS
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

class ReportService {
  constructor() {
    this.localReports = [];
    this.retryQueue = [];
    this.isOnline = true;
    this.loadLocalReports();
  }

  // ==================== INITIALISATION ====================
  
  async loadLocalReports() {
    try {
      const stored = await AsyncStorage.getItem('@local_reports');
      if (stored) {
        this.localReports = JSON.parse(stored);
        console.log('📂 Signalements locaux chargés:', this.localReports.length);
      }
    } catch (error) {
      console.error('❌ Erreur chargement stockage local:', error);
    }
  }

  async saveLocalReports() {
    try {
      await AsyncStorage.setItem('@local_reports', JSON.stringify(this.localReports));
    } catch (error) {
      console.error('❌ Erreur sauvegarde locale:', error);
    }
  }

  // ==================== NORMALISATION DES DONNÉES ====================

  normalizeReport(report) {
    if (!report) return report;
    
    // Extraire les images quel que soit le format
    let extractedImages = [];
    let extractedImagesObjects = [];
    
    // Format 1: images (tableau d'objets avec url)
    if (report.images && Array.isArray(report.images)) {
      extractedImagesObjects = report.images;
      extractedImages = report.images.map(img => 
        typeof img === 'string' ? img : (img.url || img.thumbnail)
      ).filter(Boolean);
    } 
    // Format 2: photos (tableau d'objets avec url)
    else if (report.photos && Array.isArray(report.photos)) {
      extractedImagesObjects = report.photos;
      extractedImages = report.photos.map(photo => 
        typeof photo === 'string' ? photo : (photo.url || photo.thumbnail)
      ).filter(Boolean);
    }
    // Format 3: image unique (string ou objet)
    else if (report.image) {
      if (typeof report.image === 'string') {
        extractedImages = [report.image];
        extractedImagesObjects = [{ url: report.image }];
      } else if (report.image.url) {
        extractedImages = [report.image.url];
        extractedImagesObjects = [report.image];
      }
    }
    
    // Format 4: imagesEmbedded (base64 direct dans le report)
    if (extractedImages.length === 0 && report.imagesEmbedded) {
      extractedImages = report.imagesEmbedded;
      extractedImagesObjects = report.imagesEmbedded.map(img => ({ url: img }));
    }

    return {
      ...report,
      // Uniformiser le champ images pour le dashboard (format attendu par ReportsTable)
      images: extractedImagesObjects.length > 0 ? extractedImagesObjects : extractedImages.map(url => ({
        url: url,
        thumbnail: url,
        caption: report.type || 'Photo'
      })),
      // Champ photos pour compatibilité avec le composant
      photos: extractedImages,
      // Champ photosArray pour compatibilité supplémentaire
      photosArray: extractedImages,
      // Nombre de photos pour affichage rapide
      photosCount: extractedImages.length,
      // URLs simples pour accès rapide
      imageUrls: extractedImages,
      // Première photo (thumbnail)
      thumbnail: extractedImages[0] || null
    };
  }

  // ==================== GESTION DES PHOTOS ====================

  async takePhoto() {
    try {
      console.log('📸 Prise de photo...');
      
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission caméra refusée');
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        console.log('✅ Photo prise:', photo.uri);
        
        const compressedUri = await this.compressImageIfNeeded(photo.uri);
        
        return {
          uri: compressedUri || photo.uri,
          width: photo.width,
          height: photo.height,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
          size: photo.fileSize || 0
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur prise de photo:', error);
      throw error;
    }
  }

  async compressImageIfNeeded(uri) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.size && info.size > 2 * 1024 * 1024) {
        console.log('🔄 Compression image nécessaire...');
        return uri;
      }
      return uri;
    } catch (error) {
      return uri;
    }
  }

  async pickFromGallery() {
    try {
      console.log('🖼️ Ouverture galerie...');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission galerie refusée');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        allowsMultipleSelection: true,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (__DEV__) console.log('✅ Photos sélectionnées:', result.assets.length);
        return result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          type: 'image/jpeg',
          name: `photo_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`,
          size: asset.fileSize || 0
        }));
      }
      return [];
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur galerie:', error);
      throw error;
    }
  }

  async pickVideo() {
    try {
      if (__DEV__) console.log('🎥 Ouverture galerie vidéo...');

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission galerie refusée');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        videoMaxDuration: 60,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (__DEV__) console.log('✅ Vidéo sélectionnée:', asset.uri);
        return {
          uri: asset.uri,
          type: 'video/mp4',
          name: `video_${Date.now()}.mp4`,
          size: asset.fileSize || 0,
          isVideo: true,
          duration: asset.duration,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Erreur sélection vidéo:', error);
      throw error;
    }
  }

  // ==================== CONVERSION PHOTOS ====================

  // ✅ Upload direct sur Cloudinary depuis le mobile
  async uploadPhotoToCloudinary(uri) {
    try {
      const CLOUD_NAME    = 'dky0i7gbt';
      const UPLOAD_PRESET = 'remine_uploads'; // preset non signé créé sur Cloudinary

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: `remine_${Date.now()}.jpg`,
      });
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'remine');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const result = await response.json();
      if (result.secure_url) {
        console.log('✅ Photo uploadée:', result.secure_url);
        return {
          url:       result.secure_url,
          thumbnail: result.secure_url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
          publicId:  result.public_id,
        };
      }
      throw new Error(result.error?.message || 'Upload Cloudinary échoué');
    } catch (e) {
      console.error('❌ Cloudinary upload error:', e.message);
      return null;
    }
  }


  async uploadVideoToCloudinary(uri) {
    try {
      const CLOUD_NAME    = 'dky0i7gbt';
      const UPLOAD_PRESET = 'remine_uploads';

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'video/mp4',
        name: `remine_video_${Date.now()}.mp4`,
      });
      formData.append('upload_preset', UPLOAD_PRESET);
      formData.append('folder', 'remine/videos');
      formData.append('resource_type', 'video');

      if (__DEV__) console.log('☁️ Upload vidéo Cloudinary...');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        { method: 'POST', body: formData }
      );
      const data = await response.json();
      if (data.secure_url) {
        if (__DEV__) console.log('✅ Vidéo uploadée:', data.secure_url);
        return data.secure_url;
      }
      return null;
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur upload vidéo:', error.message);
      return null;
    }
  }
  async photoToBase64(uri) {
    if (uri.endsWith('.mp4') || uri.endsWith('.mov') || uri.includes('video')) return null;
    try {
      if (uri.startsWith('http')) {
        return uri;
      }
      
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      
      if (base64.length > 500 * 1024) {
        console.log('⚠️ Photo lourde:', (base64.length / 1024).toFixed(0), 'KB');
      }
      
      return `data:${mime};base64,${base64}`;
    } catch (error) {
      console.error('❌ Erreur conversion base64:', error.message);
      return null;
    }
  }

  // ==================== CRÉATION SIGNALEMENT ====================

  async createReport(reportData, photos = [], user) {
    try {
      console.log('📤 Création signalement pour:', user?.email);
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      if (!reportData.type || !reportData.description) {
        throw new Error('Type et description requis');
      }

      // Traitement des photos
      const processedPhotos = [];
      
      for (let i = 0; i < Math.min(photos.length, 5); i++) {
        const photo = photos[i];
        const uri = photo.uri || photo;
        const isVideo = photo.isVideo || uri?.endsWith('.mp4') || uri?.endsWith('.mov');

        if (isVideo) {
          // Upload vidéo via Cloudinary
          try {
            const cloudUrl = await this.uploadVideoToCloudinary(uri);
            if (cloudUrl) {
              processedPhotos.push({
                url: cloudUrl,
                caption: `Vidéo ${i + 1} - ${reportData.type}`,
                thumbnail: cloudUrl,
                type: 'video',
                order: i
              });
            }
          } catch (e) {
            if (__DEV__) console.log('⚠️ Upload vidéo échoué:', e.message);
          }
        } else if (uri && (uri.startsWith('file://') || uri.startsWith('/'))) {
          const b64 = await this.photoToBase64(uri);
          if (b64) {
            processedPhotos.push({ 
              url: b64, 
              caption: `Photo ${i + 1} - ${reportData.type}`,
              thumbnail: b64,
              order: i
            });
          }
        } else if (uri && uri.startsWith('http')) {
          processedPhotos.push({ 
            url: uri, 
            caption: `Photo ${i + 1} - ${reportData.type}`,
            thumbnail: uri,
            order: i
          });
        }
      }

      // Structure backend
      const backendData = {
        type: reportData.type,
        description: reportData.description.trim(),
        location: {
          address: reportData.address || 'Adresse non spécifiée',
          latitude: reportData.latitude || 14.7167,
          longitude: reportData.longitude || -17.4677,
          region: reportData.region || 'Dakar',
          city: reportData.city || reportData.address?.split(',')[0]?.trim() || 'Inconnu'
        },
        severity: reportData.severity || 'medium',
        citizenId: user._id || user.id,
        citizen: {
          id: user._id || user.id,
          email: user.email,
          name: user.firstName || user.name || 'Citoyen'
        },
        images: processedPhotos,
        metadata: {
          deviceType: Platform.OS,
          appVersion: '1.0.0',
          timestamp: new Date().toISOString()
        }
      };

      console.log('📦 Envoi au backend...');
      console.log('📸 Nombre de photos:', processedPhotos.length);

      let backendResponse = null;
      let backendSuccess = false;

      try {
        backendResponse = await api.post('/reports', backendData);
        
        if (backendResponse.data?.success) {
          backendSuccess = true;
          console.log('✅ Signalement envoyé au backend:', backendResponse.data.data?.report?.id);
        } else {
          throw new Error('Réponse backend invalide');
        }
      } catch (backendError) {
        console.warn('⚠️ Backend inaccessible:', backendError.message);
        
        if (backendError.response?.status === 401) {
          throw new Error('Session expirée, veuillez vous reconnecter');
        }
      }

      // Création du signalement local (format normalisé)
      const newReport = this.normalizeReport({
        _id: backendSuccess && backendResponse.data?.data?.report?.id 
          ? backendResponse.data.data.report.id 
          : `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        id: backendSuccess && backendResponse.data?.data?.report?.id
          ? backendResponse.data.data.report.id
          : `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: reportData.type,
        description: reportData.description,
        address: reportData.address,
        latitude: reportData.latitude,
        longitude: reportData.longitude,
        severity: reportData.severity,
        status: 'new',
        voteCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        user: {
          id: user._id || user.id,
          name: user.firstName || user.name || 'Utilisateur',
          email: user.email
        },
        citizen: {
          id: user._id || user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        },
        images: processedPhotos,
        photos: processedPhotos.map(p => p.url),
        location: backendData.location,
        isLocalOnly: !backendSuccess,
        syncAttempts: backendSuccess ? 0 : 1,
        lastSyncAttempt: backendSuccess ? null : new Date().toISOString()
      });

      this.localReports.unshift(newReport);
      await this.saveLocalReports();
      
      console.log('✅ Signalement créé localement');
      console.log(`📊 Statut: ${backendSuccess ? '✅ Synchronisé' : '📱 Hors ligne'}`);
      console.log(`📸 Photos dans le signalement: ${newReport.photosCount || newReport.images?.length || 0}`);
      
      return { 
        success: true, 
        data: newReport,
        backendSuccess: backendSuccess,
        photosCount: processedPhotos.length,
        message: backendSuccess 
          ? 'Votre signalement a été envoyé avec succès' 
          : 'Signalement sauvegardé localement et sera synchronisé automatiquement'
      };

    } catch (error) {
      console.error('❌ Erreur création signalement:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de la création du signalement'
      };
    }
  }

  // ==================== RÉCUPÉRATION SIGNALEMENTS ====================

  async getAllReports(params = {}) {
    try {
      console.log('📡 Chargement des signalements...');
      
      let backendReports = [];
      let backendSuccess = false;

      try {
        const backendResponse = await api.get('/reports', { 
          timeout: 10000,
          params: {
            limit: params.limit || 50,
            skip: params.skip || 0
          }
        });
        
        if (backendResponse.data?.success) {
          backendReports = backendResponse.data.data?.reports || [];
          backendSuccess = true;
          console.log('✅ Signalements backend:', backendReports.length);
          
          // Log des photos reçues du backend
          const backendWithPhotos = backendReports.filter(r => 
            (r.images && r.images.length > 0) || (r.photos && r.photos.length > 0)
          ).length;
          console.log(`📸 Backend: ${backendWithPhotos}/${backendReports.length} reports ont des photos`);
        }
      } catch (backendError) {
        console.warn('⚠️ Backend indisponible');
        this.isOnline = false;
      }

      // Normalisation de TOUS les reports
      const normalizeAll = (reports) => reports.map(r => this.normalizeReport(r));
      
      const normalizedBackend = normalizeAll(backendReports);
      const normalizedLocal = normalizeAll(this.localReports);
      const normalizedDemo = normalizeAll(this.getDemoReports());
      
      const allReports = [...normalizedBackend, ...normalizedLocal, ...normalizedDemo];
      const uniqueReports = this.removeDuplicateReports(allReports);
      
      uniqueReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      const reportsWithPhotos = uniqueReports.filter(r => r.photosCount > 0 || (r.images && r.images.length > 0)).length;
      console.log('📊 Total signalements:', uniqueReports.length);
      console.log('📸 Reports avec photos:', reportsWithPhotos);
      
      return { 
        success: true, 
        data: uniqueReports.slice(0, 100),
        fromBackend: backendSuccess,
        total: uniqueReports.length,
        photosCount: reportsWithPhotos
      };
      
    } catch (error) {
      console.error('❌ Erreur récupération:', error.message);
      const fallbackReports = [...this.localReports, ...this.getDemoReports()].map(r => this.normalizeReport(r));
      return { 
        success: true, 
        data: fallbackReports,
        isFallback: true,
        error: error.message
      };
    }
  }

  async getUserReports(user) {
    try {
      if (!user?.email) {
        throw new Error('Utilisateur non connecté');
      }

      console.log('👤 Signalements pour:', user.email);
      
      const userId = user._id || user.id;
      const userEmail = user.email;
      
      const isUserReport = (report) => {
        if (report.user?.email === userEmail) return true;
        if (report.citizen?.email === userEmail) return true;
        if (report.citizenId === userId) return true;
        if (report.userId === userId) return true;
        if (report.email === userEmail) return true;
        return false;
      };

      const localUserReports = this.localReports.filter(isUserReport);
      
      let backendUserReports = [];

      try {
        const backendResponse = await api.get('/reports/mine', { timeout: 8000 });
        
        if (backendResponse.data?.success) {
          backendUserReports = backendResponse.data.data?.reports || [];
          console.log('✅ Signalements backend:', backendUserReports.length);
        }
      } catch (backendError) {
        console.log('📱 Mode hors ligne pour signalements utilisateur');
      }

      const normalize = (report) => this.normalizeReport({
        ...report,
        id: report._id || report.id,
        reportId: report._id || report.id,
        address: report.location?.address || report.address || 'Localisation non précisée',
        localisation: report.location?.address || report.address || 'Localisation non précisée',
        latitude: report.location?.latitude || report.latitude,
        longitude: report.location?.longitude || report.longitude,
        createdAt: report.createdAt || report.date || new Date().toISOString(),
        status: report.status || 'new',
        severity: report.severity || 'medium'
      });

      const allUserReports = [
        ...localUserReports.map(normalize),
        ...backendUserReports.map(normalize)
      ];
      
      const uniqueReports = this.removeDuplicateReports(allUserReports);
      uniqueReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      return { 
        success: true, 
        data: uniqueReports,
        sources: {
          local: localUserReports.length,
          backend: backendUserReports.length,
          total: uniqueReports.length
        }
      };
      
    } catch (error) {
      console.error('❌ Erreur signalements utilisateur:', error);
      return { 
        success: false, 
        error: error.message,
        data: [] 
      };
    }
  }

  async getReportById(id) {
    try {
      if (!id) {
        throw new Error('ID requis');
      }

      const localReport = [...this.localReports, ...this.getDemoReports()]
        .find(r => r.id === id || r._id === id);
      
      if (localReport && !localReport.isDemo) {
        console.log('📱 Signalement trouvé localement');
        this.refreshReportFromBackend(id).catch(() => {});
        
        return { 
          success: true, 
          data: this.normalizeReport(localReport),
          fromLocal: true 
        };
      }

      try {
        const response = await api.get(`/reports/${id}`, { timeout: 8000 });
        
        if (response.data?.success) {
          console.log('✅ Signalement trouvé sur backend');
          return { 
            success: true, 
            data: this.normalizeReport(response.data.data),
            fromBackend: true 
          };
        }
      } catch (backendError) {
        console.warn('⚠️ Signalement non trouvé sur backend');
      }

      const demoReport = this.getDemoReports().find(r => r.id === id || r._id === id);
      if (demoReport) {
        return { 
          success: true, 
          data: this.normalizeReport(demoReport),
          isDemo: true 
        };
      }

      throw new Error('Signalement non trouvé');
      
    } catch (error) {
      console.error('❌ Erreur récupération signalement:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async refreshReportFromBackend(id) {
    try {
      const response = await api.get(`/reports/${id}`);
      if (response.data?.success && response.data.data) {
        const index = this.localReports.findIndex(r => r.id === id || r._id === id);
        if (index !== -1) {
          this.localReports[index] = this.normalizeReport({
            ...this.localReports[index],
            ...response.data.data,
            isLocalOnly: false
          });
          await this.saveLocalReports();
        }
      }
    } catch (error) {
      // Ignorer silencieusement
    }
  }

  // ==================== STATISTIQUES ====================

  async getReportsStats() {
    try {
      console.log('📊 Chargement statistiques...');
      
      // Essayer d'abord /users/me/stats (citoyen connecté)
      try {
        const meStats = await api.get('/users/me/stats', { timeout: 8000 });
        if (meStats.data?.success && meStats.data?.data) {
          const d = meStats.data.data;
          return {
            success: true,
            data: {
              totalReports:    d.total        || 0,
              newReports:      d.byStatus?.new || 0,
              resolvedReports: d.resolved      || 0,
              resolutionRate:  d.resolutionRate || 0,
              activeReports:   (d.byStatus?.in_progress || 0) + (d.byStatus?.new || 0),
            },
            fromBackend: true,
          };
        }
      } catch {}

      // Fallback : /admin/stats (si admin)
      try {
        const backendResponse = await api.get('/admin/stats', { timeout: 8000 });
        if (backendResponse.data?.success) {
          const overview = backendResponse.data.data?.overview || backendResponse.data.data || {};
          console.log('✅ Statistiques backend admin');
          return { 
            success: true, 
            data: {
              totalReports:    overview.totalReports    || 0,
              newReports:      overview.activeReports   || 0,
              resolvedReports: overview.resolvedReports || 0,
              resolutionRate:  overview.resolutionRate  || 0,
              activeReports:   overview.activeReports   || 0,
            },
            fromBackend: true
          };
        }
      } catch (backendError) {
        console.log('📊 Statistiques locales (fallback)');
      }
      
      const allReports = [...this.localReports, ...this.getDemoReports()];
      const totalReports = allReports.length;
      const activeReports = allReports.filter(r => r.status === 'new' || r.status === 'in_progress').length;
      const resolvedReports = allReports.filter(r => r.status === 'resolved' || r.status === 'closed').length;
      const reportsWithPhotos = allReports.filter(r => 
        (r.images && r.images.length > 0) || (r.photos && r.photos.length > 0)
      ).length;
      
      const byType = {};
      allReports.forEach(report => {
        byType[report.type] = (byType[report.type] || 0) + 1;
      });
      
      return { 
        success: true, 
        data: {
          overview: {
            totalReports,
            activeReports,
            resolvedReports,
            resolutionRate: totalReports ? Math.round((resolvedReports / totalReports) * 100) : 0,
            reportsWithPhotos
          },
          byType,
          recentReports: allReports.slice(0, 5)
        },
        isLocal: true
      };
      
    } catch (error) {
      console.error('❌ Erreur statistiques:', error);
      return { 
        success: true, 
        data: {
          overview: {
            totalReports: 0,
            activeReports: 0,
            resolvedReports: 0,
            resolutionRate: 0,
            reportsWithPhotos: 0
          }
        },
        isDemo: true
      };
    }
  }

  // ==================== SYNCHRONISATION ====================

  async syncLocalReports(user) {
    try {
      if (!user?.email) {
        throw new Error('Utilisateur non connecté');
      }

      console.log('🔄 Synchronisation...');
      
      const localOnlyReports = this.localReports.filter(r => r.isLocalOnly === true);
      
      if (localOnlyReports.length === 0) {
        console.log('✅ Rien à synchroniser');
        return { success: true, synced: 0 };
      }

      let syncedCount = 0;
      const failedReports = [];

      for (const localReport of localOnlyReports) {
        try {
          if (localReport.syncAttempts > 3) {
            console.log(`⏭️ Signalement abandonné (${localReport.syncAttempts} tentatives)`);
            failedReports.push(localReport);
            continue;
          }

          const backendData = {
            type: localReport.type,
            description: localReport.description,
            location: {
              address: localReport.address,
              latitude: localReport.latitude,
              longitude: localReport.longitude,
              region: localReport.location?.region || 'Dakar',
              city: localReport.location?.city || localReport.address?.split(',')[0] || 'Inconnu'
            },
            severity: localReport.severity,
            citizenId: user._id || user.id,
            images: (localReport.images || localReport.photos || []).map(photo => ({
              url: typeof photo === 'string' ? photo : (photo.url || photo),
              caption: photo.caption || localReport.type
            })),
            metadata: {
              deviceType: Platform.OS,
              appVersion: '1.0.0',
              syncedAt: new Date().toISOString()
            }
          };

          const response = await api.post('/reports', backendData);
          
          if (response.data?.success) {
            localReport._id = response.data.data.report.id;
            localReport.id = response.data.data.report.id;
            localReport.isLocalOnly = false;
            localReport.syncAttempts = 0;
            localReport.syncedAt = new Date().toISOString();
            syncedCount++;
            console.log(`✅ Synchronisé: ${localReport._id}`);
          } else {
            throw new Error('Échec synchronisation');
          }
        } catch (error) {
          console.warn(`⚠️ Échec synchronisation:`, error.message);
          localReport.syncAttempts = (localReport.syncAttempts || 0) + 1;
          localReport.lastSyncAttempt = new Date().toISOString();
          failedReports.push(localReport);
        }
      }

      await this.saveLocalReports();
      
      console.log(`✅ Synchro terminée: ${syncedCount}/${localOnlyReports.length}`);
      return { 
        success: true, 
        synced: syncedCount, 
        total: localOnlyReports.length,
        failed: failedReports.length
      };

    } catch (error) {
      console.error('❌ Erreur synchronisation:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== DONNÉES DÉMO ====================

  getDemoReports() {
    return [
      {
        _id: 'demo_1',
        id: 'demo_1',
        type: 'water_pollution',
        description: 'Déversement suspect de produits chimiques dans la rivière Falémé. Les poissons présentent des signes de contamination.',
        location: {
          address: 'Site minier Sabodala, Kédougou',
          latitude: 12.6539,
          longitude: -12.1584,
          region: 'Kédougou',
          city: 'Sabodala'
        },
        address: 'Site minier Sabodala, Kédougou',
        status: 'in_progress',
        severity: 'high',
        voteCount: 15,
        commentCount: 3,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        citizen: {
          id: 'demo_citizen_1',
          firstName: 'Moussa',
          lastName: 'Diallo',
          email: 'moussa@example.com'
        },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1564419434663-7876f2741a9e?w=400&h=300&fit=crop',
            caption: 'Rivière contaminée'
          },
          {
            url: 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=400&h=300&fit=crop',
            caption: 'Zone touchée'
          }
        ]
      },
      {
        _id: 'demo_2',
        id: 'demo_2',
        type: 'dust',
        description: 'Nuages de poussière permanents visibles depuis le village. Les habitants se plaignent de problèmes respiratoires.',
        location: {
          address: "Zone d'extraction Khossanto",
          latitude: 12.8559,
          longitude: -12.3604,
          region: 'Kédougou',
          city: 'Khossanto'
        },
        address: "Zone d'extraction Khossanto",
        status: 'verified',
        severity: 'medium',
        voteCount: 8,
        commentCount: 2,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        citizen: {
          id: 'demo_citizen_2',
          firstName: 'Aminata',
          lastName: 'Sow',
          email: 'aminata@example.com'
        },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1582053433976-0c6c0ed69839?w=400&h=300&fit=crop',
            caption: 'Nuage de poussière'
          }
        ]
      },
      {
        _id: 'demo_3',
        id: 'demo_3',
        type: 'waste_deposit',
        description: 'Dépôt sauvage de déchets miniers à proximité du village. Odeurs nauséabondes et eaux contaminées.',
        location: {
          address: 'Carrière de Mako, Kédougou',
          latitude: 12.7833,
          longitude: -12.2167,
          region: 'Kédougou',
          city: 'Mako'
        },
        address: 'Carrière de Mako, Kédougou',
        status: 'new',
        severity: 'critical',
        voteCount: 22,
        commentCount: 5,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        citizen: {
          id: 'demo_citizen_3',
          firstName: 'Ousmane',
          lastName: 'Diop',
          email: 'ousmane@example.com'
        },
        images: [
          {
            url: 'https://images.unsplash.com/photo-1605600659870-6e465c1c5b69?w=400&h=300&fit=crop',
            caption: 'Déchets à ciel ouvert'
          },
          {
            url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&h=300&fit=crop',
            caption: 'Zone contaminée'
          },
          {
            url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=400&h=300&fit=crop',
            caption: 'Impact environnemental'
          }
        ]
      }
    ];
  }

  // ==================== UTILITAIRES ====================

  removeDuplicateReports(reports) {
    const seen = new Map();
    return reports.filter(report => {
      const identifier = report._id || report.id;
      if (!identifier) return true;
      
      if (seen.has(identifier)) {
        return false;
      }
      seen.set(identifier, true);
      return true;
    });
  }

  async testConnection() {
    try {
      console.log('🔍 Test connexion...');
      
      const startTime = Date.now();
      const response = await api.get('/health', { timeout: 5000 });
      const latency = Date.now() - startTime;
      
      this.isOnline = true;
      
      return { 
        success: true, 
        connected: true,
        latency,
        serverTime: response.data?.timestamp,
        fromBackend: true
      };
      
    } catch (error) {
      console.warn('📱 Mode hors ligne');
      this.isOnline = false;
      return { 
        success: false, 
        connected: false,
        error: error.message,
        isOffline: true
      };
    }
  }

  async deleteLocalReport(id) {
    try {
      const index = this.localReports.findIndex(r => r.id === id || r._id === id);
      if (index !== -1) {
        this.localReports.splice(index, 1);
        await this.saveLocalReports();
        console.log('✅ Signalement local supprimé');
        return { success: true };
      }
      return { success: false, error: 'Non trouvé' };
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      return { success: false, error: error.message };
    }
  }

  async clearAllLocalReports() {
    try {
      this.localReports = [];
      await this.saveLocalReports();
      console.log('✅ Tous les signalements locaux supprimés');
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
      return { success: false, error: error.message };
    }
  }

  // ==================== SYNCHRONISATION HORS-LIGNE ====================

  async syncPendingReports(user) {
    try {
      const pending = this.localReports.filter(
        r => r.isLocalOnly && String(r.id || r._id || '').startsWith('local_') && (r.syncAttempts || 0) < 5
      );

      if (pending.length === 0) return { synced: 0, failed: 0 };

      console.log(`🔄 Tentative de sync: ${pending.length} signalement(s) en attente`);

      let synced = 0;
      let failed = 0;

      for (const report of pending) {
        try {
          const backendData = {
            type:        report.type,
            description: report.description,
            location: {
              address:   report.address || report.location?.address || 'Adresse non spécifiée',
              latitude:  report.latitude  || report.location?.latitude  || 14.7167,
              longitude: report.longitude || report.location?.longitude || -17.4677,
              region:    report.location?.region || 'Dakar',
              city:      report.location?.city   || 'Inconnu',
            },
            severity:  report.severity || 'medium',
            citizenId: user._id || user.id,
            citizen: {
              id:    user._id || user.id,
              email: user.email,
              name:  user.firstName || user.name || 'Citoyen',
            },
            images:   report.images || [],
            metadata: { deviceType: 'mobile', appVersion: '1.0.0', timestamp: new Date().toISOString() },
          };

          const response = await api.post('/reports', backendData);

          if (response.data?.success) {
            const newId = response.data.data?.report?.id;
            const idx   = this.localReports.findIndex(r => r.id === report.id || r._id === report._id);
            if (idx !== -1) {
              this.localReports[idx] = this.normalizeReport({
                ...this.localReports[idx],
                _id:          newId || this.localReports[idx]._id,
                id:           newId || this.localReports[idx].id,
                isLocalOnly:  false,
                syncAttempts: 0,
                lastSyncAttempt: new Date().toISOString(),
              });
            }
            synced++;
            console.log(`✅ Signalement synchronisé: ${newId}`);
          } else {
            throw new Error('Réponse backend invalide');
          }
        } catch (err) {
          failed++;
          const idx = this.localReports.findIndex(r => r.id === report.id || r._id === report._id);
          if (idx !== -1) {
            this.localReports[idx] = {
              ...this.localReports[idx],
              syncAttempts:    (this.localReports[idx].syncAttempts || 0) + 1,
              lastSyncAttempt: new Date().toISOString(),
            };
          }
          console.warn(`⚠️ Échec sync signalement ${report.id}:`, err.message);
        }
      }

      await this.saveLocalReports();
      console.log(`✅ Sync terminée — ${synced} synchronisés, ${failed} échoués`);
      return { synced, failed };

    } catch (error) {
      console.error('❌ Erreur sync globale:', error);
      return { synced: 0, failed: 0 };
    }
  }

  getPendingCount() {
    return this.localReports.filter(
      r => r.isLocalOnly && String(r.id || r._id || '').startsWith('local_') && (r.syncAttempts || 0) < 5
    ).length;
  }

  // ==================== MÉTHODE POUR RÉCUPÉRER LES PHOTOS UNIQUEMENT ====================

  async getReportPhotos(reportId) {
    try {
      const report = await this.getReportById(reportId);
      if (!report.success || !report.data) {
        return [];
      }
      
      const normalized = this.normalizeReport(report.data);
      return normalized.images || normalized.photos || [];
    } catch (error) {
      console.error('❌ Erreur récupération photos:', error);
      return [];
    }
  }

  // ==================== MÉTHODE POUR METTRE À JOUR LES PHOTOS ====================

  async updateReportPhotos(reportId, newPhotos) {
    try {
      const index = this.localReports.findIndex(r => r.id === reportId || r._id === reportId);
      if (index !== -1) {
        this.localReports[index] = this.normalizeReport({
          ...this.localReports[index],
          images: newPhotos,
          photos: newPhotos.map(p => p.url || p),
          updatedAt: new Date().toISOString()
        });
        await this.saveLocalReports();
        console.log('✅ Photos du signalement mises à jour');
        return { success: true };
      }
      return { success: false, error: 'Signalement non trouvé' };
    } catch (error) {
      console.error('❌ Erreur mise à jour photos:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export d'une instance unique
const reportService = new ReportService();
export default reportService;