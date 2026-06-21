// src/components/StatsOverview.js
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import reportService from '../services/reports';
import { useTheme } from '../context/ThemeContext';

export default function StatsOverview() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await reportService.getReportsStats();
      
      // ✅ CORRECTION : Vérifier la structure des données
      if (result && result.data) {
        setStats(result.data);
      } else {
        // Statistiques par défaut
        setStats({
          total: 0,
          resolved: 0,
          pending: 0,
          inProgress: 0,
          urgent: 0
        });
      }
    } catch (err) {
      console.error('❌ Erreur chargement statistiques:', err);
      setError(err.message);
      // Statistiques par défaut en cas d'erreur
      setStats({
        total: 0,
        resolved: 0,
        pending: 0,
        inProgress: 0,
        urgent: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text>Chargement des statistiques...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Erreur: {error}</Text>
        <Text>Utilisation des données par défaut</Text>
      </View>
    );
  }

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.title}>📊 Aperçu des Signalements</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.total || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.resolved || 0}</Text>
          <Text style={styles.statLabel}>Résolus</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.inProgress || 0}</Text>
          <Text style={styles.statLabel}>En Cours</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats?.pending || 0}</Text>
          <Text style={styles.statLabel}>En Attente</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  statsContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#2c3e50',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.blue,
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
});