import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== 🎯 CONSTANTES ET TYPES ====================

// ✅ CORRECTIF : types synchronisés avec les 8 types déclarés dans ReportScreen.js
export const SIGNALEMENT_TYPES = {
  WATER_POLLUTION:    'water_pollution',
  DUST:               'dust',
  WASTE_DEPOSIT:      'waste_deposit',
  ABANDONED_SITE:     'abandoned_site',
  AIR_POLLUTION:      'air_pollution',
  SOIL_CONTAMINATION: 'soil_contamination',
  NOISE_POLLUTION:    'noise_pollution',
  OTHER:              'other',
};

export const SIGNALEMENT_STATUS = {
  NEW: 'nouveau',
  IN_PROGRESS: 'en_cours',
  RESOLVED: 'resolu',
  REJECTED: 'rejete'
};

export const PRIORITIES = {
  HIGH: 'haute',
  MEDIUM: 'moyenne',
  LOW: 'basse'
};

export const VOTE_TYPES = {
  UP: 'up',
  DOWN: 'down'
};

// ==================== CONTEXTE PRINCIPAL ====================

const SignalementContext = createContext();

export const useSignalement = () => {
  const context = useContext(SignalementContext);
  if (!context) {
    throw new Error('useSignalement must be used within a SignalementProvider');
  }
  return context;
};

// ==================== HOOK PERSONNALISÉ POUR LES STATS ====================

export const useSignalementStats = () => {
  const { signalements, votes, getVoteStats } = useSignalement();
  
  const stats = useMemo(() => {
    const totalSignalements = signalements.length;
    const totalVotes = Object.keys(votes).length;
    
    // Statistiques par type
    const byType = Object.values(SIGNALEMENT_TYPES).reduce((acc, type) => {
      acc[type] = signalements.filter(s => s.type === type).length;
      return acc;
    }, {});
    
    // Statistiques par statut
    const byStatus = Object.values(SIGNALEMENT_STATUS).reduce((acc, status) => {
      acc[status] = signalements.filter(s => s.status === status).length;
      return acc;
    }, {});
    
    // Top 5 des signalements les plus votés
    const mostVoted = signalements
      .map(s => ({
        ...s,
        voteStats: getVoteStats(s.id)
      }))
      .sort((a, b) => b.voteStats.total - a.voteStats.total)
      .slice(0, 5);
    
    // Distribution des votes
    const voteDistribution = {
      up: Object.values(votes).filter(v => v.voteType === VOTE_TYPES.UP).length,
      down: Object.values(votes).filter(v => v.voteType === VOTE_TYPES.DOWN).length
    };
    
    return {
      totalSignalements,
      totalVotes,
      byType,
      byStatus,
      mostVoted,
      voteDistribution,
      engagementRate: totalSignalements > 0 ? (totalVotes / totalSignalements) * 100 : 0
    };
  }, [signalements, votes, getVoteStats]);
  
  return stats;
};

// ==================== PROVIDER PRINCIPAL ====================

