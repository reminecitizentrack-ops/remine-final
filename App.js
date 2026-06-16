// App.js — Version complète avec surveillance réseau
import './polyfills';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  LogBox, 
  Image,
  TouchableOpacity 
} from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SignalementProvider } from './src/context/SignalementContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { ConnectionStatus } from './src/components/ConnectionStatus';
import { NetworkChecker } from './src/components/NetworkChecker';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import TabNavigator from './src/navigation/TabNavigator';
import { useSyncOnReconnect } from './src/hooks/useSyncOnReconnect';


// Imports des écrans
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReportScreen from './src/screens/ReportScreen';
import StatusScreen from './src/screens/StatusScreen';
import MapScreen from './src/screens/MapScreen';
import AboutScreen from './src/screens/AboutScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SignalementScreen from './src/screens/SignalementScreen';
import TopSignalementsScreen from './src/screens/TopSignalementsScreen';
import MesSignalementsScreen from './src/screens/MesSignalementsScreen';
import CommentScreen from './src/screens/CommentScreen';
import CitizenDashboardScreen from './src/screens/CitizenDashboardScreen';
import ShareScreen from './src/screens/ShareScreen';
import NotificationHistoryScreen from './src/screens/NotificationHistoryScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';

const Stack = createNativeStackNavigator();

// ✅ CORRECTIF : on ne masque plus 'Non-serializable values' ni 'Require cycle'
// car ce sont des signaux d'erreurs réelles d'architecture à corriger.
// Seuls les warnings inévitables de bibliothèques tierces sont ignorés.
LogBox.ignoreLogs([
  'The action \'RESET\'',
  'ViewPropTypes will be removed',
]);

// ✅ Deep linking — permet d'ouvrir l'app depuis un lien externe
// (ex: remine://reset-password?token=...&email=...)
// Le lien web https://remine-dashboard.vercel.app/reset-password redirige
// automatiquement vers ce schéma sur mobile, avec fallback web sinon.
const linking = {
  prefixes: ['remine://'],
  config: {
    screens: {
      ResetPassword: {
        path: 'reset-password',
        parse: {
          token: (token) => `${token}`,
          email: (email) => decodeURIComponent(`${email}`),
        },
      },
      Login: 'login',
    },
  },
};

// ✅ CORRECTIF : headerBase défini une seule fois, hors composant
const headerBase = {
  headerTintColor: '#fff',
  headerTitleStyle: { fontSize: 18, fontWeight: '600' },
  headerBackTitle: 'Retour',
  headerBackVisible: true,
};

// Composant de chargement Splash Screen
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  appTagline: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 12,
    textAlign: 'center',
    opacity: 0.9,
  },
  loadingTextDark: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorDetails: {
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 12,
    color: '#721c24',
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: 10,
    color: '#856404',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#3498db',
  },
  reportButton: {
    backgroundColor: '#95a5a6',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  reportButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  headerButton: {
    marginRight: 8,
    padding: 2,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitials: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
});

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoContainer}>
        <Image 
          source={require('./assets/icon.png')}
          style={styles.logoImage}
          resizeMode="contain"
          onError={(error) => { if (__DEV__) console.log('Erreur chargement logo:', error); }}
        />
        <Text style={styles.appName}>ReMine Citizen Track</Text>
        <Text style={styles.appTagline}>Protégeons notre environnement</Text>
      </View>
      <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 30 }} />
      <Text style={styles.loadingText}>Chargement de l'application...</Text>
    </View>
  );
}

// Composant de chargement standard
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2ecc71" />
      <Text style={styles.loadingTextDark}>Chargement...</Text>
    </View>
  );
}

