// src/screens/ResetPasswordScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, ActivityIndicator, Linking,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Appels API directs (pas via AuthContext pour éviter le cycle de dépendances)
const API_BASE = 'https://remine-backend.onrender.com/api';

async function apiVerifyToken(email, token) {
  try {
    const res = await fetch(
      `${API_BASE}/auth/verify-reset-token?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
    );
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur de connexion au serveur.' };
  }
}

async function apiConfirmReset(email, token, newPassword) {
  try {
    const res = await fetch(`${API_BASE}/auth/confirm-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, newPassword }),
    });
    return await res.json();
  } catch {
    return { success: false, error: 'Erreur de connexion au serveur.' };
  }
}

export default function ResetPasswordScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const [email, setEmail]           = useState(route?.params?.email || '');
  const [token, setToken]           = useState(route?.params?.token || '');
  const [paramsReady, setParamsReady] = useState(!!(route?.params?.email && route?.params?.token));

  const [checking, setChecking]     = useState(true);
  const [tokenValid, setTokenValid] = useState(null);
  const [tokenError, setTokenError] = useState('');

  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Lire les params depuis l'URL si route.params est vide
  useEffect(() => {
    if (email && token) { setParamsReady(true); return; }

    const extractParams = (url) => {
      if (!url) return;
      try {
        const qs = url.includes('?') ? url.split('?')[1] : '';
        const p = {};
        qs.split('&').forEach(pair => {
          const [k, v] = pair.split('=');
          if (k && v) p[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
        });
        if (p.token) setToken(p.token);
        if (p.email) setEmail(p.email);
        if (p.token && p.email) setParamsReady(true);
        else setParamsReady(true); // on avance même si vide → affichera "lien invalide"
      } catch { setParamsReady(true); }
    };

    Linking.getInitialURL().then(url => {
      if (url) extractParams(url);
      else setParamsReady(true);
    });

    const sub = Linking.addEventListener('url', ({ url }) => extractParams(url));
    return () => sub?.remove?.();
  }, []);

  // Vérifier le token une fois les params prêts
  useEffect(() => {
    if (!paramsReady) return;
    let active = true;
    (async () => {
      if (!email || !token) {
        if (active) { setTokenValid(false); setTokenError('Lien invalide : informations manquantes.'); setChecking(false); }
        return;
      }
      const res = await apiVerifyToken(email, token);
      if (!active) return;
      if (res.success) { setTokenValid(true); }
      else { setTokenValid(false); setTokenError(res.error || 'Lien invalide ou expiré.'); }
      setChecking(false);
    })();
    return () => { active = false; };
  }, [paramsReady, email, token]);

  const rules = {
    length: password.length >= 8,
    match: password.length > 0 && password === confirm,
  };
  const canSubmit = rules.length && rules.match && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true); setError('');
    const res = await apiConfirmReset(email, token, password);
    setLoading(false);
    if (res.success) { setSuccess(true); setSuccessMsg(res.message || 'Mot de passe réinitialisé avec succès.'); }
    else { setError(res.error || 'Une erreur est survenue.'); }
  };

  const goToLogin = () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] });

  // Loading
  if (!paramsReady || checking) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{!paramsReady ? 'Lecture du lien…' : 'Vérification du lien…'}</Text>
      </View>
    );
  }

  // Lien invalide
  if (tokenValid === false) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Lien invalide</Text>
        <Text style={styles.errorSub}>{tokenError}{'\n\n'}Veuillez refaire une demande depuis l'écran de connexion.</Text>
        <TouchableOpacity style={styles.btn} onPress={goToLogin}>
          <Text style={styles.btnText}>Retour à la connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Succès
  if (success) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>✅</Text>
        <Text style={[styles.errorTitle, { color: colors.primary }]}>Mot de passe modifié</Text>
        <Text style={styles.errorSub}>{successMsg}{'\n\n'}Vous pouvez maintenant vous connecter.</Text>
        <TouchableOpacity style={styles.btn} onPress={goToLogin}>
          <Text style={styles.btnText}>Aller à la connexion</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Formulaire
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.bigIcon}>🔐</Text>
          <Text style={[styles.errorTitle, { color: colors.primary }]}>Nouveau mot de passe</Text>
          <Text style={styles.errorSub}>Pour le compte <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{email}</Text></Text>
        </View>

        <View style={styles.form}>
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

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
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)} style={styles.toggleBtn}>
              <Text style={{ fontSize: 18 }}>{showPwd ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Confirmer le mot de passe</Text>
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

          <View style={styles.rules}>
            <Text style={[styles.rule, rules.length && { color: colors.primary }]}>
              {rules.length ? '✅' : '⭕'} Au moins 8 caractères
            </Text>
            <Text style={[styles.rule, rules.match && { color: colors.primary }]}>
              {rules.match ? '✅' : '⭕'} Les mots de passe correspondent
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.btn, !canSubmit && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Réinitialiser le mot de passe</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={goToLogin}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  scroll:      { flexGrow: 1, padding: 24, justifyContent: 'center' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  bigIcon:     { fontSize: 52, marginBottom: 14, textAlign: 'center' },
  errorTitle:  { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10, color: colors.textPrimary },
  errorSub:    { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  header:      { alignItems: 'center', marginBottom: 24 },
  form:        { backgroundColor: colors.surface, padding: 22, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  label:       { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputWrap:   { position: 'relative' },
  input:       { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 13, paddingRight: 48, fontSize: 15, color: colors.textPrimary },
  toggleBtn:   { position: 'absolute', right: 12, top: 10 },
  rules:       { marginTop: 12, marginBottom: 18, gap: 6 },
  rule:        { fontSize: 13, color: colors.textSecondary },
  errorBox:    { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 14 },
  errorText:   { color: '#dc2626', fontSize: 13 },
  btn:         { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 4, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  btnDisabled: { backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn:   { padding: 13, alignItems: 'center', marginTop: 8 },
  cancelText:  { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
});