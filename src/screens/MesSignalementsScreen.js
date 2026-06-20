// src/screens/MesSignalementsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import reportService from '../services/reports';
import EmptyState from '../components/EmptyState';
import { SkeletonMesSignalements } from '../components/SkeletonLoader';
import { useTheme } from '../context/ThemeContext';
import { getStatusStyle, getStatusColor, getStatusLabel, getSeverityStyle, getSeverityColor, getTypeIcon, getTypeLabel, formatDate, formatRelativeDate } from '../theme/helpers';
import { fontSize, spacing, radius, shadow } from '../theme';

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  newReportButton: {
    backgroundColor: colors.blue,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt,
  },
  searchInput: {
    flex: 1, fontSize: fontSize.md, color: colors.textPrimary, paddingVertical: 4,
  },
  filtersPanel: {
    backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt,
  },
  filtersPanelTitle: {
    fontSize: fontSize.xs, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg,
    backgroundColor: colors.background, marginRight: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  filterChipActive:     { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText:       { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: colors.primary, fontWeight: '700' },
  authRequiredIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  authRequiredTitle: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  authRequiredText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  authButton: {
    backgroundColor: colors.blue,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authButtonText: {
    color: 'white',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 50,
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: 'white',
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 80,
  },
  statsContainer: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 15,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reportCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportType: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  typeIcon: {
    fontSize: fontSize.xl,
    marginRight: 12,
    marginTop: 2,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  reportLocation: {
    fontSize: fontSize.md,
    color: colors.blue,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xl,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  reportDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 15,
  },
  photosSection: {
    marginBottom: 15,
  },
  photosText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  photosScroll: {
    flexDirection: 'row',
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.backgroundAlt,
  },
  morePhotos: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.textDisabled,
  },
  morePhotosText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.backgroundAlt,
    paddingTop: 12,
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  reportDate: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: 4,
  },
  voteCount: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  severity: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  reportActions:    { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.background },
  reportActionBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: radius.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  reportActionIcon: { fontSize: fontSize.md },
  reportActionText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  ownershipBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.blueLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.blueMid,
  },
  ownershipText: {
    fontSize: fontSize.xs,
    color: colors.blue,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    backgroundColor: colors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});


