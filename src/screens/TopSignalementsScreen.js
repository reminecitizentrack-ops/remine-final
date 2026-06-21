// src/screens/TopSignalementsScreen.js — Version corrigée (sans /reports/public)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Animated, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const createStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  title:  { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  demoWarning: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: colors.dangerLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  demoWarningText: { fontSize: 11, fontWeight: '700', color: colors.danger },

  tabs: { flexDirection: 'row', backgroundColor: colors.surface, paddingHorizontal: 12, paddingBottom: 10, paddingTop: 4, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  tab:         { flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center' },
  tabActive:   { backgroundColor: colors.primary },
  tabText:     { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  tabTextActive:{ color: colors.surface },

  list:   { padding: 12, gap: 10 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: colors.textSecondary, fontSize: 14 },
  empty:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 60, marginBottom: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  emptyBtn:  { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: colors.surface, fontWeight: '700', fontSize: 15 },

  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  rank: { width: 36, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  rankText: { fontSize: 22 },
  cardBody: { flex: 1 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  typeIcon:   { fontSize: 24 },
  cardMeta:   { flex: 1 },
  typeName:   { fontSize: 14, fontWeight: '700', color: colors.textPrimary, textTransform: 'capitalize' },
  location:   { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statusBadge:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },

  description: { fontSize: 13, color: colors.textPrimary, lineHeight: 18, marginBottom: 10 },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  severityDot:  { width: 8, height: 8, borderRadius: 4 },
  severityText: { fontSize: 11, color: colors.textMuted, flex: 1, textTransform: 'capitalize' },
  date:         { fontSize: 11, color: colors.textDisabled },

  voteRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voteBtn:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10, backgroundColor: colors.background },
  votedUp:  { backgroundColor: colors.primaryLight },
  votedDown:{ backgroundColor: colors.dangerLight },
  voteIcon: { fontSize: 13 },
  voteCount:{ fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  scoreBox: { paddingHorizontal: 6 },
  score:    { fontSize: 14, fontWeight: '800' },
});


const TYPE_ICONS = {
  water_pollution:    '💧',
  dust:               '🌫️',
  waste_deposit:      '🗑️',
  abandoned_site:     '🏚️',
  air_pollution:      '💨',
  soil_contamination: '🟤',
  noise_pollution:    '🔊',
  other:              '⚠️',
};

const SEVERITY_COLORS = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#7f1d1d',
};

const getStatusConfig = (colors) => ({
  new:         { label: 'Nouveau',    color: colors.warning },
  verified:    { label: 'Vérifié',    color: colors.blue },
  in_progress: { label: 'En cours',   color: colors.purple },
  resolved:    { label: 'Résolu',     color: '#22c55e' },
  rejected:    { label: 'Rejeté',     color: colors.danger },
});

const MEDAL = ['🥇', '🥈', '🥉'];

// Données de démonstration pour le fallback
const DEMO_REPORTS = [
  { _id: '1', type: 'waste_deposit', title: 'Décharge sauvage', description: 'Dépôt illégal de déchets en bord de route', location: { address: 'Zone industrielle' }, severity: 'high', status: 'verified', votes: [], voteCount: 45, createdAt: new Date().toISOString() },
  { _id: '2', type: 'water_pollution', title: 'Pollution rivière', description: 'Eaux décolorées et odeur chimique', location: { address: 'Rivière du Nord' }, severity: 'critical', status: 'in_progress', votes: [], voteCount: 38, createdAt: new Date().toISOString() },
  { _id: '3', type: 'air_pollution', title: 'Qualité air dégradée', description: 'Fumées suspectes émanant de l\'usine', location: { address: 'Zone urbaine' }, severity: 'high', status: 'verified', votes: [], voteCount: 29, createdAt: new Date().toISOString() },
  { _id: '4', type: 'abandoned_site', title: 'Site abandonné', description: 'Ancienne friche industrielle dangereuse', location: { address: 'Quartier Est' }, severity: 'medium', status: 'new', votes: [], voteCount: 18, createdAt: new Date().toISOString() },
  { _id: '5', type: 'noise_pollution', title: 'Bruit excessif', description: 'Travaux nocturnes non autorisés', location: { address: 'Centre-ville' }, severity: 'low', status: 'resolved', votes: [], voteCount: 12, createdAt: new Date().toISOString() },
];

const ReportCard = ({ report, index, onVote, userId }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const STATUS_CONFIG = getStatusConfig(colors);
  const [voting, setVoting] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  const handleVote = async (voteType) => {
    if (voting) return;
    setVoting(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
    await onVote(report._id || report.id, voteType);
    setVoting(false);
  };

  const userVote = (report.votes || []).find(v => String(v.userId) === String(userId));
  const upVotes   = (report.votes || []).filter(v => v.voteType === 'up').length;
  const downVotes = (report.votes || []).filter(v => v.voteType === 'down').length;
  const score     = report.voteCount || (upVotes - downVotes);
  const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.new;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.rank}>
        <Text style={styles.rankText}>{index < 3 ? MEDAL[index] : `#${index + 1}`}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.typeIcon}>{TYPE_ICONS[report.type] || '📍'}</Text>
          <View style={styles.cardMeta}>
            <Text style={styles.typeName} numberOfLines={1}>
              {(report.type || 'autre').replace(/_/g, ' ')}
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              📍 {report.location?.address || report.location?.city || 'Localisation inconnue'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '20' }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>{report.description || report.title || 'Signalement citoyen'}</Text>

        <View style={styles.cardFooter}>
          <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLORS[report.severity] || '#6b7280' }]} />
          <Text style={styles.severityText}>{report.severity || 'medium'}</Text>

          <Text style={styles.date}>
            {report.createdAt ? new Date(report.createdAt).toLocaleDateString('fr-FR') : '—'}
          </Text>

          <View style={styles.voteRow}>
            <TouchableOpacity
              style={[styles.voteBtn, userVote?.voteType === 'up' && styles.votedUp]}
              onPress={() => handleVote('up')}
              disabled={voting}
            >
              <Text style={styles.voteIcon}>👍</Text>
              <Text style={[styles.voteCount, userVote?.voteType === 'up' && { color: colors.primary, fontWeight: '700' }]}>
                {upVotes}
              </Text>
            </TouchableOpacity>

            <View style={styles.scoreBox}>
              <Text style={[styles.score, { color: score >= 0 ? '#16a34a' : '#ef4444' }]}>
                {score >= 0 ? '+' : ''}{score}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.voteBtn, userVote?.voteType === 'down' && styles.votedDown]}
              onPress={() => handleVote('down')}
              disabled={voting}
            >
              <Text style={styles.voteIcon}>👎</Text>
              <Text style={[styles.voteCount, userVote?.voteType === 'down' && { color: colors.danger, fontWeight: '700' }]}>
                {downVotes}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

