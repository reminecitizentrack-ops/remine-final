// src/screens/CitizenDashboardScreen.js — Tableau de bord citoyen
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const getStatusConfig = (colors) => ({
  new:         { label: 'Nouveau',  color: colors.orange, bg: '#fef3c7', icon: '🆕' },
  verified:    { label: 'Vérifié', color: colors.blue, bg: '#dbeafe', icon: '✅' },
  in_progress: { label: 'En cours', color: colors.purple, bg: '#ede9fe', icon: '🔄' },
  resolved:    { label: 'Résolu',   color: colors.primary, bg: '#dcfce7', icon: '✓'  },
  rejected:    { label: 'Rejeté',   color: colors.dangerDark, bg: '#fee2e2', icon: '✕'  },
});

const TYPE_ICONS = {
  water_pollution: '💧', dust: '🌫️', abandoned_site: '🏚️',
  waste_deposit: '🗑️', air_pollution: '💨', noise_pollution: '🔊', other: '⚠️',
};

const AnimatedNumber = ({ value, color }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 800, useNativeDriver: false }).start();
  }, [value]);
  return (
    <Animated.Text style={[styles.statValue, { color }]}>
      {anim.__getValue ? Math.round(anim.__getValue()) : value}
    </Animated.Text>
  );
};

const StatCard = ({ label, value, color, icon, sub }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
  <View style={[styles.statCard, {
  borderTopColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);
};

const ProgressBar = ({ value, max, color }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
  <View style={
  styles.progressBg}>
    <View style={[styles.progressFill, {
      width: max > 0 ? `${Math.min((value / max) * 100, 100)}%` : '0%',
      backgroundColor: color,
    }]} />
  </View>
);
};

export default function CitizenDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const STATUS_CONFIG = getStatusConfig(colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [stats,      setStats]      = useState(null);
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        api.get('/users/me/stats'),
        api.get('/reports/mine'),
      ]);
      if (statsRes.data?.success)   setStats(statsRes.data.data);
      const arr = reportsRes.data?.data?.reports || [];
      setReports(arr.slice(0, 5));
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) {
      console.log('Erreur dashboard citoyen:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#16a34a" />
      <Text style={styles.loaderText}>Chargement de vos statistiques…</Text>
    </View>
  );

  const total    = stats?.total || 0;
  const nextRank = total >= 20 ? null : total >= 10 ? 20 : total >= 5 ? 10 : 5;
  const nextLabel = total >= 20 ? '🏆 Expert' : total >= 10 ? '🏆 Expert' : total >= 5 ? '⭐ Actif' : '🌱 Engagé';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" colors={['#16a34a']} />}
      >
        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim }]}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.heroRank}>{stats?.rank || '🆕 Débutant'}</Text>
            <Text style={styles.heroCommunity}>{user?.community || 'Sénégal'}</Text>
          </View>
        </Animated.View>

        {/* Progression vers prochain rang */}
        {nextRank && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>🎯 Progression</Text>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>{stats?.rank}</Text>
              <Text style={styles.progressTarget}>{nextLabel}</Text>
            </View>
            <ProgressBar value={total} max={nextRank} color="#16a34a" />
            <Text style={styles.progressHint}>{nextRank - total} signalement{nextRank - total > 1 ? 's' : ''} pour atteindre {nextLabel}</Text>
          </Animated.View>
        )}

        {/* Stats principales */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.sectionTitle}>📊 Mes statistiques</Text>
          <View style={styles.statsGrid}>
            <StatCard label="Signalements"  value={total}                    color="#2563eb" icon="📝" />
            <StatCard label="Résolus"       value={stats?.resolved || 0}     color="#16a34a" icon="✓"  sub={`${stats?.resolutionRate || 0}%`} />
            <StatCard label="Ce mois"       value={stats?.thisMonth || 0}    color="#7c3aed" icon="📅" />
            <StatCard label="Votes reçus"   value={stats?.totalVotes || 0}   color="#d97706" icon="👍" />
          </View>
        </Animated.View>

        {/* Répartition par statut */}
        {stats?.byStatus && Object.keys(stats.byStatus).length > 0 && (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>📈 Répartition par statut</Text>
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const cfg = getStatusConfig(colors)[status] || { label: status, color: colors.textSecondary, bg: colors.surfaceAlt, icon: '•' };
              return (
                <View key={status} style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                  <Text style={styles.statusRowLabel}>{cfg.icon} {cfg.label}</Text>
                  <ProgressBar value={count} max={total} color={cfg.color} />
                  <Text style={[styles.statusCount, { color: cfg.color }]}>{count}</Text>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* Derniers signalements */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🕒 Mes derniers signalements</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MesSignalements')}>
              <Text style={styles.seeAll}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          {reports.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Aucun signalement pour l'instant</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Report')}>
                <Text style={styles.emptyBtnText}>Créer mon premier signalement</Text>
              </TouchableOpacity>
            </View>
          ) : (
            reports.map(r => {
              const cfg = getStatusConfig(colors)[r.status] || getStatusConfig(colors).new;
              return (
                <TouchableOpacity
                  key={r._id || r.id}
                  style={styles.reportRow}
                  onPress={() => navigation.navigate('Signalement', { signalementId: r._id || r.id })}
                >
                  <Text style={styles.reportIcon}>{TYPE_ICONS[r.type] || '📍'}</Text>
                  <View style={styles.reportInfo}>
                    <Text style={styles.reportType}>{(r.type || '').replace(/_/g, ' ')}</Text>
                    <Text style={styles.reportDate}>
                      {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={[styles.reportBadge, { backgroundColor: cfg.bg, borderColor: cfg.color }]}>
                    <Text style={[styles.reportBadgeText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Animated.View>

        {/* Actions rapides */}
        <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
          <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
          <View style={styles.actionsRow}>
            {[
              { icon: '📤', label: 'Signaler',   screen: 'Report',           color: colors.primary },
              { icon: '🗺️', label: 'Carte',      screen: 'Map',              color: colors.blue },
              { icon: '🏆', label: 'Classement', screen: 'TopSignalements',  color: colors.orange },
              { icon: '👤', label: 'Profil',     screen: 'Profile',          color: colors.purple },
            ].map(a => (
              <TouchableOpacity key={a.screen} style={[styles.actionBtn, { borderColor: a.color }]} onPress={() => navigation.navigate(a.screen)}>
                <Text style={styles.actionIcon}>{a.icon}</Text>
                <Text style={[styles.actionLabel, { color: a.color }]}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.backgroundAlt },
  content:    { padding: 16 },
  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: colors.textSecondary, fontSize: 14 },

  hero:        { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.textInverse, borderRadius: 20, padding: 20, marginBottom: 16, gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  heroAvatar:  { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  heroAvatarText: { fontSize: 22, fontWeight: '800', color: colors.textInverse },
  heroInfo:    { flex: 1 },
  heroName:    { fontSize: 18, fontWeight: '800', color: colors.textPrimary, marginBottom: 3 },
  heroRank:    { fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  heroCommunity: { fontSize: 12, color: colors.textMuted },

  section:       { backgroundColor: colors.textInverse, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  seeAll:        { fontSize: 13, color: colors.primary, fontWeight: '600' },

  progressRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel:{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  progressTarget:{ fontSize: 12, color: colors.primary, fontWeight: '700' },
  progressBg:   { height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden', flex: 1 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressHint: { fontSize: 11, color: colors.textMuted, marginTop: 6, textAlign: 'center' },

  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  statCard:    { width: '47%', backgroundColor: colors.textInverse, borderRadius: 14, padding: 14, borderTopWidth: 3, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  statIcon:    { fontSize: 22, marginBottom: 6 },
  statValue:   { fontSize: 26, fontWeight: '800', marginBottom: 2 },
  statLabel:   { fontSize: 11, color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },
  statSub:     { fontSize: 10, color: colors.textMuted, marginTop: 2 },

  statusRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  statusDot:      { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  statusRowLabel: { fontSize: 12, color: colors.textPrimary, fontWeight: '500', width: 80 },
  statusCount:    { fontSize: 13, fontWeight: '700', width: 24, textAlign: 'right' },

  reportRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.background },
  reportIcon:     { fontSize: 22, width: 28, textAlign: 'center' },
  reportInfo:     { flex: 1 },
  reportType:     { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize' },
  reportDate:     { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  reportBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  reportBadgeText:{ fontSize: 10, fontWeight: '700' },

  actionsRow:   { flexDirection: 'row', gap: 8 },
  actionBtn:    { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, backgroundColor: colors.backgroundAlt },
  actionIcon:   { fontSize: 20, marginBottom: 4 },
  actionLabel:  { fontSize: 11, fontWeight: '700' },

  empty:       { alignItems: 'center', paddingVertical: 24 },
  emptyIcon:   { fontSize: 40, marginBottom: 10 },
  emptyText:   { color: colors.textSecondary, fontSize: 14, marginBottom: 14 },
  emptyBtn:    { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText:{ color: colors.textInverse, fontWeight: '700', fontSize: 13 },
});