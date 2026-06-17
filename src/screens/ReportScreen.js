// src/screens/ReportScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Image, StatusBar, Animated, Modal,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import reportService from '../services/reports';
import { fontSize, spacing, radius, shadow } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');

const DRAFT_KEY = '@report_draft';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24h — un brouillon trop vieux n'est plus proposé

// ==================== CONFIG ====================

const getTypes = (colors) => [
  { key: 'water_pollution',    emoji: '💧', label: 'Eau',        color: colors.blue, bg: '#eff6ff' },
  { key: 'dust',               emoji: '🌫️', label: 'Poussière',  color: colors.purple, bg: '#f5f3ff' },
  { key: 'waste_deposit',      emoji: '🗑️', label: 'Déchets',    color: colors.warning, bg: '#fffbeb' },
  { key: 'abandoned_site',     emoji: '🏚️', label: 'Abandonné',  color: colors.textSecondary, bg: '#f9fafb' },
  { key: 'air_pollution',      emoji: '💨', label: 'Air',        color: colors.cyan, bg: '#ecfeff' },
  { key: 'soil_contamination', emoji: '🟤', label: 'Sol',        color: colors.orange, bg: '#fef3c7' },
  { key: 'noise_pollution',    emoji: '🔊', label: 'Bruit',      color: colors.purple, bg: '#fdf2f8' },
  { key: 'other',              emoji: '⚠️', label: 'Autre',      color: colors.primary, bg: '#ecfdf5' },
];

const getSeverities = (colors) => [
  { key: 'low',      label: 'Faible',   emoji: '🟢', color: colors.primary, bg: '#dcfce7' },
  { key: 'medium',   label: 'Moyen',    emoji: '🟡', color: colors.orange, bg: '#fef9c3' },
  { key: 'high',     label: 'Élevé',    emoji: '🔴', color: colors.dangerDark, bg: '#fee2e2' },
  { key: 'critical', label: 'Critique', emoji: '🚨', color: colors.dangerDark, bg: '#fecaca' },
];

// Progression des étapes
const STEPS = [
  { key: 'type',     label: 'Type',        icon: '🔍' },
  { key: 'describe', label: 'Description', icon: '✍️' },
  { key: 'locate',   label: 'Lieu',        icon: '📍' },
  { key: 'severity', label: 'Gravité',     icon: '⚡' },
  { key: 'photos',   label: 'Photos',      icon: '📸' },
];

// ==================== COMPOSANT BOUNCE ====================

const BounceButton = ({ onPress, style, children, disabled }) => {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 20 }).start();
  return (
    <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
                      activeOpacity={1} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ==================== BARRE DE PROGRESSION ====================

function ProgressBar({ type, description, address, severity }) {
  const { colors } = useTheme();
  const pb = React.useMemo(() => makePb(colors), [colors]);
  const steps = [
    { done: !!type },
    { done: description.length >= 10 },
    { done: !!address },
    { done: !!severity },
    { done: true }, // photos optionnel
  ];
  const completed = steps.filter(s => s.done).length;
  const progress   = completed / steps.length;

  const animWidth = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(animWidth, { toValue: progress, useNativeDriver: false, tension: 60 }).start();
  }, [progress]);

  return (
    <View style={pb.container}>
      <View style={pb.track}>
        <Animated.View
          style={[pb.fill, {
            width: animWidth.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]}
        />
      </View>
      <Text style={pb.label}>{completed}/{steps.length} étapes</Text>
    </View>
  );
}

