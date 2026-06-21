// src/hooks/useReports.js — VERSION CORRIGÉE
import { useState, useCallback } from 'react';
import reportService from '../services/reports';

const DEFAULT_STATS = {
  total: 0, resolved: 0, pending: 0,
  inProgress: 0, urgent: 0,
  byType: {}, byRegion: {}, bySeverity: {},
};

export const useReports = () => {
  const [reports, setReports] = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // ── Charger tous les signalements ─────────────────────────────────────────
  const loadAllReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (__DEV__) console.log('🔄 Chargement des signalements...');

      const result = await reportService.getAllReports();

      if (result.success) {
        setReports(result.data || []);
        if (__DEV__) console.log(`✅ ${result.data?.length ?? 0} signalements chargés`);
      } else {
        setError(result.error);
        setReports([]);
      }
    } catch (err) {
      if (__DEV__) console.error('❌ Erreur chargement signalements:', err.message);
      setError(err.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Charger les statistiques ──────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    try {
      if (__DEV__) console.log('📊 Chargement des statistiques...');

      const result = await reportService.getReportsStats();

      if (result.success) {
        setStats(result.data);
      } else {
        if (__DEV__) console.warn('⚠️ Erreur stats:', result.error);
        setStats(DEFAULT_STATS);
      }
    } catch (err) {
      if (__DEV__) console.error('❌ Erreur stats:', err.message);
      setStats(DEFAULT_STATS);
    }
  }, []);

  // ── Créer un signalement ──────────────────────────────────────────────────
  const createReport = useCallback(async (reportData, photos = []) => {
    try {
      setLoading(true);
      if (__DEV__) console.log('📤 Création signalement...');

      const result = await reportService.createReport(reportData, photos);

      if (result.success) {
        if (__DEV__) console.log('✅ Signalement créé');
        // ✅ CORRECTIF : un seul appel parallèle au lieu de deux séquentiels
        await Promise.all([loadAllReports(), loadStats()]);
        return { success: true, data: result.data };
      } else {
        if (__DEV__) console.warn('⚠️ Échec création:', result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      if (__DEV__) console.error('❌ Erreur création:', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [loadAllReports, loadStats]);

  // ── Initialisation et refresh ─────────────────────────────────────────────
  const loadInitialData = useCallback(async () => {
    if (__DEV__) console.log('🔄 Chargement initial...');
    await Promise.all([loadAllReports(), loadStats()]);
  }, [loadAllReports, loadStats]);

  const refreshData = useCallback(async () => {
    await loadInitialData();
  }, [loadInitialData]);

  return {
    reports,
    stats,
    loading,
    error,
    loadAllReports,
    loadStats,
    createReport,
    loadInitialData,
    refreshData,
    hasReports:      reports.length > 0,
    totalReports:    reports.length,
    resolvedReports: stats?.resolved ?? 0,
  };
};