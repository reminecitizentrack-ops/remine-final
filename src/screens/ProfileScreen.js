// src/screens/ProfileScreen.js — Profil avec modification backend + Sélecteur de langue
import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, TextInput, ActivityIndicator, Switch, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotification } from '../context/NotificationContext';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const createStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1 },
  scroll: { flex: 1 },

  avatarSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  avatarTouchable: { position: 'relative', marginBottom: 14 },
  avatar:     { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4 },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 30, fontWeight: '800', color: colors.surface },
  avatarCameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  avatarCameraIcon: { fontSize: 13 },
  name:       { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  email:      { fontSize: 14, color: colors.textSecondary, marginBottom: 10 },
  roleBadge:  { paddingHorizontal: 14, paddingVertical: 5, backgroundColor: colors.primaryLight, borderRadius: 20, borderWidth: 1, borderColor: colors.primaryMid },
  roleText:   { fontSize: 12, color: colors.primary, fontWeight: '600' },

  statsRow:  { flexDirection: 'row', margin: 16, gap: 10 },
  statCard:  { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.primary, marginBottom: 4 },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },

  section: { backgroundColor: colors.surface, marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  editBtn:       { fontSize: 14, color: colors.primary, fontWeight: '600' },

  infoList: { gap: 10 },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.background },
  infoLabel:{ fontSize: 13, color: colors.textMuted },
  infoValue:{ fontSize: 13, color: colors.textPrimary, fontWeight: '500' },

  form: { gap: 4 },
  field:      { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:      { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.backgroundAlt },
  pwdInputWrap: { position: 'relative' },
  pwdInput:     { paddingRight: 44 },
  pwdToggle:    { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 6 },
  pwdRules:     { marginTop: 2, marginBottom: 14, gap: 6 },
  pwdRuleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwdRuleIcon:  { fontSize: 13 },
  pwdRuleText:  { fontSize: 12, fontWeight: '500' },
  communityBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1.5, borderColor: 'transparent' },
  communityBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  communityText:      { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  communityTextActive:{ color: colors.primary, fontWeight: '700' },
  saveBtn:         { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  saveBtnDisabled: { backgroundColor: colors.primaryMid, shadowOpacity: 0 },
  saveBtnText:     { color: colors.surface, fontWeight: '700', fontSize: 15 },

  switchRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.background },
  switchLabel: { fontSize: 14, color: colors.textPrimary },

  languageSelector: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  langOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.background, borderWidth: 1.5, borderColor: 'transparent' },
  langOptionActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  langFlag: { fontSize: 20 },
  langText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  langTextActive: { color: colors.primary },
  langHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 8 },

  logoutBtn:  { margin: 16, backgroundColor: colors.dangerLight, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.dangerLight },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
});

const COMMUNITIES = ['Dakar', 'Thiès', 'Saint-Louis', 'Ziguinchor', 'Kaolack', 'Mbour', 'Kédougou', 'Autre'];
const AVATAR_KEY_PREFIX = '@profile_avatar_';

