// src/screens/LoginScreen.js — Version renforcée avec surveillance réseau
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { ConnectionStatus } from '../components/ConnectionStatus';

const createStyles = (colors) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header:        { alignItems: 'center', marginBottom: 36 },
  title:         { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 6, color: colors.primary, letterSpacing: -0.5 },
  subtitle:      { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  form:          { backgroundColor: colors.surface, padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4 },
  warningBox:    { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.dangerLight, borderRadius: 10, padding: 12, marginBottom: 18 },
  warningIcon:   { fontSize: 18, marginRight: 10 },
  warningText:   { flex: 1, color: colors.danger, fontSize: 13 },
  inputGroup:    { marginBottom: 18 },
  label:         { fontSize: 13, fontWeight: '600', marginBottom: 7, color: colors.textPrimary, letterSpacing: 0.2 },
  input:         { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.textPrimary },
  inputError:    { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  inputValid:    { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  errorText:     { color: colors.danger, fontSize: 12, marginTop: 4, marginLeft: 2 },
  forgotPassword:{ alignSelf: 'flex-end', marginBottom: 22 },
  forgotPasswordText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  // ── Modale "Mot de passe oublié" ────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', maxWidth: 400, backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
  modalIcon: { fontSize: 40, textAlign: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 13, fontSize: 15, color: colors.textPrimary, marginBottom: 18 },
  modalInputError: { borderColor: '#ef4444' },
  modalErrorText: { color: '#ef4444', fontSize: 12, marginTop: -12, marginBottom: 14 },
  modalConfirmBtn: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  modalConfirmBtnDisabled: { backgroundColor: colors.border },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalCancelBtn: { padding: 13, alignItems: 'center' },
  modalCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  modalSuccessIcon: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  modalSuccessText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  button:        { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  buttonDisabled:{ backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  buttonText:    { color: colors.surface, fontSize: 16, fontWeight: '700' },
  attemptsText:  { textAlign: 'center', color: colors.orange, fontSize: 12, marginBottom: 14 },
  separator:     { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { marginHorizontal: 14, color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  secondaryButton:    { backgroundColor: colors.surface, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, marginBottom: 12 },
  secondaryButtonText:{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  demoButton:    { backgroundColor: colors.primaryLight, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primaryMid, marginBottom: 10 },
  demoText:      { color: colors.primary, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  demoSubtext:   { color: colors.primary, fontSize: 12, marginTop: 3, opacity: 0.75 },
  testButton:    { backgroundColor: colors.orangeLight, padding: 11, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.orangeLight, marginTop: 4 },
  testText:      { color: colors.orange, fontSize: 12, fontWeight: '500' },
  footer:        { marginTop: 28, padding: 14, backgroundColor: colors.background, borderRadius: 12, alignItems: 'center' },
  footerText:    { fontSize: 12, color: colors.textPrimary, textAlign: 'center', fontWeight: '500' },
  footerSubtext: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', marginTop: 3 },
  backendStatus: { marginTop: 14, alignItems: 'center' },
  backendStatusText: { fontSize: 11, fontStyle: 'italic', color: colors.textMuted },
  backendSuccess:{ color: colors.primary },
  backendError:  { color: colors.danger },
});

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);
  
  const { login, isLoading, resetPassword } = useAuth();
  const { isBackendReachable, checkFullConnection, isChecking } = useNetworkStatus();

  // ── Modale "Mot de passe oublié" ────────────────────────────────────────
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail]         = useState('');
  const [forgotError, setForgotError]         = useState('');
  const [forgotSending, setForgotSending]     = useState(false);
  const [forgotSuccess, setForgotSuccess]     = useState(false);
  const [forgotResultMsg, setForgotResultMsg] = useState('');

  useEffect(() => {
    const errors = {};
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Format d\'email invalide';
    }
    if (password && password.length < 6) {
      errors.password = 'Le mot de passe doit contenir au moins 6 caractères';
    }
    setErrors(errors);
    setIsFormValid(email && password && Object.keys(errors).length === 0);
  }, [email, password]);

  useEffect(() => {
    if (lockoutTime && Date.now() > lockoutTime) {
      setLockoutTime(null);
      setLoginAttempts(0);
    }
  }, [lockoutTime]);

  const handleLogin = async () => {
    if (!isFormValid) {
      Alert.alert('Erreur', 'Veuillez corriger les erreurs avant de continuer');
      return;
    }
    if (lockoutTime) {
      const remainingMinutes = Math.ceil((lockoutTime - Date.now()) / 60000);
      Alert.alert('Compte temporairement bloqué', `Trop de tentatives. Réessayez dans ${remainingMinutes} minute(s).`);
      return;
    }
    const connectionStatus = await checkFullConnection();
    if (!connectionStatus.isReachable) {
      Alert.alert('⚠️ Serveur inaccessible', 'Impossible de contacter le serveur. Vérifiez votre connexion ou réessayez plus tard.', [
        { text: 'OK', style: 'cancel' },
        { text: 'Réessayer', onPress: handleLogin }
      ]);
      return;
    }
    try {
      const result = await login(email, password);
      if (result.success) {
        setLoginAttempts(0);
        setLockoutTime(null);
        Alert.alert('Connexion réussie ✅', `Bienvenue ${result.user?.firstName || 'utilisateur'} !`, [{ text: 'Continuer', style: 'default' }]);
        setEmail('');
        setPassword('');
        setErrors({});
      } else {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockoutTime(Date.now() + 900000);
          Alert.alert('🔒 Compte temporairement bloqué', 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.', [{ text: 'OK', style: 'default' }]);
        } else {
          Alert.alert('Erreur de connexion', `${result.error || 'Email ou mot de passe incorrect'}\n\nTentatives restantes: ${5 - newAttempts}`, [{ text: 'OK', style: 'default' }]);
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion', [{ text: 'OK', style: 'default' }]);
    }
  };

  const openForgotModal = () => {
    if (!isBackendReachable) {
      Alert.alert('⚠️ Serveur inaccessible', 'Impossible de contacter le serveur. Veuillez vérifier votre connexion.');
      return;
    }
    setForgotEmail(email); // pré-rempli avec l'email du formulaire si déjà saisi, mais reste modifiable
    setForgotError('');
    setForgotSuccess(false);
    setForgotResultMsg('');
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSuccess(false);
    setForgotResultMsg('');
  };

  const handleConfirmResetPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Veuillez entrer votre adresse email.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail.trim())) {
      setForgotError('Veuillez entrer un email valide.');
      return;
    }
    setForgotError('');
    setForgotSending(true);
    try {
      const result = await resetPassword(forgotEmail.trim());
      if (result.success) {
        setForgotSuccess(true);
        setForgotResultMsg(result.message || 'Un lien de réinitialisation a été envoyé à votre adresse email.');
      } else {
        setForgotError(result.error || "Erreur lors de l'envoi de l'email.");
      }
    } catch (error) {
      setForgotError(error.message || 'Erreur lors de la réinitialisation.');
    } finally {
      setForgotSending(false);
    }
  };

  const handleDemoAccess = () => {
    Alert.alert('Accès Démo', 'Voulez-vous accéder à la version de démonstration ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Accéder à la démo', onPress: () => {
        setEmail('demo@remine.com');
        setPassword('demo123');
        Alert.alert('Mode Démo Activé 🎮', 'Email: demo@remine.com\nMot de passe: demo123\n\nCliquez sur "Se connecter" pour continuer.', [
          { text: 'Me connecter', onPress: () => handleLogin() },
          { text: 'Modifier', style: 'cancel' }
        ]);
      }}
    ]);
  };

  const handleQuickTest = () => {
    setEmail('test@remine.com');
    setPassword('test123');
    Alert.alert('Données de test chargées', 'Modifiez les si nécessaire puis cliquez sur "Se connecter"', [{ text: 'OK' }]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ConnectionStatus showDetails={__DEV__} autoHide={true} autoHideDelay={3000} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Connexion</Text>
          <Text style={styles.subtitle}>Accédez à votre compte ReMine</Text>
        </View>
        <View style={styles.form}>
          {!isBackendReachable && !isChecking && (
            <View style={styles.warningBox}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningText}>Serveur inaccessible. Vérifiez votre connexion.</Text>
            </View>
          )}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError, email && !errors.email && styles.inputValid]}
              placeholder="votre@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading && isBackendReachable}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <TextInput
              style={[styles.input, errors.password && styles.inputError, password && !errors.password && styles.inputValid]}
              placeholder="Votre mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!isLoading && isBackendReachable}
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>
          <TouchableOpacity style={styles.forgotPassword} onPress={openForgotModal} disabled={isLoading || !isBackendReachable}>
            <Text style={styles.forgotPasswordText}>🔓 Mot de passe oublié ?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, (!isFormValid || isLoading || !isBackendReachable || lockoutTime) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!isFormValid || isLoading || !isBackendReachable || !!lockoutTime}
          >
            {isLoading || isChecking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{lockoutTime ? '⏰ Compte bloqué' : '🚀 Se connecter'}</Text>
            )}
          </TouchableOpacity>
          {loginAttempts > 0 && loginAttempts < 5 && !lockoutTime && (
            <Text style={styles.attemptsText}>Tentatives restantes: {5 - loginAttempts}</Text>
          )}
          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>ou</Text>
            <View style={styles.separatorLine} />
          </View>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate('Register')} disabled={isLoading}>
            <Text style={styles.secondaryButtonText}>📝 Créer un nouveau compte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.demoButton} onPress={handleDemoAccess} disabled={isLoading}>
            <Text style={styles.demoText}>🎮 Accéder à la démo</Text>
            <Text style={styles.demoSubtext}>Testez sans créer de compte</Text>
          </TouchableOpacity>
          {__DEV__ && (
            <TouchableOpacity style={styles.testButton} onPress={handleQuickTest} disabled={isLoading}>
              <Text style={styles.testText}>⚡ Données de test</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>🔒 Connexion sécurisée avec authentification ReMine</Text>
          <Text style={styles.footerSubtext}>Vos données sont chiffrées et protégées</Text>
        </View>
        <View style={styles.backendStatus}>
          {isChecking ? (
            <Text style={styles.backendStatusText}>🔄 Vérification du serveur...</Text>
          ) : isBackendReachable ? (
            <Text style={[styles.backendStatusText, styles.backendSuccess]}>✅ Serveur accessible</Text>
          ) : (
            <Text style={[styles.backendStatusText, styles.backendError]}>❌ Serveur inaccessible</Text>
          )}
        </View>
      </ScrollView>

      {/* ── Modale Mot de passe oublié ─────────────────────────────────── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>

            {!forgotSuccess ? (
              <>
                <Text style={styles.modalIcon}>🔐</Text>
                <Text style={styles.modalTitle}>Mot de passe oublié</Text>
                <Text style={styles.modalSubtitle}>
                  Entrez votre adresse email. Nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </Text>

                <Text style={styles.modalLabel}>Adresse email</Text>
                <TextInput
                  style={[styles.modalInput, !!forgotError && styles.modalInputError]}
                  placeholder="votre@email.com"
                  placeholderTextColor={colors.textSecondary}
                  value={forgotEmail}
                  onChangeText={(v) => { setForgotEmail(v); setForgotError(''); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoFocus
                  editable={!forgotSending}
                />
                {!!forgotError && <Text style={styles.modalErrorText}>{forgotError}</Text>}

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, (forgotSending || !forgotEmail.trim()) && styles.modalConfirmBtnDisabled]}
                  onPress={handleConfirmResetPassword}
                  disabled={forgotSending || !forgotEmail.trim()}
                >
                  {forgotSending
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.modalConfirmText}>📧 Envoyer le lien</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelBtn} onPress={closeForgotModal} disabled={forgotSending}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalSuccessIcon}>✅</Text>
                <Text style={styles.modalTitle}>Email envoyé</Text>
                <Text style={styles.modalSuccessText}>
                  {forgotResultMsg}{'\n\n'}Vérifiez votre boîte de réception (et vos spams). Le lien expire dans 1 heure.
                </Text>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={closeForgotModal}>
                  <Text style={styles.modalConfirmText}>Compris</Text>
                </TouchableOpacity>
              </>
            )}

          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}