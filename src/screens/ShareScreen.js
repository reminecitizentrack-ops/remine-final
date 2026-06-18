// src/screens/ShareScreen.js — Partage sur réseaux sociaux
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Share,
  Linking, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TYPE_LABELS = {
  water_pollution: 'Pollution de l\'eau', dust: 'Poussières minières',
  abandoned_site: 'Site abandonné', waste_deposit: 'Dépôt de déchets',
  air_pollution: 'Pollution de l\'air', noise_pollution: 'Nuisances sonores', other: 'Signalement environnemental',
};

const STATUS_LABELS = {
  new: 'signalé', verified: 'vérifié', in_progress: 'en cours de traitement',
  resolved: 'résolu ✓', rejected: 'rejeté',
};

const getPlatforms = (colors) => [
  { id: 'native',    label: 'Partager',     Icon: Ionicons,             iconName: 'share-social',     color: colors.textPrimary, bg: '#f3f4f6' },
  { id: 'whatsapp',  label: 'WhatsApp',     Icon: FontAwesome5,         iconName: 'whatsapp',         color: '#25D366',          bg: '#f0fdf4' },
  { id: 'facebook',  label: 'Facebook',     Icon: FontAwesome5,         iconName: 'facebook',         color: '#1877F2',          bg: '#eff6ff' },
  { id: 'twitter',   label: 'X (Twitter)',  Icon: FontAwesome5,         iconName: 'twitter',          color: '#000000',          bg: '#f9fafb' },
  { id: 'copy',      label: 'Copier lien',  Icon: Ionicons,             iconName: 'link',             color: colors.purple,      bg: '#f5f3ff' },
  { id: 'sms',       label: 'SMS',          Icon: MaterialCommunityIcons, iconName: 'message-text',   color: colors.orange,      bg: '#fffbeb' },
];

export default function ShareScreen({ route, navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const PLATFORMS = getPlatforms(colors);
  const { report } = route.params || {};
  const [copying, setCopying] = useState(false);

  if (!report) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Signalement introuvable</Text>
      </View>
    );
  }

  const typeLabel   = TYPE_LABELS[report.type] || 'Signalement';
  const statusLabel = STATUS_LABELS[report.status] || report.status;
  const address     = report.location?.address || report.address || 'Localisation inconnue';
  const appUrl      = `https://remine.sn/signalement/${report._id || report.id}`;

  const buildMessage = (platform) => {
    const emoji = platform === 'twitter' ? '' : '🌍 ';
    const tag   = platform === 'twitter' ? '\n\n#ReMine #Environnement #Sénégal' : '';
    return `${emoji}Signalement ReMine : ${typeLabel} ${statusLabel} à ${address}.` +
      `\n\nSignalez aussi les problèmes environnementaux près de chez vous avec l'app ReMine Citizen Track.` +
      `\n\n${appUrl}${tag}`;
  };

  const handleShare = async (platform) => {
    const message = buildMessage(platform);

    try {
      switch (platform) {
        case 'native':
          await Share.share({ message, title: `Signalement ReMine — ${typeLabel}` });
          break;

        case 'whatsapp': {
          const url = `whatsapp://send?text=${encodeURIComponent(message)}`;
          const ok  = await Linking.canOpenURL(url);
          if (ok) Linking.openURL(url);
          else Alert.alert('WhatsApp non installé', 'Veuillez installer WhatsApp pour partager.');
          break;
        }

        case 'facebook': {
          const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`;
          Linking.openURL(url);
          break;
        }

        case 'twitter': {
          const tweet = buildMessage('twitter');
          const url   = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
          Linking.openURL(url);
          break;
        }

        case 'sms': {
          const url = `sms:?body=${encodeURIComponent(message)}`;
          const ok  = await Linking.canOpenURL(url);
          if (ok) Linking.openURL(url);
          else Alert.alert('SMS non disponible');
          break;
        }

        case 'copy': {
          setCopying(true);
          // Expo Clipboard
          try {
            const { setStringAsync } = await import('expo-clipboard');
            await setStringAsync(message);
            Alert.alert('✓ Copié !', 'Le message a été copié dans le presse-papier.');
          } catch {
            Alert.alert('Lien', appUrl);
          }
          setTimeout(() => setCopying(false), 1500);
          break;
        }
      }
    } catch (e) {
      console.log('Erreur partage:', e.message);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Aperçu du signalement */}
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>Aperçu du partage</Text>
          <View style={styles.previewCard}>
            <View style={styles.previewAppRow}>
              <MaterialCommunityIcons name="earth" size={16} color={colors.primary} />
              <Text style={styles.previewApp}>ReMine Citizen Track</Text>
            </View>
            <Text style={styles.previewType}>{typeLabel}</Text>
            <Text style={styles.previewStatus}>Statut : {statusLabel}</Text>
            <View style={styles.previewAddrRow}>
              <Ionicons name="location" size={14} color={colors.textSecondary} />
              <Text style={styles.previewAddr}>{address}</Text>
            </View>
            <Text style={styles.previewUrl}>{appUrl}</Text>
          </View>
        </View>

        {/* Boutons de partage */}
        <Text style={styles.sectionTitle}>Partager via</Text>
        <View style={styles.platforms}>
          {PLATFORMS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.platformBtn, { backgroundColor: p.bg, borderColor: p.color }]}
              onPress={() => handleShare(p.id)}
              disabled={p.id === 'copy' && copying}
            >
              {p.id === 'copy' && copying
                ? <ActivityIndicator color={p.color} size="small" />
                : <p.Icon name={p.iconName} size={26} color={p.color} />
              }
              <Text style={[styles.platformLabel, { color: p.color }]}>
                {p.id === 'copy' && copying ? 'Copié !' : p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Message d'impact */}
        <View style={styles.impactBox}>
          <View style={styles.impactTitleRow}>
            <Ionicons name="megaphone" size={17} color={colors.primary} />
            <Text style={styles.impactTitle}>Votre partage compte</Text>
          </View>
          <Text style={styles.impactText}>
            Chaque partage sensibilise davantage de citoyens aux problèmes environnementaux
            et augmente la pression pour une résolution rapide.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: colors.textSecondary, fontSize: 15 },

  preview:      { backgroundColor: colors.textInverse, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  previewTitle: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  previewCard:  { backgroundColor: colors.backgroundAlt, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border },
  previewAppRow:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  previewApp:   { fontSize: 12, color: colors.primary, fontWeight: '700' },
  previewType:  { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  previewStatus:{ fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  previewAddrRow:{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  previewAddr:  { fontSize: 13, color: colors.textSecondary },
  previewUrl:   { fontSize: 11, color: colors.blue, fontStyle: 'italic' },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  platforms:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  platformBtn:  { width: '30%', alignItems: 'center', paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, gap: 6 },
  platformLabel:{ fontSize: 12, fontWeight: '700' },

  impactBox:   { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 16, borderLeftWidth: 4, borderLeftColor: colors.primary },
  impactTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  impactTitle: { fontSize: 14, fontWeight: '700', color: colors.primary },
  impactText:  { fontSize: 13, color: colors.textPrimary, lineHeight: 19 },
});