export default function ProfileScreen({ navigation }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user, logout } = useAuth();
  const { settings, updateSettings } = useNotification();
  const { t, locale, changeLanguage } = useLanguage();

  const [editing, setEditing]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [stats, setStats]       = useState({ total: 0, resolved: 0, pending: 0 });
  const [form, setForm]         = useState({
    firstName: '', lastName: '', phone: '', community: '',
  });
  const [pwdForm, setPwdForm]   = useState({ current: '', next: '', confirm: '' });
  const [showPwd, setShowPwd]   = useState(false);

  // ── Photo de profil ──────────────────────────────────────────────────────
  const [avatarUri, setAvatarUri]       = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // ── Visibilité des champs mot de passe ──────────────────────────────────
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNextPwd,    setShowNextPwd]    = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        phone:     user.phone     || '',
        community: user.community || '',
      });
      loadStats();
      loadAvatar();
    }
  }, [user]);

  const avatarKey = () => `${AVATAR_KEY_PREFIX}${user?.email || user?._id || 'default'}`;

  const loadAvatar = async () => {
    try {
      const uri = await AsyncStorage.getItem(avatarKey());
      if (uri) setAvatarUri(uri);
    } catch {}
  };

  const pickAvatar = async (fromCamera) => {
    try {
      const { status } = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission refusée', fromCamera ? 'Autorisez l\'accès à la caméra dans les réglages.' : 'Autorisez l\'accès à la galerie dans les réglages.');
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6 });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setAvatarLoading(true);
        const uri = result.assets[0].uri;
        await AsyncStorage.setItem(avatarKey(), uri);
        setAvatarUri(uri);
        setAvatarLoading(false);
      }
    } catch (error) {
      setAvatarLoading(false);
      Alert.alert('Erreur', 'Impossible de définir la photo de profil.');
    }
  };

  const handleChangeAvatar = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une source',
      [
        { text: '📷 Prendre une photo', onPress: () => pickAvatar(true) },
        { text: '🖼️ Choisir dans la galerie', onPress: () => pickAvatar(false) },
        ...(avatarUri ? [{ text: '🗑️ Supprimer la photo', style: 'destructive', onPress: removeAvatar }] : []),
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const removeAvatar = async () => {
    try {
      await AsyncStorage.removeItem(avatarKey());
      setAvatarUri(null);
    } catch {}
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/reports/mine');
      const reports = res.data?.data?.reports || res.data?.data || [];
      const arr = Array.isArray(reports) ? reports : [];
      setStats({
        total:    arr.length,
        resolved: arr.filter(r => r.status === 'resolved').length,
        pending:  arr.filter(r => ['new', 'verified', 'in_progress'].includes(r.status)).length,
      });
    } catch {}
  };

  const handleSave = async () => {
    if (!form.firstName.trim()) {
      return Alert.alert('Erreur', 'Le prénom est obligatoire');
    }
    setLoading(true);
    try {
      const res = await api.put('/auth/profile', form);
      if (res.data?.success) {
        const raw = await AsyncStorage.getItem('userData');
        const userData = raw ? JSON.parse(raw) : {};
        await AsyncStorage.setItem('userData', JSON.stringify({ ...userData, ...form }));
        setEditing(false);
        Alert.alert('✅ Profil mis à jour', 'Vos informations ont été sauvegardées.');
      } else {
        Alert.alert('Erreur', res.data?.error || 'Impossible de mettre à jour le profil');
      }
    } catch (e) {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwdForm.current || !pwdForm.next || !pwdForm.confirm) {
      return Alert.alert('Erreur', 'Remplissez tous les champs');
    }
    if (pwdForm.next.length < 8) {
      return Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
    }
    if (pwdForm.next !== pwdForm.confirm) {
      return Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
    }
    if (pwdForm.next === pwdForm.current) {
      return Alert.alert('Erreur', 'Le nouveau mot de passe doit être différent de l\'ancien');
    }
    setLoading(true);
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword: pwdForm.current,
        newPassword:     pwdForm.next,
      });
      if (res.data?.success) {
        setPwdForm({ current: '', next: '', confirm: '' });
        setShowPwd(false);
        setShowCurrentPwd(false);
        setShowNextPwd(false);
        setShowConfirmPwd(false);
        Alert.alert('✅ Mot de passe modifié', 'Votre mot de passe a été mis à jour.');
      } else {
        Alert.alert('Erreur', res.data?.error || 'Mot de passe actuel incorrect');
      }
    } catch {
      Alert.alert('Erreur', 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnecter', style: 'destructive', onPress: logout },
    ]);
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || '?';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Avatar + infos */}
        <View style={[styles.avatarSection, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={handleChangeAvatar} activeOpacity={0.8} style={styles.avatarTouchable}>
            <View style={styles.avatar}>
              {avatarLoading ? (
                <ActivityIndicator color={colors.surface} />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={[styles.avatarCameraBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
              <Text style={styles.avatarCameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.firstName} {user?.lastName}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role === 'admin' ? '⚡ Admin' : '🌍 Citoyen'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Signalements', value: stats.total    },
            { label: 'En cours',     value: stats.pending  },
            { label: 'Résolus',      value: stats.resolved },
          ].map(st => (
            <View key={st.label} style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.statValue}>{st.value}</Text>
              <Text style={styles.statLabel}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Modifier le profil */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Mes informations</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Text style={styles.editBtn}>{editing ? 'Annuler' : '✏️ Modifier'}</Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <View style={styles.form}>
              {[
                { key: 'firstName', label: 'Prénom *',    placeholder: 'Votre prénom'  },
                { key: 'lastName',  label: 'Nom',         placeholder: 'Votre nom'     },
                { key: 'phone',     label: 'Téléphone',   placeholder: '+221 7X XXX XX XX', keyboard: 'phone-pad' },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({ ...p, [f.key]: v }))}
                    placeholder={f.placeholder}
                    placeholderTextColor="#c4c4c4"
                    keyboardType={f.keyboard || 'default'}
                  />
                </View>
              ))}

              {/* Région */}
              <Text style={styles.fieldLabel}>Région</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {COMMUNITIES.map(c => (
                  <TouchableOpacity key={c}
                    style={[styles.communityBtn, form.community === c && styles.communityBtnActive]}
                    onPress={() => setForm(p => ({ ...p, community: c }))}>
                    <Text style={[styles.communityText, form.community === c && styles.communityTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={[styles.saveBtn, loading && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Enregistrer</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.infoList}>
              {[
                { label: 'Prénom',      value: user?.firstName },
                { label: 'Nom',         value: user?.lastName  },
                { label: 'Email',       value: user?.email     },
                { label: 'Téléphone',   value: user?.phone || 'Non renseigné' },
                { label: 'Région',      value: user?.community || 'Non renseignée' },
              ].map(i => (
                <View key={i.label} style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{i.label}</Text>
                  <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{i.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mot de passe */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🔐 Mot de passe</Text>
            <TouchableOpacity onPress={() => setShowPwd(!showPwd)}>
              <Text style={styles.editBtn}>{showPwd ? 'Annuler' : 'Modifier'}</Text>
            </TouchableOpacity>
          </View>

          {showPwd && (
            <View style={styles.form}>
              {[
                { key: 'current', label: 'Mot de passe actuel',  placeholder: '••••••••', show: showCurrentPwd, setShow: setShowCurrentPwd },
                { key: 'next',    label: 'Nouveau mot de passe', placeholder: 'Min. 8 caractères', show: showNextPwd, setShow: setShowNextPwd },
                { key: 'confirm', label: 'Confirmer',            placeholder: '••••••••', show: showConfirmPwd, setShow: setShowConfirmPwd },
              ].map(f => (
                <View key={f.key} style={styles.field}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <View style={styles.pwdInputWrap}>
                    <TextInput
                      style={[styles.input, styles.pwdInput, { color: colors.textPrimary, backgroundColor: colors.backgroundAlt, borderColor: colors.border }]}
                      value={pwdForm[f.key]}
                      onChangeText={v => setPwdForm(p => ({ ...p, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor="#c4c4c4"
                      secureTextEntry={!f.show}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.pwdToggle} onPress={() => f.setShow(s => !s)} hitSlop={10}>
                      <Text style={{ fontSize: 17 }}>{f.show ? '🙈' : '👁️'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {/* Règles de complexité en temps réel */}
              {pwdForm.next.length > 0 && (
                <View style={styles.pwdRules}>
                  <View style={styles.pwdRuleRow}>
                    <Text style={[styles.pwdRuleIcon, pwdForm.next.length >= 8 && { color: colors.primary }]}>
                      {pwdForm.next.length >= 8 ? '✅' : '⭕'}
                    </Text>
                    <Text style={[styles.pwdRuleText, { color: pwdForm.next.length >= 8 ? colors.primary : colors.textSecondary }]}>
                      Au moins 8 caractères
                    </Text>
                  </View>
                  <View style={styles.pwdRuleRow}>
                    <Text style={[styles.pwdRuleIcon, pwdForm.next.length > 0 && pwdForm.next === pwdForm.confirm && { color: colors.primary }]}>
                      {pwdForm.next.length > 0 && pwdForm.next === pwdForm.confirm ? '✅' : '⭕'}
                    </Text>
                    <Text style={[styles.pwdRuleText, { color: pwdForm.next.length > 0 && pwdForm.next === pwdForm.confirm ? colors.primary : colors.textSecondary }]}>
                      Les mots de passe correspondent
                    </Text>
                  </View>
                  <View style={styles.pwdRuleRow}>
                    <Text style={[styles.pwdRuleIcon, pwdForm.next.length > 0 && pwdForm.next !== pwdForm.current && { color: colors.primary }]}>
                      {pwdForm.next.length > 0 && pwdForm.next !== pwdForm.current ? '✅' : '⭕'}
                    </Text>
                    <Text style={[styles.pwdRuleText, { color: pwdForm.next.length > 0 && pwdForm.next !== pwdForm.current ? colors.primary : colors.textSecondary }]}>
                      Différent de l'ancien mot de passe
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity style={[styles.saveBtn, loading && styles.saveBtnDisabled]} onPress={handleChangePassword} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Changer le mot de passe</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 🌐 LANGUE - Sélecteur intégré */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🌐 Langue</Text>
          </View>
          
          <View style={styles.languageSelector}>
            <TouchableOpacity
              onPress={() => changeLanguage('fr')}
              style={[styles.langOption, locale === 'fr' && styles.langOptionActive]}
            >
              <Text style={styles.langFlag}>🇫🇷</Text>
              <Text style={[styles.langText, locale === 'fr' && styles.langTextActive]}>Français</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => changeLanguage('en')}
              style={[styles.langOption, locale === 'en' && styles.langOptionActive]}
            >
              <Text style={styles.langFlag}>🇬🇧</Text>
              <Text style={[styles.langText, locale === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.langHint}>
            {locale === 'fr' 
              ? '🇫🇷 La langue de l\'application change immédiatement' 
              : '🇬🇧 The app language changes immediately'}
          </Text>
        </View>

        {/* Notifications */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 14 }]}>🔔 Notifications</Text>
          {[
            { key: 'statusUpdates',   label: 'Mises à jour de statut' },
            { key: 'newReports',      label: 'Nouveaux signalements'  },
            { key: 'emergencyAlerts', label: 'Alertes urgentes'       },
            { key: 'communityAlerts', label: 'Activité communautaire' },
          ].map(n => (
            <View key={n.key} style={[styles.switchRow, { borderBottomColor: colors.borderLight }]}>
              <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>{n.label}</Text>
              <Switch
                value={settings[n.key] || false}
                onValueChange={v => updateSettings(n.key, v)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Toggle Dark Mode */}
        <TouchableOpacity
          style={[styles.logoutBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, marginBottom: 0 }]}
          onPress={toggleTheme}
        >
          <Text style={[styles.logoutText, { color: colors.textPrimary }]}>
            {isDark ? '☀️ Passer en mode clair' : '🌙 Passer en mode sombre'}
          </Text>
        </TouchableOpacity>

        {/* Déconnexion */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}