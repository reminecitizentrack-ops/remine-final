import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  RefreshControl,
  Animated,
  Image,
  Alert,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import reportService from '../services/reports';
import VotingButtons from '../components/VotingButtons';
import { keyExtractors, removeDuplicates, generateUniqueKey } from '../utils/listHelpers';
import EmptyState from '../components/EmptyState';
import { SkeletonHome } from '../components/SkeletonLoader';
import { useTheme } from '../context/ThemeContext';
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

const DRAFT_KEY = '@report_draft';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { requestPermissions } = useNotification();

  // Demander permissions notifications au démarrage
  useEffect(() => {
    if (user) requestPermissions();
  }, [user, requestPermissions]);
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ 
    totalReports: 0, 
    newReports: 0, 
    resolvedReports: 0,
    resolutionRate: 0
  });
  const [recentReports, setRecentReports] = useState([]);
  const [topReports, setTopReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // ✅ CORRECTIF : le useEffect précédent appelait setRecentReports/setTopReports
  // à chaque render ce qui recréait une boucle infinie. Les doublons sont maintenant
  // supprimés directement dans loadData() avant le setState — pas besoin d'un effet séparé.

  // Fonction pour les données par défaut
  const setDefaultData = () => {
    setStats({
      totalReports: 0,
      newReports: 0,
      resolvedReports: 0,
      resolutionRate: 0
    });
    setRecentReports([]);
    setTopReports([]);
  };

  // Charger les données depuis l'API
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (__DEV__) console.log('🔄 Chargement des données...');
      if (!isRefresh) setIsLoading(true); // n'affiche le skeleton qu'au chargement initial, pas au pull-to-refresh
      
      // Test de connexion d'abord
      try {
        const connectionTest = await reportService.testConnection();
        if (!connectionTest.success) {
          throw new Error('API non accessible');
        }
      } catch (connectionError) {
        if (__DEV__) console.log('❌ API non accessible:', connectionError.message);
        Alert.alert(
          'Hors ligne', 
          'Mode hors ligne activé. Les données peuvent ne pas être à jour.',
          [{ text: 'OK' }]
        );
        // Continuer en mode hors ligne avec des données par défaut
        setDefaultData();
        return;
      }
      
      // Charger les statistiques avec timeout
      const statsPromise = Promise.race([
        reportService.getReportsStats(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout stats')), 10000)
        )
      ]);
      
      // Charger les signalements avec timeout
      const reportsPromise = Promise.race([
        reportService.getAllReports({
          limit: 10,
          page: 1,
          sort: 'createdAt'
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout reports')), 10000)
        )
      ]);

      const [statsResponse, reportsResponse] = await Promise.all([
        statsPromise,
        reportsPromise
      ]);

      // Vérifier que les réponses contiennent des données
      const rawStats   = statsResponse?.data || statsResponse || {};
      // Normaliser : certaines routes renvoient les stats dans overview
      const statsData  = rawStats.overview || rawStats;
      const reportsData = reportsResponse?.data || reportsResponse || [];
      
      if (__DEV__) console.log(`📊 ${Array.isArray(reportsData) ? reportsData.length : 0} signalements reçus`);

      // Calculer les stats avec valeurs par défaut
      const total          = statsData.totalReports    || statsData.total    || 0;
      const resolved       = statsData.resolvedReports || statsData.resolved || 0;
      const newReports     = statsData.newReports      || statsData.activeReports || statsData.byStatus?.new || 0;
      const resolutionRate = statsData.resolutionRate  || (total > 0 ? Math.round((resolved / total) * 100) : 0);
      
      setStats({
        totalReports: total,
        newReports: newReports,
        resolvedReports: resolved,
        resolutionRate: resolutionRate
      });
      
      // 🆕 FORMATAGE AVEC IDs UNIQUES GARANTIS ET GESTION DE LOCALISATION
      const formattedRecentReports = Array.isArray(reportsData) 
        ? reportsData.slice(0, 3).map((report, index) => ({
            id: report._id || report.id || generateUniqueKey(report, index, 'recent'),
            type: report.type || 'other',
            description: report.description || 'Aucune description',
            location: report.address || report.location,
            localisation: getLocationText(report.address || report.location), // CORRECTION ICI
            status: report.status || 'new',
            date: report.createdAt || new Date().toISOString(),
            voteCount: report.voteCount || 0,
            severity: report.severity || 'medium'
          }))
        : [];

      // 🆕 NETTOYAGE IMMÉDIAT
      const cleanRecentReports = removeDuplicates(formattedRecentReports);
      setRecentReports(cleanRecentReports);
      
      // 🆕 FORMATAGE AVEC IDs UNIQUES GARANTIS ET GESTION DE LOCALISATION
      const formattedTopReports = Array.isArray(reportsData)
        ? reportsData
            .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
            .slice(0, 3)
            .map((report, index) => ({
              id: report._id || report.id || generateUniqueKey(report, index, 'top'),
              type: report.type || 'other',
              description: report.description || 'Aucune description',
              localisation: getLocationText(report.address || report.location), // CORRECTION ICI
              score: (report.voteCount || 0) * 10,
              voteCount: report.voteCount || 0,
              date: report.createdAt || new Date().toISOString(),
              rank: index + 1
            }))
        : [];

      // 🆕 NETTOYAGE IMMÉDIAT
      const cleanTopReports = removeDuplicates(formattedTopReports);
      setTopReports(cleanTopReports);
      
      // Animation de fondu
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      if (__DEV__) console.warn('❌ Erreur chargement:', error.message);
      setDefaultData();
      // ✅ CORRECTIF : ne pas inspecter error.message pour filtrer l'alerte —
      // en mode hors ligne l'alerte est déjà affichée plus haut via connectionError
    } finally {
      setIsLoading(false);
    }
  }, [fadeAnim]);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Vérifie à chaque retour sur l'accueil si un brouillon de signalement est en attente
  useFocusEffect(
    useCallback(() => {
      let active = true;
      AsyncStorage.getItem(DRAFT_KEY).then(raw => {
        if (active) setHasDraft(!!raw);
      }).catch(() => {});
      return () => { active = false; };
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setLastRefresh(new Date());
    setRefreshing(false);
  }, [loadData]);

  const navigateTo = useCallback((screen) => {
    navigation.navigate(screen);
  }, [navigation]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const getUserDisplayName = () => {
    if (!user) return 'Citoyen';
    return user.firstName || user.email?.split('@')[0] || 'Citoyen';
  };

  // Composant de secours pour les erreurs de chargement
  const ErrorFallback = ({ message, onRetry }) => (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Données indisponibles</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
      </TouchableOpacity>
    </View>
  );

  // 🆕 COMPOSANT CARTE AVEC CLÉS UNIQUES GARANTIES ET GESTION DE LOCALISATION
  const RecentReportCard = React.memo(({ report, showVoting = true }) => {
    // Clé unique garantie
    const cardKey = React.useMemo(() => 
      generateUniqueKey(report, 0, 'recent-card'),
      [report.id]
    );
    return (
      <TouchableOpacity 
        key={cardKey}
        style={styles.recentReportCard}
        onPress={() => navigation.navigate('Signalement', { signalementId: report.id })}
      >
        <View style={styles.reportHeader}>
          <Text style={styles.reportIcon}>{getTypeIcon(report.type)}</Text>
          <View style={styles.reportInfo}>
            {/* CORRECTION : Utilisation de getLocationText */}
            <Text style={styles.reportLocation} numberOfLines={1}>
              {getLocationText(report.localisation)}
            </Text>
            <Text style={styles.reportDate}>
              {new Date(report.date).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(report.status, colors) }]}>
            <Text style={styles.statusText}>{getStatusLabel(report.status)}</Text>
          </View>
        </View>
        
        {/* Indicateur de sévérité */}
        <View style={styles.severityIndicator}>
          <View 
            style={[
              styles.severityDot, 
              { backgroundColor: getSeverityColor(report.severity, colors) }
            ]} 
          />
          <Text style={styles.severityText}>
            {report.severity === 'high' ? 'Élevée' : 
             report.severity === 'medium' ? 'Moyenne' : 
             report.severity === 'critical' ? 'Critique' : 'Faible'}
          </Text>
        </View>
        
        <Text style={styles.reportDescription} numberOfLines={2}>
          {report.description}
        </Text>
        
        {/* Section de votes */}
        {showVoting && (
          <View style={styles.votingSection}>
            <VotingButtons 
              signalementId={report.id}
              compact={true}
              initialVotes={report.voteCount || 0}
              onVote={() => setTimeout(loadData, 300)}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  });

  // 🆕 COMPOSANT TOP CARTE AVEC CLÉS UNIQUES GARANTIES ET GESTION DE LOCALISATION
  const TopReportCard = React.memo(({ report, rank }) => {
    // Clé unique garantie
    const cardKey = React.useMemo(() => 
      generateUniqueKey(report, rank, 'top-card'),
      [report.id, rank]
    );

    const getRankColor = (rank) => {
      if (rank === 1) return '#f39c12'; // Or
      if (rank === 2) return '#7f8c8d'; // Argent
      if (rank === 3) return '#cd7f32'; // Bronze
      return '#3498db';
    };

    return (
      <TouchableOpacity 
        key={cardKey}
        style={styles.topReportCard}
        onPress={() => navigation.navigate('Signalement', { signalementId: report.id })}
      >
        <View style={styles.topReportHeader}>
          <View style={[styles.rankBadge, { backgroundColor: getRankColor(rank) }]}>
            <Text style={styles.rankText}>#{rank}</Text>
          </View>
          <View style={styles.topReportInfo}>
            {/* CORRECTION : Utilisation de getLocationText */}
            <Text style={styles.topReportLocation} numberOfLines={1}>
              {getLocationText(report.localisation)}
            </Text>
            <Text style={styles.topReportDescription} numberOfLines={2}>
              {report.description}
            </Text>
          </View>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreIcon}>🏆</Text>
            <Text style={styles.scoreText}>{report.score || 0}</Text>
            <Text style={styles.voteCount}>({report.voteCount || 0} votes)</Text>
          </View>
        </View>
        
        {/* Boutons de vote pour les tops */}
        <View style={styles.topVotingSection}>
          <VotingButtons 
            signalementId={report.id}
            compact={true}
            initialVotes={report.voteCount || 0}
            onVote={() => setTimeout(loadData, 300)}
          />
        </View>
      </TouchableOpacity>
    );
  });

  const RecentReportsList = React.memo(({ reports }) => {
    return (
      <FlatList
        data={reports}
        keyExtractor={keyExtractors.recent}
        renderItem={({ item }) => (
          <RecentReportCard report={item} showVoting={true} />
        )}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun signalement récent</Text>
        }
      />
    );
  });

  const TopReportsList = React.memo(({ reports }) => {
    return (
      <FlatList
        data={reports}
        keyExtractor={keyExtractors.top}
        renderItem={({ item, index }) => (
          <TopReportCard report={item} rank={index + 1} />
        )}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun signalement populaire</Text>
        }
      />
    );
  });

  // 🆕 COMPOSANT STATS AVEC CLÉS UNIQUES
  const StatsSection = React.memo(() => (
    <Animated.View style={[styles.statsContainer, { opacity: fadeAnim }]}>
      {[
        { value: stats.totalReports, label: 'Total', key: 'stat-total' },
        { value: `${stats.resolutionRate}%`, label: 'Résolus', key: 'stat-resolved' },
        { value: stats.newReports, label: 'Nouveaux', key: 'stat-new' }
      ].map((stat) => (
        <View key={stat.key} style={styles.statCard}>
          <Text style={styles.statNumber}>{stat.value}</Text>
          <Text style={styles.statLabel}>{stat.label}</Text>
        </View>
      ))}
    </Animated.View>
  ));

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          colors={['#2ecc71']}
          tintColor="#2ecc71"
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Image 
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.appNameContainer}>
            <Text style={styles.appName}>ReMine</Text>
            <Text style={styles.appSubtitle}>Citizen Track</Text>
          </View>
        </View>
        
        <Text style={styles.tagline}>Votre voix pour une mine responsable</Text>
        
        <View style={styles.welcomeContainer}>
          <Text style={styles.greeting}>{getGreeting()} !</Text>
          <Text style={styles.welcomeUser}>
            {getUserDisplayName()} 👋
          </Text>
        </View>
      </View>

      {/* Rappel de brouillon en attente */}
      {hasDraft && !isLoading && (
        <TouchableOpacity
          style={[styles.draftReminder, { backgroundColor: colors.surface, borderColor: colors.primary }]}
          onPress={() => navigation.navigate('Report')}
          activeOpacity={0.8}
        >
          <Text style={styles.draftReminderIcon}>📝</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.draftReminderTitle, { color: colors.textPrimary }]}>
              Signalement en attente
            </Text>
            <Text style={[styles.draftReminderSub, { color: colors.textSecondary }]}>
              Continuez où vous vous étiez arrêté(e)
            </Text>
          </View>
          <Text style={[styles.draftReminderArrow, { color: colors.primary }]}>→</Text>
        </TouchableOpacity>
      )}

      {/* Skeleton loading */}
      {isLoading ? (
        <SkeletonHome />
      ) : stats.totalReports === 0 && recentReports.length === 0 ? (
        <ErrorFallback 
          message="Aucune donnée disponible. Vérifiez votre connexion ou réessayez."
          onRetry={loadData}
        />
      ) : null}

      {/* Section Auth - Uniquement si non connecté */}
      {!user && (
        <Animated.View style={[styles.authContainer, { opacity: fadeAnim }]}>
          <Text style={styles.authTitle}>Rejoignez la communauté ReMine</Text>
          <Text style={styles.authSubtitle}>
            Connectez-vous pour contribuer à une mine responsable et transparente
          </Text>
          
          <TouchableOpacity 
            style={[styles.authButton, styles.loginButton]}
            onPress={() => navigateTo('Login')}
          >
            <Text style={styles.authButtonText}>🔐 Se Connecter</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.authButton, styles.signupButton]}
            onPress={() => navigateTo('Register')}
          >
            <Text style={styles.authButtonText}>👤 Créer un Compte</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Statistiques enrichies */}
      <StatsSection />

      {/* Section Signalements Populaires */}
      {topReports.length > 0 ? (
        <Animated.View style={[styles.topSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🏆 Signalements Populaires</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TopSignalements')}>
              <Text style={styles.seeAllText}>Classement →</Text>
            </TouchableOpacity>
          </View>
          <TopReportsList reports={topReports} />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.topSection, { opacity: fadeAnim }]}>
          <Text style={styles.emptySectionText}>
            🏆 Aucun signalement populaire pour le moment
          </Text>
          <Text style={styles.emptySectionSubtext}>
            Soyez le premier à voter pour les signalements !
          </Text>
        </Animated.View>
      )}

      {/* Actions principales */}
      <Animated.View style={[styles.actionsContainer, { opacity: fadeAnim }]}>
        {/* Fonctionnalités utilisateur connecté */}
        {user && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.primaryButton]}
              onPress={() => navigateTo('Report')}
            >
              <Text style={styles.buttonIcon}>📤</Text>
              <Text style={styles.buttonText}>Nouveau Signalement</Text>
              <Text style={styles.buttonSubtext}>Signaler un problème</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.secondaryButton]}
              onPress={() => navigateTo('Signalement')}
            >
              <Text style={styles.buttonIcon}>📊</Text>
              <Text style={styles.buttonText}>Suivi Signalements</Text>
              <Text style={styles.buttonSubtext}>Voir tous les signalements</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.tertiaryButton]}
              onPress={() => navigateTo('Map')}
            >
              <Text style={styles.buttonIcon}>🗺️</Text>
              <Text style={styles.buttonText}>Carte Interactive</Text>
              <Text style={styles.buttonSubtext}>Visualiser sur la carte</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Bouton Classement Communautaire */}
        <TouchableOpacity 
          style={[styles.actionButton, styles.rankingButton]}
          onPress={() => navigation.navigate('TopSignalements')}
        >
          <Text style={styles.buttonIcon}>🏆</Text>
          <Text style={styles.buttonText}>Classement</Text>
          <Text style={styles.buttonSubtext}>Voir les plus populaires</Text>
        </TouchableOpacity>

        {/* Fonctionnalités accessibles à tous */}
        <TouchableOpacity 
          style={[styles.actionButton, styles.aboutButton]}
          onPress={() => navigateTo('About')}
        >
          <Text style={styles.buttonIcon}>ℹ️</Text>
          <Text style={styles.buttonText}>À Propos</Text>
          <Text style={styles.buttonSubtext}>Découvrir ReMine Citizen Track</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.profileButton]}
          onPress={() => user ? navigateTo('Profile') : navigateTo('Login')}
        >
          <Text style={styles.buttonIcon}>{user ? '👤' : '🔐'}</Text>
          <Text style={styles.buttonText}>
            {user ? 'Mon Profil' : 'Se Connecter'}
          </Text>
          <Text style={styles.buttonSubtext}>
            {user ? 'Gérer mon compte' : 'Accéder à mon compte'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Signalements récents */}
      {recentReports.length > 0 ? (
        <Animated.View style={[styles.recentSection, { opacity: fadeAnim }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📋 Signalements Récents</Text>
            <TouchableOpacity onPress={() => navigateTo('Signalement')}>
              <Text style={styles.seeAllText}>Voir tout →</Text>
            </TouchableOpacity>
          </View>
          <RecentReportsList reports={recentReports} />
        </Animated.View>
      ) : (
        <Animated.View style={[styles.recentSection, { opacity: fadeAnim }]}>
          <Text style={styles.emptySectionText}>
            📋 Aucun signalement récent
          </Text>
          <Text style={styles.emptySectionSubtext}>
            Soyez le premier à créer un signalement !
          </Text>
        </Animated.View>
      )}

      {/* Section informations */}
      <Animated.View style={[styles.infoSection, { opacity: fadeAnim }]}>
        <Text style={styles.infoTitle}>
          {user ? 'Comment contribuer efficacement ?' : 'Découvrez ReMine Citizen Track'}
        </Text>
        
        {[
          {
            icon: '📝',
            title: user ? 'Signalez précisément' : 'Créez un compte',
            text: user ? 'Décrivez le problème avec détails et photos' : 'Rejoignez notre communauté de citoyens engagés',
            key: 'info-1'
          },
          {
            icon: '👁️',
            title: user ? 'Suivez l\'avancement' : 'Surveillez l\'impact',
            text: user ? 'Recevez des mises à jour sur la résolution' : 'Observez l\'évolution des sites signalés',
            key: 'info-2'
          },
          {
            icon: '🌱',
            title: 'Valorisation des déchets',
            text: 'Participez à la transformation des déchets miniers en opportunités',
            key: 'info-3'
          }
        ].map((info) => (
          <View key={info.key} style={styles.infoItem}>
            <Text style={styles.infoIcon}>{info.icon}</Text>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTextTitle}>{info.title}</Text>
              <Text style={styles.infoText}>{info.text}</Text>
            </View>
          </View>
        ))}
      </Animated.View>

      {/* Section Contact */}
      <Animated.View style={[styles.contactSection, { opacity: fadeAnim }]}>
        <Text style={styles.contactTitle}>📞 Contactez-nous</Text>
        <Text style={styles.contactText}>
          📧 reminecitizentrack@gmail.com
        </Text>
        <Text style={styles.contactText}>
          📞 +221 33 837 05 58
        </Text>
        <Text style={styles.contactSubtext}>
          🕐 Lun-Ven 8h-18h • 📍 Dakar, Sénégal
        </Text>
      </Animated.View>

      {/* Mise à jour */}
      <View style={styles.updateSection}>
        <Text style={styles.updateText}>
          {isLoading ? 'Chargement...' : `Actualisé à ${lastRefresh.toLocaleTimeString()}`}
        </Text>
        <TouchableOpacity onPress={onRefresh} disabled={isLoading}>
          <Text style={[styles.refreshText, isLoading && styles.refreshTextDisabled]}>
            {isLoading ? '🔄' : '🔄'} Actualiser
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  scroll:        { flex: 1, backgroundColor: colors.background },

  draftReminder: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 14, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  draftReminderIcon: { fontSize: 22, marginRight: 12 },
  draftReminderTitle: { fontSize: 14, fontWeight: '700' },
  draftReminderSub: { fontSize: 12, marginTop: 2 },
  draftReminderArrow: { fontSize: 18, fontWeight: '700', marginLeft: 8 },

  header:        { backgroundColor: colors.surface, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 10, elevation: 6 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  logo:          { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.backgroundAlt, justifyContent: 'center', alignItems: 'center', marginRight: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 4, overflow: 'hidden' },
  logoImage:     { width: '100%', height: '100%', borderRadius: 33 },
  appNameContainer: { alignItems: 'flex-start' },
  appName:       { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  appSubtitle:   { fontSize: fontSize.lg, fontWeight: '700', color: colors.blue, marginTop: -2 },
  tagline:       { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: 10, lineHeight: 22 },
  welcomeContainer: { alignItems: 'center', marginTop: 4 },
  greeting:      { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: 4 },
  welcomeUser:   { fontSize: fontSize.lg, color: colors.blue, fontWeight: '700', backgroundColor: colors.blueLight, paddingHorizontal: 16, paddingVertical: 7, borderRadius: radius.xl },
  loadingOverlay:{ backgroundColor: colors.surface, padding: 20, margin: 20, borderRadius: radius.lg, alignItems: 'center' },
  loadingText:   { marginTop: 10, fontSize: fontSize.md, color: colors.textSecondary },
  errorContainer:{ backgroundColor: colors.surface, margin: 20, padding: 28, borderRadius: radius.xl, alignItems: 'center' },
  errorIcon:     { fontSize: 38, marginBottom: 14 },
  errorTitle:    { fontSize: fontSize.lg, fontWeight: '700', color: colors.danger, marginBottom: 8 },
  errorMessage:  { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: 18, lineHeight: 20 },
  retryButton:   { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: radius.md },
  retryButtonText:{ color: '#fff', fontSize: fontSize.md, fontWeight: '600' },
  authContainer: { backgroundColor: colors.surface, margin: 20, padding: 24, borderRadius: radius.xl, alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 8, elevation: 3 },
  authTitle:     { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary, marginBottom: 6 },
  authSubtitle:  { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: 22, lineHeight: 20, textAlign: 'center' },
  authButton:    { width: '100%', padding: 16, borderRadius: radius.md, alignItems: 'center', marginBottom: 10 },
  loginButton:   { backgroundColor: colors.blue },
  signupButton:  { backgroundColor: colors.primary },
  authButtonText:{ color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
  statsContainer:{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, marginTop: 8 },
  statCard:      { backgroundColor: colors.surface, padding: 18, borderRadius: radius.lg, alignItems: 'center', flex: 1, marginHorizontal: 5, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 5, elevation: 3 },
  statNumber:    { fontSize: 23, fontWeight: '800', color: colors.primary, marginBottom: 5 },
  statLabel:     { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  topSection:    { backgroundColor: colors.surface, margin: 16, padding: 18, borderRadius: radius.lg, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 4, elevation: 2 },
  topReportCard: { backgroundColor: colors.surfaceAlt, padding: 14, borderRadius: radius.md, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.orange },
  topReportHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  rankBadge:     { width: 28, height: 28, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText:      { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  topReportInfo: { flex: 1 },
  topReportLocation:   { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  topReportDescription:{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 16 },
  scoreContainer:{ alignItems: 'center', marginLeft: 6 },
  scoreIcon:     { fontSize: fontSize.md },
  scoreText:     { fontSize: fontSize.lg, fontWeight: '800', color: colors.orange },
  voteCount:     { fontSize: fontSize.xs, color: colors.textMuted },
  topVotingSection:{ marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.borderLight },
  actionsContainer:{ padding: 16 },
  actionButton:  { padding: 20, borderRadius: radius.lg, marginBottom: 14 },
  primaryButton: { backgroundColor: colors.blue },
  secondaryButton:{ backgroundColor: colors.primary },
  tertiaryButton:{ backgroundColor: '#ea580c' },
  rankingButton: { backgroundColor: colors.orange },
  aboutButton:   { backgroundColor: colors.headerDark },
  profileButton: { backgroundColor: colors.dangerDark },
  buttonIcon:    { fontSize: fontSize.xl, marginBottom: 6 },
  buttonText:    { color: '#fff', fontSize: fontSize.lg, fontWeight: '700', marginBottom: 3 },
  buttonSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: fontSize.sm, fontWeight: '500' },
  recentSection: { backgroundColor: colors.surface, margin: 16, padding: 18, borderRadius: radius.lg, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 4, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  seeAllText:    { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  recentReportCard:{ backgroundColor: colors.surfaceAlt, padding: 14, borderRadius: radius.md, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: colors.blue },
  reportHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  reportIcon:    { fontSize: 19, marginRight: 10 },
  reportInfo:    { flex: 1 },
  reportLocation:{ fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  reportDate:    { fontSize: fontSize.xs, color: colors.textMuted },
  severityIndicator:{ flexDirection: 'row', alignItems: 'center', marginBottom: 7 },
  severityDot:   { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  severityText:  { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '500' },
  statusBadge:   { paddingHorizontal: 9, paddingVertical: 3, borderRadius: radius.md },
  statusText:    { color: '#fff', fontSize: fontSize.xs, fontWeight: '700' },
  reportDescription:{ fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 17 },
  votingSection: { marginTop: 7, paddingTop: 7, borderTopWidth: 1, borderTopColor: colors.borderLight },
  emptyText:     { textAlign: 'center', color: colors.textMuted, padding: 20 },
  emptySectionText:   { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginBottom: 6 },
  emptySectionSubtext:{ fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
  infoSection:   { backgroundColor: colors.surface, margin: 16, padding: 22, borderRadius: radius.lg, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 4, elevation: 2 },
  infoTitle:     { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: 18 },
  infoItem:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  infoIcon:      { fontSize: 21, marginRight: 14, width: 28 },
  infoTextContainer:{ flex: 1 },
  infoTextTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  infoText:      { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  contactSection:{ backgroundColor: colors.surface, margin: 16, padding: 18, borderRadius: radius.lg, alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 4, elevation: 2 },
  contactTitle:  { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  contactText:   { fontSize: fontSize.sm, color: colors.blue, marginBottom: 5 },
  contactSubtext:{ fontSize: fontSize.sm, color: colors.textMuted, marginTop: 6 },
  updateSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, margin: 16, marginTop: 8, padding: 14, borderRadius: radius.md, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: colors.shadowOpacity, shadowRadius: 3, elevation: 1 },
  updateText:    { fontSize: fontSize.sm, color: colors.textMuted },
  refreshText:   { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  refreshTextDisabled:{ color: colors.textDisabled },
});