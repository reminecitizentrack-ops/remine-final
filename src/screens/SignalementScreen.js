import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Linking, 
  Alert,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSignalement } from '../context/SignalementContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import reportService from '../services/reports';
import { getStatusStyle, getStatusColor, getStatusLabel, getSeverityStyle, getSeverityColor, getTypeIcon, getTypeLabel, formatDate, formatRelativeDate } from '../theme/helpers';
import { fontSize, spacing, radius, shadow } from '../theme';

// Fonction utilitaire pour la localisation
const getLocationText = (location) => {
  if (!location) return 'Localisation non précisée';
  
  if (typeof location === 'string') return location;
  
  if (typeof location === 'object') {
    return location.address || 
           location.name || 
           (location.latitude && location.longitude 
             ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
             : 'Localisation non précisée');
  }
  
  return 'Localisation non précisée';
};

// Composants mémoïsés pour de meilleures performances
const ReportCard = React.memo(({ 
  report, 
  onPress, 
  onMapPress, 
  showUser = true,
  showActions = false 
}) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity 
      style={styles.reportCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        <Text style={styles.reportType}>
          {getTypeIcon(report.type)}
        </Text>
        <View style={styles.statusPriorityContainer}>
          <View style={[styles.statusBadge, { 
            backgroundColor: getStatusStyle(report.status, colors).bg,
            borderColor: getStatusStyle(report.status, colors).border,
          }]}>
            <Text style={[styles.statusText, { color: getStatusStyle(report.status, colors).color }]}>
              {getStatusLabel(report.status)}
            </Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: getSeverityColor(report.priorite, colors) }]}>
            <Text style={styles.priorityText}>
              {report.priorite?.toUpperCase() || 'MOYENNE'}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.reportDescription} numberOfLines={3}>
        {report.description}
      </Text>
      
      <View style={styles.reportDetails}>
        <Text style={styles.reportLocation}>
          📍 {getLocationText(report.localisation || report.location)}
        </Text>
        {showUser && report.userName && (
          <Text style={styles.reportUser}>
            👤 {report.userName}
          </Text>
        )}
        <Text style={styles.reportDate}>
          📅 {new Date(report.date).toLocaleDateString('fr-FR')}
          {report.photos?.length > 0 && ` • 📷 ${report.photos.length}`}
        </Text>
      </View>

      {showActions && (
        <View style={styles.reportActions}>
          {report.coordinates && (
            <TouchableOpacity 
              style={styles.smallButton}
              onPress={onMapPress}
            >
              <Text style={styles.smallButtonText}>🗺️ Carte</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.smallButton, styles.secondarySmallButton]}
            onPress={onPress}
          >
            <Text style={styles.smallButtonText}>📋 Détails</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!showActions && report.coordinates && (
        <TouchableOpacity 
          style={styles.viewOnMapButton}
          onPress={onMapPress}
        >
          <Text style={styles.viewOnMapText}>🗺️ Voir sur la carte</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
});

const StatsOverview = React.memo(({ stats, title, isPersonal = false }) => {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  return (
  <View style={styles.statsContainer}>
    <Text style={styles.statsTitle}>{title}</Text>
    <View style={styles.statsGrid}>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.total || 0}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.nouveau || 0}</Text>
        <Text style={styles.statLabel}>Nouveaux</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.en_cours || 0}</Text>
        <Text style={styles.statLabel}>En Cours</Text>
      </View>
      <View style={styles.statItem}>
        <Text style={styles.statNumber}>{stats.resolu || 0}</Text>
        <Text style={styles.statLabel}>Résolus</Text>
      </View>
    </View>
  </View>
);
});

const MapRegion = React.memo(({ region, reports, colors }) => {
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const regionReports = useMemo(() => 
    reports.filter(r => {
      const location = getLocationText(r.localisation || r.location);
      return location.includes(region);
    }), 
    [reports, region]
  );

  if (regionReports.length === 0) return null;

  return (
    <View style={styles.mapRegion}>
      <Text style={styles.regionTitle}>{region}</Text>
      <View style={styles.markerContainer}>
        {regionReports.map(report => (
          <View 
            key={report.id}
            style={[
              styles.marker, 
              { backgroundColor: getStatusColor(report.status, colors) }
            ]} 
          />
        ))}
        <Text style={styles.markerText}>
          {regionReports.length} signalement(s)
        </Text>
      </View>
    </View>
  );
});

