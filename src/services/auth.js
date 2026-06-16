import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const checkConnection = async () => {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      throw new Error('Aucune connexion internet. Vérifiez votre connexion et réessayez.');
    }
    return true;
  } catch (error) {
    throw new Error('Impossible de vérifier la connexion internet.');
  }
};

const callApiWithRetry = async (apiCall, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt}/${retries}...`);
      const result = await apiCall();
      return result;
    } catch (error) {
      console.log(`❌ Tentative ${attempt} échouée:`, error.message);
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
};

const optimizeRegisterData = (userData) => ({
  firstName: userData.firstName?.trim(),
  lastName: userData.lastName?.trim(),
  email: userData.email.toLowerCase().trim(),
  password: userData.password,
  phone: userData.phone?.trim(),
  community: userData.community?.trim(),
  role: 'citizen',
});

const API_TIMEOUT = 30000;

// ── Fonctions déclarées individuellement (pas de `this`, pas d'objet littéral
// construit en une fois) — pour éviter tout problème de timing de module lors
// d'un cycle de dépendances avec api.js. Chaque fonction est exportée nommée
// puis regroupée dans authService à la fin, qui est ainsi toujours bien défini
// même si le module est partiellement évalué ailleurs.

async function clearAuthData() {
  try {
    await AsyncStorage.multiRemove(['authToken', 'userData']);
    console.log("🧹 Données d'authentification nettoyées");
    return true;
  } catch (error) {
    console.log('❌ Erreur nettoyage données:', error);
    return false;
  }
}

async function login(email, password) {
  try {
    if (__DEV__) console.log('🔐 Tentative de connexion...');
    await checkConnection();

    const loginData = { email: email.toLowerCase().trim(), password };

    const response = await callApiWithRetry(
      () => api.post('/auth/login', loginData, { timeout: API_TIMEOUT }),
      2, 1000
    );

    if (__DEV__) console.log('✅ Réponse login - Succès:', response.data.success);

    if (response.data.success && response.data.data?.token && response.data.data?.user) {
      const { token, user } = response.data.data;
      await Promise.all([
        AsyncStorage.setItem('authToken', token),
        AsyncStorage.setItem('userData', JSON.stringify(user)),
      ]);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (__DEV__) console.log('🔑 Token stocké et configuré avec succès');
      return { success: true, data: { user, token }, message: 'Connexion réussie' };
    } else {
      await clearAuthData();
      throw new Error(response.data.error || 'Réponse incomplète du serveur');
    }
  } catch (error) {
    if (__DEV__) console.log('❌ Erreur login:', { message: error.message, status: error.response?.status });
    await clearAuthData();

    let errorMessage = 'Erreur de connexion';
    if (error.message?.includes('timeout')) errorMessage = 'Le serveur met trop de temps à répondre. Réessayez.';
    else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    else if (error.response?.status === 401) errorMessage = 'Email ou mot de passe incorrect';
    else if (error.response?.status === 404) errorMessage = "Service d'authentification non disponible";
    else if (error.response?.status === 500) errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    else if (error.message?.includes('Aucune connexion')) errorMessage = error.message;
    else errorMessage = error.response?.data?.error || error.message || 'Erreur de connexion';

    return { success: false, error: errorMessage };
  }
}

async function register(userData) {
  try {
    console.log("📝 Tentative d'inscription vers:", `${api.defaults.baseURL}/auth/register`);
    await checkConnection();

    const cleanedData = optimizeRegisterData(userData);
    console.log('📦 Données optimisées pour inscription');

    const response = await callApiWithRetry(
      () => api.post('/auth/register', cleanedData, { timeout: API_TIMEOUT }),
      3, 1000
    );

    console.log('✅ Réponse inscription - Succès:', response.data.success);

    if (response.data.success) {
      console.log("🎉 Inscription réussie, tentative d'auto-login...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {
        const loginResult = await callApiWithRetry(
          () => login(cleanedData.email, cleanedData.password),
          2, 1000
        );
        return loginResult;
      } catch (loginError) {
        console.log('⚠️ Auto-login échoué, mais inscription réussie:', loginError.message);
        return { success: true, message: 'Compte créé avec succès. Vous pouvez maintenant vous connecter.', needsManualLogin: true };
      }
    } else {
      throw new Error(response.data.error || "Erreur lors de l'inscription");
    }
  } catch (error) {
    console.log('❌ Erreur inscription complète:', { message: error.message, response: error.response?.data, status: error.response?.status });

    let errorMessage = 'Erreur lors de la création du compte';
    if (error.message?.includes('timeout')) errorMessage = 'Le serveur met trop de temps à répondre. Réessayez.';
    else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    else if (error.response?.status === 400) errorMessage = error.response.data.error || "Données d'inscription invalides";
    else if (error.response?.status === 409) errorMessage = 'Un compte avec cet email existe déjà';
    else if (error.message?.includes('Aucune connexion')) errorMessage = error.message;
    else errorMessage = error.response?.data?.error || error.message || 'Erreur lors de la création du compte';

    return { success: false, error: errorMessage };
  }
}

async function logout() {
  try {
    const userData = await AsyncStorage.getItem('userData');
    const userEmail = userData ? JSON.parse(userData).email : 'inconnu';
    await AsyncStorage.multiRemove(['authToken', 'userData']);
    delete api.defaults.headers.common['Authorization'];
    console.log('🚪 Déconnexion réussie pour:', userEmail);
    return { success: true, message: 'Déconnexion réussie' };
  } catch (error) {
    console.log('❌ Erreur déconnexion:', error);
    await clearAuthData();
    return { success: true, message: 'Déconnexion réussie (nettoyage forcé)' };
  }
}

async function getCurrentUser() {
  try {
    const [token, userData] = await Promise.all([
      AsyncStorage.getItem('authToken'),
      AsyncStorage.getItem('userData'),
    ]);

    console.log('🔍 Vérification utilisateur courant:', { hasToken: !!token, hasUserData: !!userData });

    if (token && userData) {
      const user = JSON.parse(userData);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (__DEV__) console.log('👤 Utilisateur récupéré depuis le stockage local');
      return { success: true, user, token };
    } else {
      if (token || userData) {
        console.log("⚠️ Données d'auth incomplètes, nettoyage...");
        await clearAuthData();
      }
      return { success: false, error: 'Aucun utilisateur connecté' };
    }
  } catch (error) {
    console.log('❌ Erreur récupération utilisateur:', error);
    await clearAuthData();
    return { success: false, error: 'Erreur de récupération des données utilisateur' };
  }
}

export const authService = {
  login,
  register,
  logout,
  getCurrentUser,
  clearAuthData,
};