const makePb = (colors) => StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, gap: 10 },
  track:     { flex: 1, height: 5, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  fill:      { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  label:     { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600', width: 60, textAlign: 'right' },
});

// ==================== ÉCRAN PRINCIPAL ====================

export default function ReportScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);
  const TYPES = getTypes(colors);
  const SEVERITIES = getSeverities(colors);
  const { user } = useAuth();

  const [type,        setType]        = useState('');
  const [description, setDescription] = useState('');
  const [address,     setAddress]     = useState('');
  const [severity,    setSeverity]    = useState('medium');
  const [photos,      setPhotos]      = useState([]);
  const [gps,         setGps]         = useState(null);
  const [loadingGps,  setLoadingGps]  = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  // ── Brouillon ────────────────────────────────────────────────────────────
  const [draftLoaded,    setDraftLoaded]    = useState(false); // évite de sauvegarder avant d'avoir chargé
  const [showDraftBanner, setShowDraftBanner] = useState(false);
  const [draftSavedAt,   setDraftSavedAt]   = useState(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60,   useNativeDriver: true }),
    ]).start();
    loadDraft();
  }, []);

  // Charge un éventuel brouillon sauvegardé (signalement abandonné en cours de route)
  const loadDraft = async () => {
    try {
      const raw = await AsyncStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        const age = Date.now() - (draft.savedAt || 0);
        const hasContent = draft.type || (draft.description && draft.description.length > 0) || (draft.photos && draft.photos.length > 0);
        if (age < DRAFT_TTL && hasContent) {
          setType(draft.type || '');
          setDescription(draft.description || '');
          setAddress(draft.address || '');
          setSeverity(draft.severity || 'medium');
          setPhotos(draft.photos || []);
          if (draft.gps) setGps(draft.gps);
          setDraftSavedAt(draft.savedAt);
          setShowDraftBanner(true);
          setDraftLoaded(true);
          return; // ne pas relancer le GPS, on a déjà une position dans le brouillon
        } else if (age >= DRAFT_TTL) {
          await AsyncStorage.removeItem(DRAFT_KEY); // brouillon trop ancien, on nettoie
        }
      }
    } catch (e) {
      console.log('Brouillon: erreur de chargement', e.message);
    }
    setDraftLoaded(true);
    getLocation();
  };

  // Sauvegarde automatique du brouillon à chaque modification significative
  useEffect(() => {
    if (!draftLoaded) return; // attend le chargement initial pour ne pas écraser un brouillon existant
    const hasContent = type || description.length > 0 || photos.length > 0;
    const timeoutId = setTimeout(async () => {
      try {
        if (hasContent) {
          await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({
            type, description, address, severity, photos, gps,
            savedAt: Date.now(),
          }));
        } else {
          await AsyncStorage.removeItem(DRAFT_KEY);
        }
      } catch (e) {
        console.log('Brouillon: erreur de sauvegarde', e.message);
      }
    }, 600); // debounce léger pour ne pas écrire à chaque frappe
    return () => clearTimeout(timeoutId);
  }, [type, description, address, severity, photos, gps, draftLoaded]);

  const discardDraft = async () => {
    setType('');
    setDescription('');
    setAddress('');
    setSeverity('medium');
    setPhotos([]);
    setGps(null);
    setShowDraftBanner(false);
    try { await AsyncStorage.removeItem(DRAFT_KEY); } catch {}
    getLocation();
  };

  const getLocation = async () => {
    setLoadingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setGps(coords);
      const [place] = await Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng });
      if (place) setAddress([place.street, place.city, place.region].filter(Boolean).join(', '));
    } catch (e) {
      console.log('GPS:', e.message);
    } finally {
      setLoadingGps(false);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const selected = await reportService.pickFromGallery();
      if (selected?.length) setPhotos(p => [...p, ...selected].slice(0, 5));
    } catch (e) { Alert.alert('Oups !', e.message); }
  };

  const handlePickVideo = async () => {
    try {
      const video = await reportService.pickVideo();
      if (video) setPhotos(p => [...p, video].slice(0, 5));
    } catch (e) { Alert.alert('Oups !', e.message); }
  };

  const handleTakePhoto = async () => {
    try {
      const photo = await reportService.takePhoto();
      if (photo) setPhotos(p => [...p, photo].slice(0, 5));
    } catch (e) { Alert.alert('Oups !', e.message); }
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission refusée', 'Autorisez l\'accès au microphone dans les réglages.');
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement.');
    }
  };

  const stopRecording = async () => {
    try {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      await audioRecorder.stop();
      setIsRecording(false);
      Alert.alert(
        '🎤 Enregistrement terminé',
        'La transcription automatique n\'est pas encore disponible.\n\nVous pouvez saisir votre description manuellement ci-dessous.',
        [{ text: 'OK', style: 'cancel' }]
      );
    } catch (e) {
      setIsRecording(false);
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const handleSubmit = () => {
    if (!type)                    return Alert.alert('Hé !', 'Choisis un type de pollution 👆');
    if (description.length < 10)  return Alert.alert('Hé !', 'Décris un peu mieux ce que tu vois ✍️');
    if (!address)                  return Alert.alert('Hé !', 'On a besoin de la localisation 📍');
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      const result = await reportService.createReport({
        type, description, address, severity,
        latitude:  gps?.lat || 14.7167,
        longitude: gps?.lng || -17.4677,
      }, photos, user);

      if (result.success) {
        await AsyncStorage.removeItem(DRAFT_KEY); // signalement envoyé → le brouillon n'a plus lieu d'être
        Alert.alert(
          '🎉 C\'est parti !',
          result.backendSuccess
            ? 'Ton signalement a été transmis. Merci pour la planète ! 🌍'
            : 'Sauvegardé ! Il sera envoyé dès que tu auras du réseau.',
          [{ text: 'Super !', onPress: () => navigation.navigate('HomeTabs') }]
        );
      } else {
        Alert.alert('Erreur', result.error);
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedType     = TYPES.find(t => t.key === type);
  const selectedSeverity = SEVERITIES.find(s => s.key === severity);
  const canSubmit        = type && description.length >= 10 && address && !submitting;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.headerGreen }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#16a34a" />

      {/* ── HEADER IMMERSIF ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Signaler un impact</Text>
          <Text style={styles.headerSub}>Votre voix compte pour l'environnement</Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── BARRE DE PROGRESSION ── */}
      <ProgressBar
        type={type}
        description={description}
        address={address}
        severity={severity}
      />

      {/* ── BANNIÈRE BROUILLON RESTAURÉ ── */}
      {showDraftBanner && (
        <View style={[styles.draftBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.draftBannerIcon}>📝</Text>
          <View style={styles.draftBannerTextWrap}>
            <Text style={[styles.draftBannerTitle, { color: colors.textPrimary }]}>Brouillon restauré</Text>
            <Text style={[styles.draftBannerSub, { color: colors.textSecondary }]}>
              Reprends là où tu t'étais arrêté(e)
            </Text>
          </View>
          <TouchableOpacity onPress={discardDraft} hitSlop={10}>
            <Text style={[styles.draftBannerClear, { color: colors.danger }]}>Effacer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDraftBanner(false)} hitSlop={10} style={{ marginLeft: 10 }}>
            <Text style={[styles.draftBannerClose, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Animated.ScrollView
          style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: colors.background }]}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── TYPE ── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>1</Text></View>
              <Text style={styles.sectionTitle}>Quel type de problème ?</Text>
              {selectedType && <Text style={styles.sectionCheck}>✓</Text>}
            </View>
            <View style={styles.typeGrid}>
              {TYPES.map(t => (
                <BounceButton key={t.key} onPress={() => setType(t.key)}>
                  <View style={[styles.typeCard, type === t.key && { backgroundColor: t.bg, borderColor: t.color, borderWidth: 2.5 }]}>
                    <Text style={styles.typeEmoji}>{t.emoji}</Text>
                    <Text style={[styles.typeLabel, type === t.key && { color: t.color, fontWeight: '700' }]}>
                      {t.label}
                    </Text>
                  </View>
                </BounceButton>
              ))}
            </View>
            {selectedType && (
              <View style={[styles.selectedBadge, { backgroundColor: selectedType.bg }]}>
                <Text style={[styles.selectedBadgeText, { color: selectedType.color }]}>
                  {selectedType.emoji} {selectedType.label} sélectionné
                </Text>
              </View>
            )}
          </View>

          {/* ── DESCRIPTION ── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>2</Text></View>
              <Text style={styles.sectionTitle}>Décrivez ce que vous voyez</Text>
              {description.length >= 10 && <Text style={styles.sectionCheck}>✓</Text>}
            </View>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.inputHint}>Soyez précis — cela aide les autorités à agir</Text>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[styles.micBtn, isRecording && styles.micBtnActive]}
                  onPress={handleVoiceInput}
                >
                  <Text style={styles.micIcon}>{isRecording ? '⏹️' : '🎤'}</Text>
                  <Text style={[styles.micLabel, isRecording && styles.micLabelActive]}>
                    {isRecording ? 'Stop' : 'Dicter'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
            {isRecording && (
              <View style={styles.recordingBanner}>
                <Animated.View style={[styles.recordingDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.recordingText}>Enregistrement en cours… Parlez maintenant</Text>
              </View>
            )}
            <TextInput
              style={[styles.textarea, { color: colors.textPrimary, backgroundColor: colors.backgroundAlt, borderColor: colors.border }, description.length >= 10 && styles.inputValid]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex : Déversement de liquide brun près de la rivière, odeur forte depuis 3 jours…"
              placeholderTextColor="#c4c4c4"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={1000}
            />
            <View style={styles.counterRow}>
              {description.length >= 10
                ? <Text style={styles.counterOk}>✅ Bonne description !</Text>
                : <Text style={styles.counterHint}>Encore {10 - description.length} caractères min.</Text>}
              <Text style={styles.counter}>{description.length}/1000</Text>
            </View>
          </View>

          {/* ── LOCALISATION ── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>3</Text></View>
              <Text style={styles.sectionTitle}>Localisation</Text>
              {address ? <Text style={styles.sectionCheck}>✓</Text> : null}
            </View>
            <TouchableOpacity
              style={[styles.gpsChip, gps && styles.gpsChipActive]}
              onPress={getLocation}
              disabled={loadingGps}
            >
              {loadingGps
                ? <><ActivityIndicator size="small" color="#16a34a" /><Text style={styles.gpsChipText}> Localisation en cours…</Text></>
                : <Text style={[styles.gpsChipText, gps && { color: colors.primary, fontWeight: '600' }]}>
                    {gps ? `📍 ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}  •  Appuyer pour actualiser` : '📡 Obtenir ma position GPS'}
                  </Text>}
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.backgroundAlt, borderColor: colors.border }, address && styles.inputValid]}
              value={address}
              onChangeText={setAddress}
              placeholder="Ou saisissez l'adresse manuellement…"
              placeholderTextColor="#c4c4c4"
            />
          </View>

          {/* ── GRAVITÉ ── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.stepBadge}><Text style={styles.stepNumber}>4</Text></View>
              <Text style={styles.sectionTitle}>Niveau de gravité</Text>
              <Text style={styles.sectionCheck}>✓</Text>
            </View>
            <View style={styles.severityRow}>
              {SEVERITIES.map(sv => (
                <BounceButton key={sv.key} onPress={() => setSeverity(sv.key)}>
                  <View style={[styles.severityCard, severity === sv.key && { backgroundColor: sv.bg, borderColor: sv.color, borderWidth: 2.5 }]}>
                    <Text style={styles.severityEmoji}>{sv.emoji}</Text>
                    <Text style={[styles.severityLabel, severity === sv.key && { color: sv.color, fontWeight: '700' }]}>
                      {sv.label}
                    </Text>
                  </View>
                </BounceButton>
              ))}
            </View>
          </View>

          {/* ── PHOTOS ── */}
          <View style={[styles.section, { paddingHorizontal: 0, paddingBottom: 0, overflow: 'hidden', backgroundColor: colors.surface }]}>
            <View style={[styles.sectionHeader, { paddingHorizontal: 18 }]}>
              <View style={[styles.stepBadge, { backgroundColor: colors.blueLight }]}>
                <Text style={[styles.stepNumber, { color: colors.blue }]}>5</Text>
              </View>
              <Text style={styles.sectionTitle}>Photos & Vidéos <Text style={styles.optional}>(optionnel)</Text></Text>
              {photos.length > 0 && <Text style={styles.sectionCheck}>✓</Text>}
            </View>
            <Text style={[styles.inputHint, { paddingHorizontal: 18, marginBottom: 0 }]}>Les photos renforcent la crédibilité du signalement</Text>
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoBtn, { borderBottomLeftRadius: 20 }, photos.length >= 5 && styles.photoBtnDisabled]}
                onPress={handleTakePhoto}
                disabled={photos.length >= 5}
                activeOpacity={0.75}
              >
                <Text style={styles.photoBtnIcon}>📷</Text>
                <Text style={styles.photoBtnText}>Caméra</Text>
              </TouchableOpacity>
              <View style={styles.photoDivider} />
              <TouchableOpacity
                style={[styles.photoBtn, photos.length >= 5 && styles.photoBtnDisabled]}
                onPress={handlePickVideo}
                disabled={photos.length >= 5}
                activeOpacity={0.75}
              >
                <Text style={styles.photoBtnIcon}>🎥</Text>
                <Text style={styles.photoBtnText}>Vidéo</Text>
              </TouchableOpacity>
              <View style={styles.photoDivider} />
              <TouchableOpacity
                style={[styles.photoBtn, { borderBottomRightRadius: 20 }, photos.length >= 5 && styles.photoBtnDisabled]}
                onPress={handleAddPhoto}
                disabled={photos.length >= 5}
                activeOpacity={0.75}
              >
                <Text style={styles.photoBtnIcon}>🖼️</Text>
                <Text style={styles.photoBtnText}>Galerie</Text>
              </TouchableOpacity>
            </View>
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.photoWrap}>
                    {p.isVideo ? (
                      <View style={[styles.photoImg, { backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 28 }}>🎥</Text>
                        {p.duration && <Text style={{ color: '#fff', fontSize: 10 }}>{Math.round(p.duration)}s</Text>}
                      </View>
                    ) : (
                      <Image source={{ uri: p.uri }} style={styles.photoImg} />
                    )}
                    <TouchableOpacity
                      style={styles.photoDel}
                      onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))}
                    >
                      <Text style={styles.photoDelText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {photos.length < 5 && (
                  <View style={styles.photoCount}>
                    <Text style={styles.photoCountText}>{photos.length}/5</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>

          {/* ── SUBMIT ── */}
          <BounceButton onPress={handleSubmit} disabled={!canSubmit}>
            <View style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <>
                    <Text style={styles.submitEmoji}>🚀</Text>
                    <Text style={styles.submitText}>Envoyer le signalement</Text>
                  </>}
            </View>
          </BounceButton>

          {!canSubmit && !submitting && (
            <Text style={styles.submitHint}>
              {!type ? '👆 Choisis un type de pollution' : description.length < 10 ? '✍️ Décris un peu plus' : '📍 Ajoute la localisation'}
            </Text>
          )}

          <View style={{ height: 48 }} />
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {/* ── MODAL DE CONFIRMATION ── */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>📋 Confirmer l'envoi</Text>
            <Text style={styles.modalSubtitle}>Vérifiez votre signalement avant de l'envoyer</Text>

            <View style={[styles.modalRecap, { backgroundColor: colors.backgroundAlt }]}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Type</Text>
                <Text style={styles.modalValue}>
                  {TYPES.find(t => t.key === type)?.emoji} {TYPES.find(t => t.key === type)?.label}
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Gravité</Text>
                <Text style={styles.modalValue}>
                  {SEVERITIES.find(sv => sv.key === severity)?.emoji} {SEVERITIES.find(sv => sv.key === severity)?.label}
                </Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Lieu</Text>
                <Text style={styles.modalValue} numberOfLines={2}>{address}</Text>
              </View>
              <View style={styles.modalDivider} />
              <View style={[styles.modalRow, { alignItems: 'flex-start' }]}>
                <Text style={styles.modalLabel}>Description</Text>
                <Text style={[styles.modalValue, { flex: 1 }]} numberOfLines={3}>{description}</Text>
              </View>
              {photos.length > 0 && (
                <>
                  <View style={styles.modalDivider} />
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Photos</Text>
                    <Text style={styles.modalValue}>📸 {photos.length} photo{photos.length > 1 ? 's' : ''}</Text>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowConfirm(false)}>
                <Text style={styles.modalBtnCancelText}>✏️ Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleConfirmSend}>
                <Text style={styles.modalBtnConfirmText}>🚀 Envoyer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const makeStyles = (colors) => StyleSheet.create({
  safe:  { flex: 1, backgroundColor: colors.primary },
  flex:  { flex: 1 },
  scroll:{ paddingHorizontal: 16, paddingTop: 12 },

  // Bannière brouillon restauré
  draftBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  draftBannerIcon: { fontSize: 20, marginRight: 10 },
  draftBannerTextWrap: { flex: 1 },
  draftBannerTitle: { fontSize: 13, fontWeight: '700' },
  draftBannerSub: { fontSize: 11, marginTop: 1 },
  draftBannerClear: { fontSize: 12, fontWeight: '700' },
  draftBannerClose: { fontSize: 15, fontWeight: '700' },

  // Header immersif vert
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:  14,
    backgroundColor:  colors.primary,
    gap:              12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  backIcon:     { fontSize: fontSize.xl, color: colors.surface },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: fontSize.lg, fontWeight: '800', color: colors.surface },
  headerSub:    { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerBadge:  {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6,
  },
  headerBadgeText: { color: colors.surface, fontWeight: '700', fontSize: fontSize.sm },

  // Section
  section: {
    backgroundColor: colors.surface,
    borderRadius:    20,
    padding:         18,
    marginBottom:    12,
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       2,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
  },
  stepBadge: {
    width: 28, height: 28, borderRadius: radius.lg,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  stepNumber:    { fontSize: fontSize.sm, fontWeight: '800', color: colors.primary },
  sectionTitle:  { flex: 1, fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary },
  sectionCheck:  { fontSize: fontSize.lg },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  inputHint:     { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: 12 },

  // Types
  typeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard:  {
    width: (SCREEN_W - 32 - 36 - 18 * 2) / 4,
    paddingVertical: 14, borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt, alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  typeEmoji:    { fontSize: fontSize.xxl, marginBottom: 6 },
  typeLabel:    { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '700', textAlign: 'center' },
  selectedBadge: {
    marginTop: 12, paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: radius.xl, alignSelf: 'flex-start',
  },
  selectedBadgeText: { fontSize: fontSize.md, fontWeight: '700' },

  // Microphone
  micBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.xl, backgroundColor: colors.backgroundAlt, borderWidth: 1.5, borderColor: colors.border },
  micBtnActive: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
  micIcon:      { fontSize: fontSize.lg },
  micLabel:     { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary },
  micLabelActive: { color: colors.danger },
  recordingBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.dangerLight, borderRadius: radius.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.dangerLight },
  recordingDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
  recordingText:   { fontSize: fontSize.sm, color: colors.dangerDark, fontWeight: '600', flex: 1 },

  // Textarea / Input
  textarea: {
    borderWidth: 2, borderColor: colors.borderLight, borderRadius: radius.lg,
    padding: 14, fontSize: fontSize.md, color: colors.textPrimary,
    minHeight: 120, lineHeight: 24, backgroundColor: colors.backgroundAlt,
  },
  inputValid: { borderColor: colors.primaryMid, backgroundColor: colors.primaryLight },
  input: {
    borderWidth: 2, borderColor: colors.borderLight, borderRadius: radius.lg,
    padding: 14, fontSize: fontSize.md, color: colors.textPrimary, backgroundColor: colors.backgroundAlt,
  },
  counterRow:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  counterOk:   { fontSize: fontSize.sm, color: colors.primary, fontWeight: '700' },
  counterHint: { fontSize: fontSize.sm, color: colors.warning, fontWeight: '600' },
  counter:     { fontSize: fontSize.sm, color: colors.textDisabled },

  // GPS
  gpsChip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: radius.lg, padding: 14, marginBottom: 10,
  },
  gpsChipActive: { borderColor: colors.primaryMid, borderStyle: 'solid', backgroundColor: colors.primaryLight },
  gpsChipText:   { fontSize: fontSize.md, color: colors.textMuted, flex: 1 },

  // Gravité
  severityRow: { flexDirection: 'row', gap: 8 },
  severityCard: {
    flex: 1, aspectRatio: 0.85, borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: 'transparent',
  },
  severityEmoji: { fontSize: 52, marginBottom: 8 },
  severityLabel: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '800' },

  // Photos
  optional:     { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '400' },
  photoActions: { flexDirection: 'row', marginTop: 12 },
  photoBtn: {
    flex: 1, height: 230, borderRadius: 0,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  photoDivider: { width: 2, backgroundColor: colors.surface },
  photoBtnDisabled: { opacity: 0.35 },
  photoBtnIcon:  { fontSize: 90, marginBottom: 14 },
  photoBtnText:  { fontSize: fontSize.lg, color: colors.primary, fontWeight: '800' },
  photoList:     { marginTop: 6 },
  photoWrap:     { width: 86, height: 86, marginRight: 10, borderRadius: radius.md, overflow: 'visible' },
  photoImg:      { width: 86, height: 86, borderRadius: radius.md },
  photoDel: {
    position: 'absolute', top: -6, right: -6,
    width: 24, height: 24, borderRadius: radius.md,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center',
  },
  photoDelText: { color: colors.surface, fontSize: fontSize.md, fontWeight: '800' },
  photoCount: {
    width: 86, height: 86, borderRadius: radius.md,
    backgroundColor: colors.backgroundAlt, alignItems: 'center', justifyContent: 'center',
  },
  photoCountText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textMuted },

  // Submit
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.xl,
    paddingVertical: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12,
    marginBottom: 12,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  submitDisabled: { backgroundColor: colors.textDisabled, shadowOpacity: 0 },
  submitEmoji:    { fontSize: fontSize.xxl },
  submitText:     { color: colors.surface, fontSize: fontSize.lg, fontWeight: '800' },
  submitHint:     { textAlign: 'center', fontSize: fontSize.md, color: colors.textMuted, marginBottom: 8 },

  // Modal confirmation
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle:    { fontSize: fontSize.xl, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: fontSize.md, color: colors.textMuted, textAlign: 'center', marginBottom: 20 },
  modalRecap:    { backgroundColor: colors.backgroundAlt, borderRadius: radius.lg, padding: 16, marginBottom: 20 },
  modalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, gap: 12 },
  modalLabel:    { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600', width: 80 },
  modalValue:    { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '700', textAlign: 'right' },
  modalDivider:  { height: 1, backgroundColor: colors.borderLight },
  modalButtons:  { flexDirection: 'row', gap: 12 },
  modalBtnCancel: { flex: 1, paddingVertical: 16, borderRadius: radius.lg, backgroundColor: colors.backgroundAlt, alignItems: 'center' },
  modalBtnCancelText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textSecondary },
  modalBtnConfirm: {
    flex: 1, paddingVertical: 16, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  modalBtnConfirmText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.surface },
});