export default function SignalementScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { 
    getSignalementsForMap, 
    getMapStats, 
    getUserSignalements,
    getAllSignalements,
    getStats,
    signalements
  } = useSignalement();
  
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('carte');
  const [reports, setReports] = useState([]);
  const [mapStats, setMapStats] = useState({});
  const [userStats, setUserStats] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Recherche, filtres et tri (onglet Liste) ────────────────────────────
  const [searchQuery,  setSearchQuery]  = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType,   setFilterType]   = useState('all');
  const [sortBy,       setSortBy]       = useState('recent'); // recent | oldest | severity
  const [showFilters,  setShowFilters]  = useState(false);

  const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

  const filteredReports = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = reports.filter(r => {
      const matchSearch = !q
        || (r.description || '').toLowerCase().includes(q)
        || (getLocationText(r.location) || '').toLowerCase().includes(q)
        || (getTypeLabel(r.type) || '').toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || r.status === filterStatus;
      const matchType   = filterType   === 'all' || r.type   === filterType;
      return matchSearch && matchStatus && matchType;
    });

    if (sortBy === 'recent') {
      result = [...result].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'oldest') {
      result = [...result].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sortBy === 'severity') {
      result = [...result].sort((a, b) => (SEVERITY_RANK[b.severity] || 0) - (SEVERITY_RANK[a.severity] || 0));
    }
    return result;
  }, [reports, searchQuery, filterStatus, filterType, sortBy]);




  // Charger les données depuis le backend
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      let signalementsData = [];

      if (activeTab === 'mes-signalements') {
        const result = await reportService.getUserReports(user);
        if (result.success) signalementsData = result.data || [];
      } else {
        const result = await reportService.getAllReports();
        if (result.success) signalementsData = result.data || [];
      }

      // Normaliser le format pour ReportCard
      signalementsData = signalementsData.map(r => ({
        ...r,
        id: r._id || r.id,
        localisation: r.location?.address || r.address || 'Non précisée',
        coordinates: r.location?.latitude ? {
          latitude: r.location.latitude,
          longitude: r.location.longitude,
        } : null,
        userName: r.citizen?.firstName
          ? (r.citizen.firstName + ' ' + (r.citizen.lastName || '')).trim()
          : (r.citizen?.email || 'Anonyme'),
        date: r.createdAt || r.date || new Date().toISOString(),
        status: r.status || 'new',
      }));

      setReports(signalementsData);
      setMapStats({ total: signalementsData.length });
      setUserStats({ total: signalementsData.length });

      Animated.timing(fadeAnim, {
        toValue: 1, duration: 300, useNativeDriver: true,
      }).start();

    } catch (error) {
      console.log('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, user, fadeAnim]);

  // Surveiller les changements
  useEffect(() => {
    loadData();
  }, [loadData, signalements]); // Recharge quand les signalements changent

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const openInGoogleMaps = useCallback((coordinates) => {
    if (!coordinates?.latitude || !coordinates?.longitude) {
      Alert.alert('Erreur', 'Aucune coordonnée disponible pour ce signalement');
      return;
    }
    
    const url = `https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Erreur', 'Impossible d\'ouvrir Google Maps');
    });
  }, []);

  const handleReportPress = useCallback((report) => {
    setSelectedReport(report);
  }, []);

  const handleMapPress = useCallback((report) => {
    openInGoogleMaps(report.coordinates);
  }, [openInGoogleMaps]);

  // Données mémoïsées
  const regions = useMemo(() => ['Dakar', 'Thiès', 'Rufisque', 'Saint-Louis'], []);
  
  const displayStats = useMemo(() => ({
    total: mapStats.total || reports.length,
    nouveau: mapStats.parStatut?.nouveau || 0,
    en_cours: mapStats.parStatut?.en_cours || 0,
    resolu: mapStats.parStatut?.resolu || 0,
  }), [mapStats, reports.length]);

  // Composants de vue
  const MapView = useMemo(() => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🗺️ Carte des Signalements</Text>
      
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapTitle}>🌍 Carte Interactive ReMine</Text>
        <Text style={styles.mapDescription}>
          {reports.length} signalement(s) géolocalisé(s)
        </Text>
        
        <View style={styles.mapGrid}>
          {regions.map(region => (
            <MapRegion 
              key={region}
              region={region}
              reports={reports}
              colors={colors}
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.mapsButton}
          onPress={() => Linking.openURL('https://www.google.com/maps/@14.7167,-17.4677,8z')}
        >
          <Text style={styles.mapsButtonText}>📱 Ouvrir dans Google Maps</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.createReportButton}
        onPress={() => navigation.navigate('Report')}
      >
        <Text style={styles.createReportText}>📤 Signaler un problème ici</Text>
      </TouchableOpacity>
    </Animated.View>
  ), [reports, regions, fadeAnim, navigation]);

  const ListView = useMemo(() => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <View style={styles.listHeaderRow}>
        <Text style={styles.sectionTitle}>
          📋 Signalements ({filteredReports.length}/{reports.length})
        </Text>
        <TouchableOpacity
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnActive]}
          onPress={() => setShowFilters(v => !v)}
        >
          <Ionicons name="filter" size={18} color={showFilters ? '#fff' : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
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

      {/* Panneau de filtres + tri */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <Text style={styles.filtersPanelTitle}>Trier par</Text>
          <View style={styles.sortRow}>
            {[
              { key: 'recent',   label: '🕐 Récent'  },
              { key: 'oldest',   label: '📅 Ancien'  },
              { key: 'severity', label: '⚠️ Sévérité' },
            ].map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.filterChip, sortBy === s.key && styles.filterChipActive]}
                onPress={() => setSortBy(s.key)}
              >
                <Text style={[styles.filterChipText, sortBy === s.key && styles.filterChipTextActive]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
              { key: 'all',             label: 'Tous'        },
              { key: 'water_pollution', label: '💧 Eau'      },
              { key: 'dust',            label: '🌫️ Poussière'},
              { key: 'air_pollution',   label: '💨 Air'      },
              { key: 'waste_deposit',   label: '🗑️ Déchets'  },
              { key: 'abandoned_site',  label: '🏚️ Site'     },
              { key: 'noise_pollution', label: '🔊 Bruit'    },
              { key: 'other',           label: '⚠️ Autre'    },
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

      <ScrollView 
        style={styles.reportsScrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {reports.length === 0 ? 'Aucun signalement pour le moment' : 'Aucun résultat pour ces critères'}
            </Text>
            {reports.length === 0 ? (
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => navigation.navigate('Report')}
              >
                <Text style={styles.emptyStateButtonText}>Créer le premier signalement</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => { setSearchQuery(''); setFilterStatus('all'); setFilterType('all'); }}
              >
                <Text style={styles.emptyStateButtonText}>Réinitialiser les filtres</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredReports.map(report => (
            <ReportCard 
              key={report.id}
              report={report}
              onPress={() => handleReportPress(report)}
              onMapPress={() => handleMapPress(report)}
              showUser={true}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  ), [reports, filteredReports, refreshing, onRefresh, handleReportPress, handleMapPress, fadeAnim, navigation, searchQuery, filterStatus, filterType, sortBy, showFilters, colors]);

  const MyReportsView = useMemo(() => (
    <Animated.View style={[styles.tabContent, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>👤 Mes Signalements</Text>
      
      <StatsOverview 
        stats={userStats}
        title="📊 Mes Statistiques"
        isPersonal={true}
      />

      <ScrollView 
        style={styles.reportsScrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Vous n'avez encore créé aucun signalement</Text>
            <TouchableOpacity 
              style={styles.emptyStateButton}
              onPress={() => navigation.navigate('Report')}
            >
              <Text style={styles.emptyStateButtonText}>Créer mon premier signalement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          reports.map(report => (
            <ReportCard 
              key={report.id}
              report={report}
              onPress={() => handleReportPress(report)}
              onMapPress={() => handleMapPress(report)}
              showUser={false}
              showActions={true}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  ), [reports, userStats, refreshing, onRefresh, handleReportPress, handleMapPress, fadeAnim, navigation]);

  // Écran de chargement
  if (isLoading && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2ecc71" />
        <Text style={styles.loadingText}>Chargement des signalements...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* En-tête avec statistiques globales */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={styles.title}>📊 Signalements</Text>
        <Text style={styles.subtitle}>Suivi et visualisation en temps réel</Text>
        
        <StatsOverview stats={displayStats} title="📈 Aperçu Global" />
      </View>

      {/* Navigation par onglets */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
        {[
          { key: 'carte', label: '🗺️ Carte' },
          { key: 'liste', label: '📋 Tous' },
          { key: 'mes-signalements', label: '👤 Mes' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && styles.tabButtonActive
            ]}
            onPress={() => {
              setActiveTab(tab.key);
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
              }).start(() => {
                fadeAnim.setValue(0);
              });
            }}
          >
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.tabTextActive
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu de l'onglet actif */}
      <View style={styles.content}>
        {activeTab === 'carte' && MapView}
        {activeTab === 'liste' && ListView}
        {activeTab === 'mes-signalements' && MyReportsView}
      </View>

      {/* Modal de détails */}
      {selectedReport && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{getTypeIcon(selectedReport.type)}</Text>
            <Text style={styles.modalDescription}>{selectedReport.description}</Text>
            
            <View style={styles.modalDetails}>
              <Text style={styles.detailItem}>
                📍 <Text style={styles.detailLabel}>Localisation:</Text> {getLocationText(selectedReport.localisation || selectedReport.location)}
              </Text>
              <Text style={styles.detailItem}>
                📊 <Text style={styles.detailLabel}>Statut:</Text> {getStatusLabel(selectedReport.status)}
              </Text>
              <Text style={styles.detailItem}>
                🚨 <Text style={styles.detailLabel}>Priorité:</Text> {selectedReport.priorite || 'moyenne'}
              </Text>
              <Text style={styles.detailItem}>
                🕐 <Text style={styles.detailLabel}>Date:</Text> {new Date(selectedReport.date).toLocaleDateString('fr-FR')}
              </Text>
              {selectedReport.userName && (
                <Text style={styles.detailItem}>
                  👤 <Text style={styles.detailLabel}>Signalé par:</Text> {selectedReport.userName}
                </Text>
              )}
            </View>

            <View style={styles.modalActions}>
              {selectedReport.coordinates && (
                <TouchableOpacity 
                  style={styles.modalButton}
                  onPress={() => openInGoogleMaps(selectedReport.coordinates)}
                >
                  <Text style={styles.modalButtonText}>🗺️ Ouvrir dans Maps</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.secondaryButton]}
                onPress={() => setSelectedReport(null)}
              >
                <Text style={styles.modalButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
  },
  loadingText: {
    marginTop: 10,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.surface,
    padding: 20,
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
    color: colors.primary,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButton: {
    flex: 1,
    padding: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  tabButtonActive: {
    backgroundColor: colors.blue,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: 'white',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    padding: 15,
  },
  // Styles pour les statistiques
  statsContainer: {
    backgroundColor: colors.backgroundAlt,
    padding: 15,
    borderRadius: radius.md,
    marginBottom: 10,
  },
  statsTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textPrimary,
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
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Styles pour MapView
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.textPrimary,
  },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  filterToggleBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  filterToggleBtnActive: { backgroundColor: colors.primary },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight },
  searchInput: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  filtersPanel: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.borderLight },
  filtersPanelTitle: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  sortRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  filterChipTextActive: { color: colors.primary, fontWeight: '700' },
  mapPlaceholder: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: radius.md,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: colors.blue,
  },
  mapDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
  },
  mapGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  mapRegion: {
    alignItems: 'center',
    padding: 10,
    margin: 5,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radius.sm,
    minWidth: 80,
  },
  regionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: 8,
    color: colors.textPrimary,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 12,
    height: 12,
    borderRadius: radius.sm,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  markerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  mapsButton: {
    backgroundColor: colors.blue,
    padding: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginBottom: 10,
  },
  mapsButtonText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  createReportButton: {
    backgroundColor: colors.danger,
    padding: 15,
    borderRadius: radius.sm,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createReportText: {
    color: 'white',
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  // Styles pour les cartes de signalement
  reportsScrollView: {
    flex: 1,
  },
  reportCard: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: radius.md,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reportType: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
  },
  statusPriorityContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xl,
    marginBottom: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  priorityText: {
    color: 'white',
    fontSize: 8,
    fontWeight: 'bold',
  },
  reportDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  reportDetails: {
    marginBottom: 10,
  },
  reportLocation: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reportUser: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  viewOnMapButton: {
    backgroundColor: colors.blueLight,
    padding: 8,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  viewOnMapText: {
    color: colors.blue,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  reportActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
  },
  smallButton: {
    backgroundColor: colors.blue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    marginRight: 8,
  },
  secondarySmallButton: {
    backgroundColor: colors.textMuted,
  },
  smallButtonText: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  // Styles pour les états vides
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  emptyStateText: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: colors.blue,
    padding: 12,
    borderRadius: radius.sm,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  // Styles pour le modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: radius.md,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.textPrimary,
  },
  modalDescription: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  modalDetails: {
    marginBottom: 20,
  },
  detailItem: {
    fontSize: fontSize.sm,
    marginBottom: 6,
    color: colors.textPrimary,
  },
  detailLabel: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    backgroundColor: colors.blue,
    padding: 12,
    borderRadius: radius.sm,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.textMuted,
  },
  modalButtonText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});