// Composant de navigation principal
function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { colors, isDark } = useTheme();

  // ✅ CORRECTIF : dynHeaders dans useMemo — recalculé uniquement si le thème change
  const dynHeaders = React.useMemo(() => ({
    green:  { headerStyle: { backgroundColor: colors.headerGreen  }, ...headerBase },
    blue:   { headerStyle: { backgroundColor: colors.headerBlue   }, ...headerBase },
    orange: { headerStyle: { backgroundColor: colors.headerOrange }, ...headerBase },
    dark:   { headerStyle: { backgroundColor: isDark ? colors.surface : colors.headerDark }, headerTintColor: isDark ? colors.textPrimary : '#fff', headerTitleStyle: { fontSize: 18, fontWeight: '600' }, headerBackTitle: 'Retour' },
    red:    { headerStyle: { backgroundColor: colors.headerRed    }, ...headerBase },
    gray:   { headerStyle: { backgroundColor: isDark ? colors.surfaceAlt : '#6b7280' }, ...headerBase },
    purple: { headerStyle: { backgroundColor: colors.headerPurple }, ...headerBase },
  }), [colors, isDark]);
  const { isBackendReachable, checkFullConnection } = useNetworkStatus();
  useSyncOnReconnect(user);

  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenOnboarding').then(val => {
      setHasSeenOnboarding(val === 'true');
    });
  }, []);

  useEffect(() => {
    // Vérifier la connexion au démarrage
    checkFullConnection();
  }, []);

  // ✅ CORRECTIF : log conditionnel, sans données sensibles (email, token)
  if (__DEV__) {
    if (__DEV__) console.log('🔐 État auth Navigator:', { isAuthenticated, isLoading, isBackendReachable });
  }

  if (isLoading || hasSeenOnboarding === null) {
    return <LoadingScreen />;
  }

  if (!hasSeenOnboarding) {
    return (
      <OnboardingScreen
        onDone={() => {
          AsyncStorage.setItem('hasSeenOnboarding', 'true');
          setHasSeenOnboarding(true);
        }}
      />
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        animationDuration: 280,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        headerBackTitle: 'Retour',
        headerBackVisible: true,
        headerLeft: ({ canGoBack }) =>
          canGoBack ? undefined : null,
        cardOverlayEnabled: true,
        cardShadowEnabled: true,
      }}
    >
      {isAuthenticated ? (
        // Écrans pour utilisateurs connectés
        <>
          <Stack.Screen 
            name="HomeTabs" 
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Report" 
            component={ReportScreen}
            options={{ 
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 400,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen 
            name="Signalement"
            component={SignalementScreen}
            options={{ 
              title: 'Détail du Signalement',
              ...dynHeaders.blue,
              animation: 'slide_from_right',
              animationDuration: 250,
            }}
          />
          <Stack.Screen 
            name="MesSignalements"
            component={MesSignalementsScreen}
            options={{ 
              title: 'Mes Signalements',
              ...dynHeaders.purple,
            }}
          />
          <Stack.Screen 
            name="TopSignalements" 
            component={TopSignalementsScreen}
            options={{ 
              title: 'Classement 🏆',
              ...dynHeaders.orange,
            }}
          />
          <Stack.Screen 
            name="Map" 
            component={MapScreen}
            options={{ 
              title: 'Carte Interactive',
              ...dynHeaders.orange,
              animation: 'fade',
              animationDuration: 300,
            }}
          />
          <Stack.Screen 
            name="About" 
            component={AboutScreen}
            options={{ 
              title: 'À Propos de ReMine',
              ...dynHeaders.dark,
              animation: 'fade',
              animationDuration: 300,
            }}
          />
          <Stack.Screen 
            name="Profile" 
            component={ProfileScreen}
            options={{ 
              title: 'Mon Profil',
              ...dynHeaders.red,
              animation: 'slide_from_bottom',
              animationDuration: 320,
            }}
          />
          <Stack.Screen 
            name="Status" 
            component={StatusScreen}
            options={{ 
              title: 'Historique des Signalements',
              ...dynHeaders.gray,
            }}
          />
          <Stack.Screen
            name="Comments"
            component={CommentScreen}
            options={{ title: 'Messages', ...dynHeaders.green, animation: 'fade_from_bottom', animationDuration: 280 }}
          />
          <Stack.Screen
            name="Dashboard"
            component={CitizenDashboardScreen}
            options={{ title: 'Mon Tableau de Bord', ...dynHeaders.green, animation: 'slide_from_bottom', animationDuration: 320 }}
          />
          <Stack.Screen
            name="Share"
            component={ShareScreen}
            options={{ title: 'Partager', ...dynHeaders.dark, animation: 'slide_from_bottom', animationDuration: 300 }}
          />
          <Stack.Screen
            name="NotificationHistory"
            component={NotificationHistoryScreen}
            options={{ title: 'Notifications', ...dynHeaders.green, animation: 'slide_from_right', animationDuration: 250 }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: 'Réinitialisation', ...dynHeaders.green, headerShown: true }}
          />
        </>
      ) : (
        // Écrans pour utilisateurs non connectés
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen}
            options={{ 
              title: 'Connexion',
              ...dynHeaders.green,
              headerShown: true,
            }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ 
              title: 'Créer un compte',
              ...dynHeaders.blue,
              headerShown: true,
            }}
          />
          <Stack.Screen 
            name="Home" 
            component={HomeScreen}
            options={{ 
              title: 'ReMine Citizen Track',
              ...dynHeaders.green,
              headerShown: true,
            }}
          />
          <Stack.Screen 
            name="About" 
            component={AboutScreen}
            options={{ 
              title: 'À Propos de ReMine',
              ...dynHeaders.dark,
              headerShown: true,
            }}
          />
          <Stack.Screen 
            name="TopSignalements" 
            component={TopSignalementsScreen}
            options={{ 
              title: 'Classement 🏆',
              ...dynHeaders.orange,
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ title: 'Réinitialisation', ...dynHeaders.green, headerShown: true }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

// Composant racine avec surveillance réseau
function RootNavigator() {
  return (
    <View style={styles.container}>
      <ConnectionStatus 
        showDetails={__DEV__} 
        autoHide={true}
        autoHideDelay={5000}
      />
      <NetworkChecker requiredForActions={true}>
        <AppNavigator />
      </NetworkChecker>
    </View>
  );
}

// Composant de gestion d'erreur
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('💥 Erreur application:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>😔</Text>
          <Text style={styles.errorTitle}>Oups ! Une erreur est survenue</Text>
          <Text style={styles.errorText}>
            L'application a rencontré un problème inattendu.
          </Text>
          
          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>Détails techniques :</Text>
              <Text style={styles.errorDetailsText}>
                {this.state.error.toString()}
              </Text>
              {this.state.errorInfo?.componentStack && (
                <Text style={styles.errorStack}>
                  {this.state.errorInfo.componentStack}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.errorActions}>
            <TouchableOpacity 
              style={[styles.errorButton, styles.retryButton]}
              onPress={this.handleRetry}
            >
              <Text style={styles.retryButtonText}>🔄 Réessayer</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.errorButton, styles.reportButton]}
              onPress={() => {
                if (__DEV__) console.log('Rapporter le bug:', this.state.error);
                alert('Merci de rapporter ce bug à notre équipe technique.');
              }}
            >
              <Text style={styles.reportButtonText}>📧 Signaler le problème</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Application principale
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    async function prepare() {
      try {
        if (__DEV__) console.log('🚀 Initialisation de l\'application...');
        // ✅ CORRECTIF : plus de setTimeout artificiel — laisser expo-splash-screen
        // gérer le masquage via SplashScreen.hideAsync() si besoin
        // Ajoutez ici vos vraies initialisations (fonts, assets, etc.)
        if (__DEV__) console.log('✅ Application prête');
      } catch (e) {
        if (__DEV__) console.warn('⚠️ Erreur préparation app:', e);
      } finally {
        setAppIsReady(true);
        setSplashVisible(false);
      }
    }
    prepare();
  }, []);

  if (!appIsReady || splashVisible) {
    return <SplashScreen />;
  }

  return (
  <ErrorBoundary>
    <ThemeProvider>
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <SignalementProvider>
            <NavigationContainer>
              <StatusBar style="auto" backgroundColor="#16a34a" />
              <RootNavigator />
            </NavigationContainer>
          </SignalementProvider>
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  </ErrorBoundary>
  );
}

// Styles