export const SignalementProvider = ({ children }) => {
  const [signalements, setSignalements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votes, setVotes] = useState({});

  // Clés pour le stockage local
  const STORAGE_KEY = '@ReMine_signalements';
  const VOTES_KEY = '@ReMine_votes';

  // Données simulées initiales AVEC SCORE
  const simulatedSignalements = [
    {
      id: '1',
      userId: '1',
      userName: 'Utilisateur Test',
      type: SIGNALEMENT_TYPES.WATER_POLLUTION,
      description: 'Déversement industriel dans la rivière',
      localisation: 'Dakar, Plateau',
      coordinates: { latitude: 14.7167, longitude: -17.4677 },
      date: new Date().toISOString(),
      status: SIGNALEMENT_STATUS.IN_PROGRESS,
      priorite: PRIORITIES.HIGH,
      photos: [],
      notes: ['Signalement confirmé par les autorités'],
      updates: [
        {
          date: new Date(Date.now() - 86400000).toISOString(),
          status: SIGNALEMENT_STATUS.NEW,
          message: 'Signalement créé'
        },
        {
          date: new Date().toISOString(),
          status: SIGNALEMENT_STATUS.IN_PROGRESS,
          message: 'Prise en charge par les services environnementaux'
        }
      ],
      score: 8,
      voteCount: 3,
      lastVoteTime: Date.now()
    },
    {
      id: '2',
      userId: '2', 
      userName: 'Citoyen Concerné',
      type: SIGNALEMENT_TYPES.ABANDONED_SITE,
      description: 'Ancienne mine non réhabilitée présentant des risques',
      localisation: 'Thiès, Centre Ville',
      coordinates: { latitude: 14.7940, longitude: -16.9250 },
      date: new Date(Date.now() - 86400000).toISOString(),
      status: SIGNALEMENT_STATUS.RESOLVED,
      priorite: PRIORITIES.MEDIUM,
      photos: [],
      notes: ['Site sécurisé et réhabilité'],
      updates: [
        {
          date: new Date(Date.now() - 86400000).toISOString(),
          status: SIGNALEMENT_STATUS.NEW,
          message: 'Signalement créé'
        },
        {
          date: new Date(Date.now() - 43200000).toISOString(),
          status: SIGNALEMENT_STATUS.IN_PROGRESS,
          message: 'Inspection du site en cours'
        },
        {
          date: new Date().toISOString(),
          status: SIGNALEMENT_STATUS.RESOLVED,
          message: 'Travaux de réhabilitation terminés'
        }
      ],
      score: 15,
      voteCount: 5,
      lastVoteTime: Date.now() - 3600000
    },
    {
      id: '3',
      userId: '3',
      userName: 'Habitant Local',
      type: SIGNALEMENT_TYPES.DUST,
      description: 'Émission importante de poussière depuis le site industriel',
      localisation: 'Rufisque, Zone Industrielle',
      coordinates: { latitude: 14.5060, longitude: -17.0030 },
      date: new Date(Date.now() - 172800000).toISOString(),
      status: SIGNALEMENT_STATUS.NEW,
      priorite: PRIORITIES.HIGH,
      photos: [],
      notes: ['Nécessite une intervention urgente'],
      updates: [
        {
          date: new Date(Date.now() - 172800000).toISOString(),
          status: SIGNALEMENT_STATUS.NEW,
          message: 'Signalement créé - En attente de traitement'
        }
      ],
      score: 3,
      voteCount: 1,
      lastVoteTime: Date.now() - 7200000
    }
  ];

  // ==================== CHARGEMENT DES DONNÉES ====================

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      
      // Charger les signalements
      const storedSignalements = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedSignalements) {
        const parsedSignalements = JSON.parse(storedSignalements);
        setSignalements(parsedSignalements);
      } else {
        // Utiliser les données simulées si aucun stockage trouvé
        setSignalements(simulatedSignalements);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(simulatedSignalements));
      }

      // Charger les votes
      const storedVotes = await AsyncStorage.getItem(VOTES_KEY);
      if (storedVotes) {
        setVotes(JSON.parse(storedVotes));
      }
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur chargement données:', error);
      // Fallback sur données simulées
      setSignalements(simulatedSignalements);
    } finally {
      setIsLoading(false);
    }
  };

  // ==================== VALIDATION DES DONNÉES ====================

  const validateSignalement = (data) => {
    const required = ['type', 'description', 'localisation'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      throw new Error(`Champs manquants: ${missing.join(', ')}`);
    }

    // Validation du type
    if (!Object.values(SIGNALEMENT_TYPES).includes(data.type)) {
      throw new Error(`Type de signalement invalide: ${data.type}`);
    }

    // Validation des coordonnées si présentes
    if (data.coordinates) {
      const { latitude, longitude } = data.coordinates;
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error('Coordonnées GPS invalides');
      }
    }
  };

  // ==================== SAUVEGARDE DES DONNÉES ====================

  const saveSignalements = async (newSignalements) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSignalements));
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur sauvegarde signalements:', error);
      throw error;
    }
  };

  const saveVotes = async (newVotes) => {
    try {
      await AsyncStorage.setItem(VOTES_KEY, JSON.stringify(newVotes));
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur sauvegarde votes:', error);
      throw error;
    }
  };

  // ==================== FONCTIONNALITÉS VOTING AVANCÉES ====================

  // VERSION CORRIGÉE de addVote
  const addVote = useCallback(async (signalementId, userId, voteType, onSuccess = null, onError = null) => {
    if (__DEV__) console.log('🎯 addVote appelé:', { signalementId, userId, voteType });
    
    if (!userId) {
      const error = 'Utilisateur non connecté';
      if (__DEV__) console.log('❌', error);
      if (onError) onError(error);
      return false;
    }

    if (!Object.values(VOTE_TYPES).includes(voteType)) {
      const error = `Type de vote invalide: ${voteType}`;
      if (__DEV__) console.log('❌', error);
      if (onError) onError(error);
      return false;
    }

    const voteKey = `${signalementId}_${userId}`;
    
    try {
      const existingVote = votes[voteKey];
      let scoreChange = 0;
      let shouldRemoveVote = false;

      if (__DEV__) console.log('🔍 Vote existant:', existingVote);

      // Logique de vote améliorée
      if (existingVote) {
        if (existingVote.voteType === voteType) {
          // Même vote → annuler (toggle off)
          scoreChange = voteType === VOTE_TYPES.UP ? -1 : 1;
          shouldRemoveVote = true;
          if (__DEV__) console.log('🗑️ Vote annulé (toggle off)');
        } else {
          // Changement de vote (up→down ou down→up)
          scoreChange = voteType === VOTE_TYPES.UP ? 2 : -2; // +1 nouveau, -1 ancien
          if (__DEV__) console.log('🔄 Changement de vote:', { 
            ancien: existingVote.voteType, 
            nouveau: voteType 
          });
        }
      } else {
        // Nouveau vote
        scoreChange = voteType === VOTE_TYPES.UP ? 1 : -1;
        if (__DEV__) console.log('🆕 Nouveau vote');
      }

      // Mettre à jour les votes
      const newVotes = { ...votes };
      
      if (shouldRemoveVote) {
        // Supprimer le vote existant
        delete newVotes[voteKey];
        if (__DEV__) console.log('🗑️ Vote supprimé de la collection');
      } else {
        // Ajouter ou mettre à jour le vote
        newVotes[voteKey] = {
          signalementId,
          userId,
          voteType,
          timestamp: Date.now()
        };
        if (__DEV__) console.log('💾 Vote sauvegardé dans la collection');
      }

      // Mettre à jour le state des votes
      setVotes(newVotes);

      // Mettre à jour le score et voteCount du signalement
      const updatedSignalements = signalements.map(signalement => {
        if (signalement.id === signalementId) {
          const currentScore = signalement.score || 0;
          const currentVoteCount = signalement.voteCount || 0;
          
          // Calculer le nouveau voteCount
          let newVoteCount = currentVoteCount;
          if (existingVote) {
            if (shouldRemoveVote) {
              newVoteCount = currentVoteCount - 1; // Annulation
            } else {
              newVoteCount = currentVoteCount; // Changement → count inchangé
            }
          } else {
            newVoteCount = currentVoteCount + 1; // Nouveau vote
          }

          const newScore = currentScore + scoreChange;

          if (__DEV__) console.log('📊 Mise à jour score:', {
            ancienScore: currentScore,
            nouveauScore: newScore,
            scoreChange,
            ancienCount: currentVoteCount,
            nouveauCount: newVoteCount,
            action: shouldRemoveVote ? 'annulation' : existingVote ? 'changement' : 'nouveau'
          });

          return {
            ...signalement,
            score: Math.max(0, newScore), // Éviter les scores négatifs si nécessaire
            voteCount: Math.max(0, newVoteCount), // Éviter les counts négatifs
            lastVoteTime: Date.now()
          };
        }
        return signalement;
      });

      // Mettre à jour le state des signalements
      setSignalements(updatedSignalements);

      // Sauvegarder dans AsyncStorage
      await Promise.all([
        saveVotes(newVotes),
        saveSignalements(updatedSignalements)
      ]);

      const result = {
        success: true,
        action: shouldRemoveVote ? 'removed' : existingVote ? 'changed' : 'added',
        previousVote: existingVote,
        newVote: shouldRemoveVote ? null : newVotes[voteKey],
        scoreChange,
        voteKey
      };

      if (__DEV__) console.log('✅ Vote traité avec succès:', result);
      
      if (onSuccess) onSuccess(result);
      return true;

    } catch (error) {
      if (__DEV__) console.error('❌ Erreur traitement vote:', error);
      if (__DEV__) console.error('📋 Détails erreur:', {
        message: error.message,
        stack: error.stack,
        signalementId,
        userId,
        voteType
      });
      
      if (onError) onError(error);
      return false;
    }
  }, [votes, signalements, saveVotes, saveSignalements]);

  // Récupérer le vote d'un utilisateur
  const getUserVote = useCallback((signalementId, userId) => {
    if (!userId) return null;
    return votes[`${signalementId}_${userId}`];
  }, [votes]);

  // Obtenir les statistiques de votes
  const getVoteStats = useCallback((signalementId) => {
    const signalementVotes = Object.values(votes).filter(
      vote => vote.signalementId === signalementId
    );
    
    const upvotes = signalementVotes.filter(vote => vote.voteType === VOTE_TYPES.UP).length;
    const downvotes = signalementVotes.filter(vote => vote.voteType === VOTE_TYPES.DOWN).length;
    
    return {
      total: signalementVotes.length,
      upvotes,
      downvotes,
      score: upvotes - downvotes,
      upvotePercentage: signalementVotes.length > 0 ? (upvotes / signalementVotes.length) * 100 : 0
    };
  }, [votes]);

  // Obtenir les signalements les plus populaires
  const getTopSignalements = useCallback((limit = 10) => {
    return signalements
      .filter(s => (s.score || 0) > 0)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, limit);
  }, [signalements]);

  // Obtenir les signalements tendance
  const getTrendingSignalements = useCallback((limit = 10) => {
    return signalements
      .sort((a, b) => {
        // Score par heure pour détecter les tendances
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        const hoursA = (Date.now() - aTime) / (1000 * 60 * 60);
        const hoursB = (Date.now() - bTime) / (1000 * 60 * 60);
        
        const aScorePerHour = (a.score || 0) / Math.max(1, hoursA);
        const bScorePerHour = (b.score || 0) / Math.max(1, hoursB);
        
        return bScorePerHour - aScorePerHour;
      })
      .slice(0, limit);
  }, [signalements]);

  // ==================== GESTION DES SIGNALEMENTS ====================

  const createSignalement = async (signalementData) => {
    try {
      validateSignalement(signalementData);

      const newSignalement = {
        id: Date.now().toString(),
        userId: signalementData.userId,
        userName: signalementData.userName || 'Utilisateur ReMine',
        type: signalementData.type,
        description: signalementData.description,
        photos: signalementData.photos || [],
        localisation: signalementData.localisation || '',
        coordinates: signalementData.coordinates || getDefaultCoordinates(signalementData.localisation),
        date: new Date().toISOString(),
        status: SIGNALEMENT_STATUS.NEW,
        priorite: signalementData.priorite || getDefaultPriority(signalementData.type),
        notes: [],
        updates: [
          {
            date: new Date().toISOString(),
            status: SIGNALEMENT_STATUS.NEW,
            message: 'Signalement créé'
          }
        ],
        score: 0,
        voteCount: 0,
        lastVoteTime: null
      };

      const updatedSignalements = [newSignalement, ...signalements];
      setSignalements(updatedSignalements);
      await saveSignalements(updatedSignalements);
      
      if (__DEV__) console.log('✅ Signalement créé:', newSignalement);
      return newSignalement;

    } catch (error) {
      if (__DEV__) console.error('❌ Erreur création signalement:', error);
      throw error;
    }
  };

  const updateSignalementStatus = (signalementId, newStatus, message = '') => {
    if (!Object.values(SIGNALEMENT_STATUS).includes(newStatus)) {
      throw new Error(`Statut invalide: ${newStatus}`);
    }

    const updatedSignalements = signalements.map(signalement => {
      if (signalement.id === signalementId) {
        const update = {
          date: new Date().toISOString(),
          status: newStatus,
          message: message || `Statut changé à ${newStatus}`
        };
        
        return {
          ...signalement,
          status: newStatus,
          updates: [...signalement.updates, update]
        };
      }
      return signalement;
    });

    setSignalements(updatedSignalements);
    saveSignalements(updatedSignalements);
    
    if (__DEV__) console.log('✅ Statut mis à jour:', { signalementId, newStatus });
    return updatedSignalements.find(s => s.id === signalementId);
  };

  const addNoteToSignalement = (signalementId, note) => {
    const updatedSignalements = signalements.map(signalement => {
      if (signalement.id === signalementId) {
        return {
          ...signalement,
          notes: [...signalement.notes, {
            content: note,
            date: new Date().toISOString(),
            author: 'Système'
          }]
        };
      }
      return signalement;
    });

    setSignalements(updatedSignalements);
    saveSignalements(updatedSignalements);
    
    if (__DEV__) console.log('✅ Note ajoutée:', { signalementId, note });
  };

  const deleteSignalement = (signalementId) => {
    const updatedSignalements = signalements.filter(s => s.id !== signalementId);
    setSignalements(updatedSignalements);
    saveSignalements(updatedSignalements);
    
    // Supprimer aussi les votes associés
    const newVotes = Object.fromEntries(
      Object.entries(votes).filter(([key]) => !key.startsWith(`${signalementId}_`))
    );
    setVotes(newVotes);
    saveVotes(newVotes);
    
    if (__DEV__) console.log('✅ Signalement supprimé:', signalementId);
  };

  const getSignalementById = (signalementId) => {
    return signalements.find(s => s.id === signalementId);
  };

  // ==================== FONCTIONS DE RÉCUPÉRATION AVEC PAGINATION ====================

  const getPaginatedSignalements = useCallback((page = 1, pageSize = 10, filters = {}) => {
    let filtered = signalements;
    
    // Appliquer les filtres
    if (filters.type) {
      filtered = filtered.filter(s => s.type === filters.type);
    }
    if (filters.status) {
      filtered = filtered.filter(s => s.status === filters.status);
    }
    if (filters.userId) {
      filtered = filtered.filter(s => s.userId === filters.userId);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.description.toLowerCase().includes(searchLower) ||
        s.localisation.toLowerCase().includes(searchLower)
      );
    }
    
    // Trier
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'date':
            return new Date(b.date) - new Date(a.date);
          case 'score':
            return (b.score || 0) - (a.score || 0);
          case 'votes':
            return (b.voteCount || 0) - (a.voteCount || 0);
          default:
            return new Date(b.date) - new Date(a.date);
        }
      });
    }
    
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);
    
    return {
      data: paginated,
      total: filtered.length,
      page,
      pageSize,
      totalPages: Math.ceil(filtered.length / pageSize),
      hasNext: startIndex + pageSize < filtered.length,
      hasPrev: page > 1
    };
  }, [signalements]);

  const getSignalementsForMap = () => {
    return signalements.filter(signalement => 
      signalement.coordinates && 
      signalement.coordinates.latitude && 
      signalement.coordinates.longitude
    );
  };

  const getUserSignalements = (userId) => {
    if (!userId) return [];
    return signalements.filter(s => s.userId === userId);
  };

  const getAllSignalements = () => {
    return signalements;
  };

  const getSignalementsByStatus = (status) => {
    return signalements.filter(s => s.status === status);
  };

  const getSignalementsByType = (type) => {
    return signalements.filter(s => s.type === type);
  };

  const getRecentSignalements = (limit = 10) => {
    return signalements
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit);
  };

  // ==================== FONCTIONS UTILITAIRES ====================

  const getDefaultCoordinates = (localisation) => {
    const locations = {
      'dakar': { latitude: 14.7167, longitude: -17.4677 },
      'thiès': { latitude: 14.7940, longitude: -16.9250 },
      'rufisque': { latitude: 14.5060, longitude: -17.0030 },
      'saint-louis': { latitude: 16.0333, longitude: -16.5000 },
      'ziguinchor': { latitude: 12.5833, longitude: -16.2719 },
      'touba': { latitude: 14.8667, longitude: -15.8833 },
      'kaolack': { latitude: 14.1389, longitude: -16.0764 },
      'mbour': { latitude: 14.4210, longitude: -16.9730 }
    };
    
    if (!localisation) return { latitude: 14.7167, longitude: -17.4677 };
    
    const key = localisation.toLowerCase().split(',')[0]?.trim();
    return locations[key] || { latitude: 14.7167, longitude: -17.4677 };
  };

  const getDefaultPriority = (type) => {
    const priorities = {
      [SIGNALEMENT_TYPES.WATER_POLLUTION]:    PRIORITIES.HIGH,
      [SIGNALEMENT_TYPES.AIR_POLLUTION]:      PRIORITIES.HIGH,
      [SIGNALEMENT_TYPES.SOIL_CONTAMINATION]: PRIORITIES.HIGH,
      [SIGNALEMENT_TYPES.DUST]:               PRIORITIES.MEDIUM,
      [SIGNALEMENT_TYPES.NOISE_POLLUTION]:    PRIORITIES.MEDIUM,
      [SIGNALEMENT_TYPES.WASTE_DEPOSIT]:      PRIORITIES.MEDIUM,
      [SIGNALEMENT_TYPES.ABANDONED_SITE]:     PRIORITIES.LOW,
      [SIGNALEMENT_TYPES.OTHER]:              PRIORITIES.LOW,
    };
    return priorities[type] || PRIORITIES.MEDIUM;
  };

  // ==================== STATISTIQUES ====================

  const getStats = (userId = null) => {
    const userSignalements = userId ? getUserSignalements(userId) : signalements;
    
    return {
      total: userSignalements.length,
      nouveau: userSignalements.filter(s => s.status === SIGNALEMENT_STATUS.NEW).length,
      en_cours: userSignalements.filter(s => s.status === SIGNALEMENT_STATUS.IN_PROGRESS).length,
      resolu: userSignalements.filter(s => s.status === SIGNALEMENT_STATUS.RESOLVED).length,
      rejete: userSignalements.filter(s => s.status === SIGNALEMENT_STATUS.REJECTED).length
    };
  };

  const getMapStats = () => {
    const signalementsAvecCoord = getSignalementsForMap();
    
    return {
      total: signalementsAvecCoord.length,
      parStatut: {
        nouveau: signalementsAvecCoord.filter(s => s.status === SIGNALEMENT_STATUS.NEW).length,
        en_cours: signalementsAvecCoord.filter(s => s.status === SIGNALEMENT_STATUS.IN_PROGRESS).length,
        resolu: signalementsAvecCoord.filter(s => s.status === SIGNALEMENT_STATUS.RESOLVED).length,
        rejete: signalementsAvecCoord.filter(s => s.status === SIGNALEMENT_STATUS.REJECTED).length,
      },
      parType: Object.values(SIGNALEMENT_TYPES).reduce((acc, type) => {
        acc[type] = signalementsAvecCoord.filter(s => s.type === type).length;
        return acc;
      }, {}),
      parRegion: getSignalementsByRegion()
    };
  };

  const getSignalementsByRegion = () => {
    const regions = {};
    signalements.forEach(signalement => {
      if (signalement.localisation) {
        const region = signalement.localisation.split(',')[0]?.trim();
        if (region) {
          regions[region] = (regions[region] || 0) + 1;
        }
      }
    });
    return regions;
  };

  // ==================== UTILITAIRES D'ADMINISTRATION ====================

  const clearAllData = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(VOTES_KEY);
      setSignalements(simulatedSignalements);
      setVotes({});
      if (__DEV__) console.log('✅ Données réinitialisées');
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur réinitialisation:', error);
      throw error;
    }
  };

  const exportData = () => {
    return {
      signalements,
      votes,
      stats: getStats(),
      mapStats: getMapStats(),
      votingStats: {
        totalVotes: Object.keys(votes).length,
        topSignalements: getTopSignalements(5),
        trendingSignalements: getTrendingSignalements(5)
      },
      exportDate: new Date().toISOString(),
      version: '1.0.0'
    };
  };

  const reloadData = async () => {
    await loadAllData();
  };

  // ==================== VALEUR DU CONTEXTE ====================

  const value = {
    // État
    signalements,
    isLoading,
    votes,
    
    // Constantes
    SIGNALEMENT_TYPES,
    SIGNALEMENT_STATUS,
    PRIORITIES,
    VOTE_TYPES,
    
    // Actions principales
    createSignalement,
    updateSignalementStatus,
    addNoteToSignalement,
    deleteSignalement,
    getSignalementById,
    
    // Actions voting avancées
    addVote,
    getUserVote,
    getVoteStats,
    getTopSignalements,
    getTrendingSignalements,
    
    // Récupération avec pagination
    getPaginatedSignalements,
    getSignalementsForMap,
    getUserSignalements,
    getAllSignalements,
    getSignalementsByStatus,
    getSignalementsByType,
    getRecentSignalements,
    
    // Statistiques
    getStats,
    getMapStats,
    getSignalementsByRegion,
    
    // Utilitaires
    clearAllData,
    exportData,
    reloadData,
    validateSignalement
  };

  return (
    <SignalementContext.Provider value={value}>
      {children}
    </SignalementContext.Provider>
  );
};