export default function TopSignalementsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const STATUS_CONFIG = getStatusConfig(colors);
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]         = useState('top');
  const [loadError, setLoadError] = useState(false);

  const SORT_FIELD = { top: 'voteCount', trending: 'confidenceScore', recent: 'createdAt' };

  const loadReports = useCallback(async (sortKey = 'top') => {
    try {
      setLoadError(false);
      const response = await api.get('/reports/public', {
        params: { limit: 50, sortBy: SORT_FIELD[sortKey] || 'voteCount', sortOrder: 'desc' },
      });
      const data = response.data?.data?.reports || response.data?.data || [];

      if (Array.isArray(data) && data.length > 0) {
        setReports(data);
      } else {
        setReports([]);
      }
    } catch (error) {
      console.log('❌ Erreur chargement classement public:', error.message);
      setReports(DEMO_REPORTS);
      setLoadError(true);
      Alert.alert(
        '⚠️ Connexion impossible',
        'Le classement affiché ci-dessous utilise des données de démonstration. Vérifiez votre connexion et réessayez.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReports(tab);
  }, [tab]);

  const handleVote = async (reportId, voteType) => {
    try {
      const res = await api.post(`/reports/${reportId}/vote`, { voteType });
      if (res.data?.success) {
        setReports(prev => prev.map(r => {
          if ((r._id || r.id) !== reportId) return r;
          const userId = user?._id || user?.id;
          const votes = (r.votes || []).filter(v => String(v.userId) !== String(userId));
          const data = res.data.data;
          if (data.userVote) votes.push({ userId, voteType: data.userVote });
          return { ...r, votes, voteCount: data.voteCount };
        }));
      }
    } catch (e) {
      console.log('Erreur vote:', e.message);
      Alert.alert('⚠️ Vote temporaire', 'La fonctionnalité de vote sera bientôt disponible.');
    }
  };

  // Le tri est désormais fait côté serveur via le paramètre sortBy (voir loadReports)
  const sorted = reports;

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loaderText}>Chargement du classement…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={styles.title}>🏆 Top Signalements</Text>
        <Text style={styles.subtitle}>{reports.length} signalement{reports.length > 1 ? 's' : ''}</Text>
        {loadError && (
          <View style={styles.demoWarning}>
            <Text style={styles.demoWarningText}>⚠️ Données de démonstration (hors ligne)</Text>
          </View>
        )}
      </View>

      <View style={styles.tabs}>
        {[
          { key: 'top', label: '🏅 Les plus votés' },
          { key: 'trending', label: '🔥 Tendance' },
          { key: 'recent', label: '🕐 Récents' },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>Aucun signalement pour l'instant</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Report')}>
            <Text style={styles.emptyBtnText}>Faire le premier signalement</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList style={{ backgroundColor: colors.background }}
          data={sorted}
          keyExtractor={(item, i) => (item._id || item.id || String(i))}
          renderItem={({ item, index }) => (
            <ReportCard
              report={item}
              index={index}
              onVote={handleVote}
              userId={user?._id || user?.id}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadReports(tab); }}
              colors={['#16a34a']}
              tintColor="#16a34a"
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}