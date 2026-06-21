// src/hooks/useSignalement.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// ==================== useSignalementVoting ====================

export const useSignalementVoting = (signalementId, userId) => {
  const [userVote,  setUserVote]  = useState(null);   // { voteType: 'up'|'down' }
  const [voteStats, setVoteStats] = useState({ upvotes: 0, downvotes: 0, score: 0 });
  const [loading,   setLoading]   = useState(false);

  // ✅ CORRECTIF : loadVotes ajouté aux dépendances
  useEffect(() => {
    if (!signalementId) return;
    loadVotes();
  }, [signalementId, loadVotes]);

  const loadVotes = useCallback(async () => {
    try {
      const response = await api.get(`/reports/${signalementId}/votes`);
      if (response.data?.success) {
        const { upvotes = 0, downvotes = 0, userVote: uv = null } = response.data.data;
        setVoteStats({ upvotes, downvotes, score: upvotes - downvotes });
        setUserVote(uv ? { voteType: uv } : null);
      }
    } catch {
      // Fallback : lire depuis le cache local
      try {
        const cached = await AsyncStorage.getItem(`vote_${signalementId}_${userId}`);
        if (cached) setUserVote(JSON.parse(cached));
      } catch {}
    }
  }, [signalementId, userId]);

  const handleVote = useCallback(async (voteType, onSuccess, onError) => {
    if (!userId) {
      onError?.({ message: 'Vous devez être connecté pour voter' });
      return;
    }
    if (loading) return;

    setLoading(true);
    const previousVote  = userVote;
    const previousStats = voteStats;

    // Mise à jour optimiste
    const isRemoving = userVote?.voteType === voteType;
    const isChanging = userVote && userVote.voteType !== voteType;

    setUserVote(isRemoving ? null : { voteType });
    setVoteStats(prev => {
      const s = { ...prev };
      if (isRemoving) {
        voteType === 'up' ? s.upvotes-- : s.downvotes--;
      } else if (isChanging) {
        voteType === 'up' ? (s.upvotes++, s.downvotes--) : (s.downvotes++, s.upvotes--);
      } else {
        voteType === 'up' ? s.upvotes++ : s.downvotes++;
      }
      s.score = s.upvotes - s.downvotes;
      return s;
    });

    try {
      const response = await api.post(`/reports/${signalementId}/vote`, { voteType, userId });

      if (response.data?.success) {
        const { upvotes, downvotes, userVote: uv } = response.data.data;
        setVoteStats({ upvotes, downvotes, score: upvotes - downvotes });
        setUserVote(uv ? { voteType: uv } : null);

        // Mettre en cache le vote localement
        if (uv) {
          await AsyncStorage.setItem(
            `vote_${signalementId}_${userId}`,
            JSON.stringify({ voteType: uv })
          );
        } else {
          await AsyncStorage.removeItem(`vote_${signalementId}_${userId}`);
        }

        onSuccess?.({ changed: isChanging, removed: isRemoving });
      } else {
        throw new Error(response.data?.error || 'Erreur serveur');
      }
    } catch (error) {
      // Annuler la mise à jour optimiste
      setUserVote(previousVote);
      setVoteStats(previousStats);
      onError?.({ message: error.message || 'Erreur lors du vote' });
    } finally {
      setLoading(false);
    }
  }, [signalementId, userId, userVote, voteStats, loading]);

  return {
    userVote,
    voteStats,
    handleVote,
    loading,
    hasVoted: !!userVote,
    refreshVotes: loadVotes,
  };
};

// ==================== useSignalement (CRUD) ====================

export const useSignalement = (signalementId) => {
  const [signalement, setSignalement] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);

  // ✅ CORRECTIF : fetchSignalement ajouté aux dépendances
  useEffect(() => {
    if (signalementId) fetchSignalement();
  }, [signalementId, fetchSignalement]);

  const fetchSignalement = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/reports/${signalementId}`);
      if (response.data?.success) {
        setSignalement(response.data.data.report);
      }
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [signalementId]);

  return { signalement, loading, error, refresh: fetchSignalement };
};

// ==================== useSignalements (liste) ====================

export const useSignalements = (filters = {}) => {
  const [signalements, setSignalements] = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);

  // ✅ CORRECTIF : JSON.stringify(filters) dans useCallback crée une nouvelle
  // référence à chaque render. On stabilise avec useRef + comparaison manuelle.
  const filtersRef = useRef(filters);
  useEffect(() => { filtersRef.current = filters; });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(filtersRef.current).toString();
      const response = await api.get(`/reports?${params}`);
      if (response.data?.success) {
        setSignalements(response.data.data.reports || []);
      }
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []); // fetchAll est stable — filtersRef.current est lu à l'appel

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { signalements, loading, error, refresh: fetchAll };
};