// ==================== HOOKS D'UTILISATION SPÉCIFIQUES ====================

export const useSignalementVoting = (signalementId, userId) => {
  const { addVote, getUserVote, getVoteStats } = useSignalement();
  
  const userVote = getUserVote(signalementId, userId);
  const voteStats = getVoteStats(signalementId);
  
  const handleVote = useCallback(async (voteType, onSuccess, onError) => {
    return await addVote(signalementId, userId, voteType, onSuccess, onError);
  }, [signalementId, userId, addVote]);
  
  return {
    userVote,
    voteStats,
    handleVote,
    hasVoted: !!userVote,
    currentVote: userVote?.voteType || null
  };
};

export const useUserSignalements = (userId) => {
  const { getUserSignalements, getStats } = useSignalement();
  
  const userSignalements = useMemo(() => 
    getUserSignalements(userId), 
    [getUserSignalements, userId]
  );
  
  const userStats = useMemo(() => 
    getStats(userId), 
    [getStats, userId]
  );
  
  return {
    userSignalements,
    userStats,
    totalSignalements: userSignalements.length
  };
};

// ==================== HOOK POUR LA GESTION SIMPLIFIÉE DES VOTES ====================

export const useVoteManager = (signalementId, userId) => {
  const { addVote, getUserVote, getVoteStats } = useSignalement();
  
  const userVote = getUserVote(signalementId, userId);
  const voteStats = getVoteStats(signalementId);
  
  const handleVote = useCallback(async (voteType) => {
    return new Promise((resolve, reject) => {
      addVote(
        signalementId, 
        userId, 
        voteType,
        (result) => resolve(result),
        (error) => reject(error)
      );
    });
  }, [signalementId, userId, addVote]);
  
  // Méthodes pratiques
  const voteUp = useCallback(() => handleVote(VOTE_TYPES.UP), [handleVote]);
  const voteDown = useCallback(() => handleVote(VOTE_TYPES.DOWN), [handleVote]);
  const toggleVote = useCallback(() => {
    if (!userVote) return voteUp();
    return handleVote(userVote.voteType); // Annule le vote actuel
  }, [userVote, voteUp, handleVote]);
  
  return {
    userVote,
    voteStats,
    handleVote,
    voteUp,
    voteDown,
    toggleVote,
    hasVoted: !!userVote,
    currentVote: userVote?.voteType || null,
    isUpvoted: userVote?.voteType === VOTE_TYPES.UP,
    isDownvoted: userVote?.voteType === VOTE_TYPES.DOWN
  };
};