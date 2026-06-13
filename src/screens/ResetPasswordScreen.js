// src/screens/ResetPasswordScreen.js — Réinitialisation de mot de passe (deep link)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const createStyles = (colors) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  header:    { alignItems: 'center', marginBottom: 28 },
  icon:      { fontSize: 48, marginBottom: 12 },
  title:     { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: colors.primary, letterSpacing: -0.5 },
  subtitle:  { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  emailHighlight: { fontWeight: '700', color: colors.textPrimary },

  form: { backgroundColor: colors.surface, padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4 },

  inputGroup: { marginBottom: 18 },
  label:      { fontSize: 13, fontWeight: '600', marginBottom: 7, color: colors.textPrimary, letterSpacing: 0.2 },
  inputWrap:  { position: 'relative' },
  input:      { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, paddingRight: 50, fontSize: 15, color: colors.textPrimary },
  inputError: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  toggleBtn:  { position: 'absolute', right: 12, top: 12, padding: 4 },
  toggleText: { fontSize: 18 },

  rules:     { marginTop: 4, marginBottom: 4 },
  rule:      { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ruleIcon:  { fontSize: 13, marginRight: 6, width: 16 },
  ruleText:  { fontSize: 12, color: colors.textSecondary },
  ruleTextOk:{ color: colors.primary, fontWeight: '600' },

  errorBox:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.dangerLight, borderWidth: 1, borderColor: colors.dangerLight, borderRadius: 10, padding: 12, marginBottom: 18 },
  errorIcon: { fontSize: 18, marginRight: 10 },
  errorText: { flex: 1, color: colors.danger, fontSize: 13 },

  button:         { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 6, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  buttonDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  buttonText:     { color: colors.surface, fontSize: 16, fontWeight: '700' },

  secondaryBtn:     { padding: 14, alignItems: 'center', marginTop: 8 },
  secondaryBtnText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },

  successIcon:  { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: 10, textAlign: 'center' },
  successText:  { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },

  loadingText: { fontSize: 14, color: colors.textSecondary, marginTop: 12, textAlign: 'center' },
});

export default function ResetPasswordScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { verifyResetToken, confirmPasswordReset } = useAuth();

  const { email = '', token = '' } = route?.params || {};

  const [checking, setChecking]     = useState(true);
  const [tokenValid, setTokenValid] = useState(null); // null | true | false
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Vérifier le token au chargement
  useEffect(() => {
    let active = true;
    (async () => {
      if (!email || !token) {
        if (active) {
          setTokenValid(false);
          setTokenError('Lien invalide : informations manquantes.');
          setChecking(false);
        }
        return;
      }
      const res = await verifyResetToken(email, token);
      if (!active) return;
      if (res.success) {
        setTokenValid(true);
      } else {
        setTokenValid(false);
        setTokenError(res.error || 'Lien invalide ou expiré.');
      }
      setChecking(false);
    })();
    return () => { active = false; };
  }, [email, token]);

  const rules = {
    length: password.length >= 8,
    match: password.length > 0 && password === confirm,
  };
  const canSubmit = rules.length && rules.match && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    const res = await confirmPasswordReset(email, token, password);
    setLoading(false);
    if (res.success) {
      setSuccess(true);
      setSuccessMsg(res.message || 'Mot de passe réinitialisé avec succès.');
    } else {
      setError(res.error || 'Une erreur est survenue.');
    }
  };

  // ── État : vérification du token en cours ─────────────────────────────────
  if (checking) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Vérification du lien...</Text>
      </View>
    );
  }

  // ── État : lien invalide / expiré ──────────────────────────────────────────
  if (tokenValid === false) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.successIcon}>⚠️</Text>
        <Text style={styles.successTitle}>Lien invalide</Text>
        <Text style={styles.successText}>
          {tokenError}{'\n\n'}Veuillez refaire une demande de réinitialisation depuis l'écran de connexion.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
        >
          <Text style={styles.buttonText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── État : succès ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={styles.centerContent}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Mot de passe modifié</Text>
        <Text style={styles.successText}>
          {successMsg}{'\n\n'}Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
        >
          <Text style={styles.buttonText}>Aller à la connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Formulaire ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.icon}>🔐</Text>
          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>
            Choisissez un nouveau mot de passe pour{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
        </View>

        <View style={styles.form}>
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowPwd(!showPwd)}>
                <Text style={styles.toggleText}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <TextInput
              style={[styles.input, { paddingRight: 14 }]}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.rules}>
            <View style={styles.rule}>
              <Text style={styles.ruleIcon}>{rules.length ? '✅' : '⭕'}</Text>
              <Text style={[styles.ruleText, rules.length && styles.ruleTextOk]}>Au moins 8 caractères</Text>
            </View>
            <View style={styles.rule}>
              <Text style={styles.ruleIcon}>{rules.match ? '✅' : '⭕'}</Text>
              <Text style={[styles.ruleText, rules.match && styles.ruleTextOk]}>Les mots de passe correspondent</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {loading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.buttonText}>Réinitialiser le mot de passe</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
          >
            <Text style={styles.secondaryBtnText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}