export default function MesSignalementsScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType,   setFilterType]   = useState('all');
  const [showFilters,  setShowFilters]  = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  // Filtrage combiné recherche + statut + type
  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q
      || (r.description || '').toLowerCase().includes(q)
      || (r.location?.address || r.address || r.localisation || '').toLowerCase().includes(q)
      || (r.type || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchType   = filterType   === 'all' || r.type   === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const loadUserReports = useCallback(async () => {
    try {
      if (__DEV__) console.log('👤 Chargement de MES signalements...');
      setLoading(true);
      
      if (!user) {
        Alert.alert('Connexion requise', 'Veuillez vous connecter pour voir vos signalements');
        return;
      }

      const result = await reportService.getUserReports(user);
      
      if (result.success) {
        // ✅ CORRECTIF : on ne logge pas les données privées (email, liste item par item)
        if (__DEV__) console.log(`✅ ${result.data.length} signalement(s) chargé(s)`);
        setReports(result.data || []);
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de charger vos signalements');
      }
    } catch (error) {
      if (__DEV__) console.error('❌ Erreur chargement mes signalements:', error.message);
      Alert.alert('Erreur', 'Impossible de charger vos signalements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadUserReports();
  }, [loadUserReports]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserReports();
  }, [loadUserReports]);

  // ✅ Fonctions centralisées dans theme/helpers.js :
  // getTypeIcon(type), getStatusStyle(status, colors), getStatusLabel(status), formatDate(date)

  const ReportCard = ({ report, index }) => (
    <TouchableOpacity 
      style={styles.reportCard}
      onPress={() => navigation.navigate('Signalement', { 
        signalementId: report.id || report._id 
      })}
    >
      <View style={styles.reportHeader}>
        <View style={styles.reportType}>
          <Text style={styles.typeIcon}>{getTypeIcon(report.type)}</Text>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle} numberOfLines={1}>
              {report.title || `Signalement ${report.type}`}
            </Text>
            <Text style={styles.reportLocation} numberOfLines={1}>
              {report.location?.address || report.address || report.localisation || 'Localisation non précisée'}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { 
          backgroundColor: getStatusStyle(report.status, colors).bg,
          borderColor:     getStatusStyle(report.status, colors).border,
        }]}>
          <Text style={[styles.statusText, { color: getStatusStyle(report.status, colors).text }]}>
            {getStatusStyle(report.status, colors).icon} {getStatusLabel(report.status)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.reportDescription} numberOfLines={2}>
        {report.description}
      </Text>

      {report.photos && report.photos.length > 0 && (
        <View style={styles.photosSection}>
          <Text style={styles.photosText}>
            📷 {report.photos.length} photo{report.photos.length > 1 ? 's' : ''}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            {report.photos.slice(0, 3).map((photo, photoIndex) => (
              <Image 
                key={photoIndex}
                source={{ uri: photo.url || photo.thumbnail }}
                style={styles.photoThumbnail}
              />
            ))}
            {report.photos.length > 3 && (
              <View style={styles.morePhotos}>
                <Text style={styles.morePhotosText}>+{report.photos.length - 3}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.reportFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.reportDate}>
            📅 {formatDate(report.createdAt, { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.voteCount}>
            👍 {report.voteCount || 0} votes
          </Text>
        </View>
        <View style={styles.footerRight}>
          <Text style={[styles.severity, { color: getSeverityStyle(report.severity, colors).color }]}>
            {getSeverityStyle(report.severity, colors).icon} {getSeverityStyle(report.severity, colors).label}
          </Text>
        </View>
      </View>

      {/* Indicateur que c'est votre signalement */}
      <View style={styles.ownershipBadge}>
        <Ionicons name="person" size={12} color="#3498db" />
        <Text style={styles.ownershipText}>Votre signalement</Text>
      </View>

      {/* Actions commentaires & partage */}
      <View style={styles.reportActions}>
        <TouchableOpacity
          style={styles.reportActionBtn}
          onPress={() => navigation.navigate('Comments', {
            reportId:     report._id || report.id,
            reportType:   report.type,
            reportStatus: report.status,
          })}
        >
          <Text style={styles.reportActionIcon}>💬</Text>
          <Text style={styles.reportActionText}>Messages</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reportActionBtn}
          onPress={() => navigation.navigate('Share', { report })}
        >
          <Text style={styles.reportActionIcon}>📤</Text>
          <Text style={styles.reportActionText}>Partager</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (!user) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={styles.authRequiredIcon}>🔐</Text>
        <Text style={styles.authRequiredTitle}>Connexion requise</Text>
        <Text style={styles.authRequiredText}>
          Connectez-vous pour voir vos signalements
        </Text>
        <TouchableOpacity 
          style={styles.authButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.authButtonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <Text style={styles.headerTitle}>📋 Mes Signalements</Text>
        </View>
        <SkeletonMesSignalements />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>📋 Mes Signalements</Text>
          <Text style={styles.subtitle}>
            {filteredReports.length}/{reports.length} signalement{reports.length > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.newReportButton, { backgroundColor: colors.blue }]}
            onPress={() => setShowFilters(v => !v)}
          >
            <Ionicons name="filter" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Rechercher par type, description, lieu…"
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filtres avancés */}
      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <Text style={styles.filtersPanelTitle}>Statut</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {[
              { key: 'all',         label: 'Tous'      },
              { key: 'new',         label: '🆕 Nouveau' },
              { key: 'verified',    label: '✅ Vérifié' },
              { key: 'in_progress', label: '🔄 En cours'},
              { key: 'resolved',    label: '✓ Résolu'  },
              { key: 'rejected',    label: '✕ Rejeté'  },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filterStatus === f.key && styles.filterChipActive]}
                onPress={() => setFilterStatus(f.key)}
              >
                <Text style={[styles.filterChipText, filterStatus === f.key && styles.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.filtersPanelTitle}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { key: 'all',            label: 'Tous'       },
              { key: 'water_pollution',label: '💧 Eau'     },
              { key: 'dust',           label: '🌫️ Poussière'},
              { key: 'air_pollution',  label: '💨 Air'     },
              { key: 'waste_deposit',  label: '🗑️ Déchets' },
              { key: 'abandoned_site', label: '🏚️ Site'    },
              { key: 'noise_pollution',label: '🔊 Bruit'   },
              { key: 'other',          label: '⚠️ Autre'   },
            ].map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filterType === f.key && styles.filterChipActive]}
                onPress={() => setFilterType(f.key)}
              >
                <Text style={[styles.filterChipText, filterType === f.key && styles.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {reports.length === 0 ? (
        <ScrollView 
          style={styles.emptyContainer}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📤</Text>
            <Text style={styles.emptyStateTitle}>Aucun signalement</Text>
            <Text style={styles.emptyStateText}>
              Vous n'avez pas encore créé de signalement.{'\n'}
              Créez votre premier signalement pour contribuer à une mine responsable.
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('Report')}
            >
              <Ionicons name="add" size={20} color="white" />
              <Text style={styles.createButtonText}>Créer un signalement</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredReports}
          keyExtractor={(item, index) => item.id || item._id || index.toString()}
          renderItem={({ item, index }) => <ReportCard report={item} index={index} />}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={() => (
            <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
              <Text style={styles.statsTitle}>Résumé de vos contributions</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>{reports.length}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {reports.filter(r => r.status === 'resolved').length}
                  </Text>
                  <Text style={styles.statLabel}>Résolus</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statNumber}>
                    {reports.filter(r => r.status === 'in_progress').length}
                  </Text>
                  <Text style={styles.statLabel}>En cours</Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}