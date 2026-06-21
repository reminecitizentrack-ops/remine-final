import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Share
} from 'react-native';

export default function AboutScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const ContactConfig = {
    company: {
      name: "ReMine Citizen Track",
      slogan: "Votre voix pour une mine responsable"
    },
    contact: {
      email: "reminecitizentrack@gmail.com",
      phone: "+221338370558",
      phoneFormatted: "+221 33 837 05 58",
      schedule: "Lun-Ven 8h-18h",
      website: "https://admirable-conkies-1291ad.netlify.app/contact",
      address: "Dakar, Sénégal"
    }
  };

  const handleContact = async (type, value) => {
    try {
      let url = '';
      
      switch (type) {
        case 'email':
          url = `mailto:${value}?subject=Contact%20ReMine%20Citizen%20Track&body=Bonjour,%20je%20vous%20contacte%20au%20sujet%20de...`;
          break;
        case 'phone':
          url = `tel:${value}`;
          break;
        case 'website':
          url = value;
          break;
        default:
          return;
      }
      
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Erreur', 'Impossible d\'ouvrir cette application');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: `🌍 ReMine Citizen Track — Votre voix pour une mine responsable au Sénégal. Téléchargez l'application et participez à la protection de l'environnement : ${ContactConfig.contact.website}`,
      });
    } catch {}
  };

  const ContactItem = ({ iconName, title, value, type, subtitle = '' }) => (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => handleContact(type, value)}
    >
      <View style={styles.contactIconWrap}>
        <Ionicons name={iconName} size={20} color={colors.primary} />
      </View>
      <View style={styles.contactTextContainer}>
        <Text style={styles.contactTitle}>{title}</Text>
        <Text style={styles.contactValue}>{value}</Text>
        {subtitle ? <Text style={styles.contactSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.appName}>ReMine Citizen Track</Text>
        <Text style={styles.tagline}>{ContactConfig.company.slogan}</Text>
      </View>

      {/* Section Mission */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Notre Mission</Text>
        <Text style={styles.sectionText}>
          ReMine Citizen Track transforme les défis environnementaux miniers 
          en opportunités durables grâce à l'innovation collaborative et 
          la participation citoyenne.
        </Text>
        <Text style={styles.sectionText}>
          Notre application permet aux citoyens de signaler et suivre 
          les problèmes environnementaux liés aux activités minières au Sénégal.
        </Text>
      </View>

      {/* Section Fonctionnement */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔄 Comment ça marche ?</Text>
        
        <View style={styles.stepItem}>
          <Text style={styles.stepNumber}>1</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>Signalement Citoyen</Text>
            <Text style={styles.stepDescription}>
              Les citoyens signalent les problèmes environnementaux avec photos et localisation
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <Text style={styles.stepNumber}>2</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>Validation Collaborative</Text>
            <Text style={styles.stepDescription}>
              La communauté vote et valide l'importance des signalements
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <Text style={styles.stepNumber}>3</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>Suivi en Temps Réel</Text>
            <Text style={styles.stepDescription}>
              Suivez l'avancement des signalements jusqu'à leur résolution
            </Text>
          </View>
        </View>

        <View style={styles.stepItem}>
          <Text style={styles.stepNumber}>4</Text>
          <View style={styles.stepText}>
            <Text style={styles.stepTitle}>Impact Mesurable</Text>
            <Text style={styles.stepDescription}>
              Visualisez l'impact de vos actions sur l'environnement
            </Text>
          </View>
        </View>
      </View>

      {/* Section Vision */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌟 Notre Vision</Text>
        <Text style={styles.sectionText}>
          Faire du Sénégal un leader de l'innovation minière durable, 
          où chaque citoyen participe activement à la protection de 
          son environnement.
        </Text>
        <Text style={styles.sectionText}>
          Nous croyons en une approche collaborative où citoyens, 
          autorités et entreprises travaillent ensemble pour une 
          exploitation minière responsable.
        </Text>
      </View>

      {/* Section Contact */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📞 Nous Contacter</Text>
        
        <ContactItem
          iconName="mail"
          title="Email"
          value={ContactConfig.contact.email}
          type="email"
          subtitle="Pour toute question ou signalement"
        />
        
        <ContactItem
          iconName="call"
          title="Téléphone"
          value={ContactConfig.contact.phoneFormatted}
          type="phone"
          subtitle={ContactConfig.contact.schedule}
        />
        
        <ContactItem
          iconName="globe"
          title="Site Web"
          value={ContactConfig.contact.website}
          type="website"
          subtitle="Plus d'informations sur nos services"
        />
      </View>

      {/* Section Adresse */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Notre Localisation</Text>
        <View style={styles.addressCard}>
          <Text style={styles.addressIcon}>🏢</Text>
          <View style={styles.addressText}>
            <Text style={styles.addressTitle}>ReMine Citizen Track</Text>
            <Text style={styles.addressLine}>{ContactConfig.contact.address}</Text>
            <Text style={styles.scheduleText}>
              🕐 {ContactConfig.contact.schedule}
            </Text>
          </View>
        </View>
      </View>

      {/* Section Urgences */}
      <View style={[styles.section, styles.emergencySection]}>
        <Text style={styles.emergencyTitle}>⚠️ Situation préoccupante ?</Text>
        <Text style={styles.emergencyText}>
          Pour un signalement urgent (mais non vital), contactez notre équipe aux heures
          d'ouverture ({ContactConfig.contact.schedule}). Pour un danger immédiat pour
          des vies humaines, contactez d'abord les services d'urgence officiels
          (Police 17 / Sapeurs-Pompiers 18).
        </Text>
        <TouchableOpacity 
          style={styles.emergencyButton}
          onPress={() => handleContact('phone', ContactConfig.contact.phone)}
        >
          <Text style={styles.emergencyButtonText}>
            📞 Contacter l'équipe {ContactConfig.contact.phoneFormatted}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Partager l'app */}
      <TouchableOpacity style={styles.shareAppButton} onPress={handleShareApp}>
        <Ionicons name="share-social" size={18} color={colors.primary} />
        <Text style={styles.shareAppButtonText}>Partager l'application</Text>
      </TouchableOpacity>

      {/* Pied de page */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © {new Date().getFullYear()} ReMine Citizen Track. Tous droits réservés.
        </Text>
        <Text style={styles.footerVersion}>
          Version 1.0.0 • Dakar, Sénégal
        </Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.backgroundAlt },
  header:         { backgroundColor: colors.primary, padding: 30, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  appName:        { fontSize: 26, fontWeight: '800', color: colors.surface, marginBottom: 6, textAlign: 'center', letterSpacing: -0.5 },
  tagline:        { fontSize: 15, color: 'rgba(255,255,255,0.88)', textAlign: 'center' },
  section:        { backgroundColor: colors.surface, margin: 16, padding: 20, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3 },
  sectionTitle:   { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 14 },
  sectionText:    { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 10 },
  stepItem:       { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, padding: 12, backgroundColor: colors.backgroundAlt, borderRadius: 12 },
  stepNumber:     { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, color: colors.surface, textAlign: 'center', lineHeight: 30, fontWeight: '700', marginRight: 12, marginTop: 1, overflow: 'hidden' },
  stepText:       { flex: 1 },
  stepTitle:      { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 3 },
  stepDescription:{ fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  contactItem:    { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.backgroundAlt, borderRadius: 12, marginBottom: 10 },
  contactIconWrap:{ width: 38, height: 38, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  contactTextContainer: { flex: 1 },
  contactTitle:   { fontSize: 15, fontWeight: '600', color: colors.textPrimary, marginBottom: 2 },
  contactValue:   { fontSize: 13, color: colors.primary, marginBottom: 2 },
  contactSubtitle:{ fontSize: 12, color: colors.textMuted },
  addressCard:    { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.backgroundAlt, borderRadius: 12 },
  addressIcon:    { fontSize: 22, marginRight: 14 },
  addressText:    { flex: 1 },
  addressTitle:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  addressLine:    { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  scheduleText:   { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 3 },
  emergencySection:{ borderLeftWidth: 4, borderLeftColor: colors.danger, backgroundColor: colors.dangerLight },
  emergencyTitle: { fontSize: 17, fontWeight: '700', color: colors.danger, marginBottom: 6 },
  emergencyText:  { fontSize: 13, color: colors.textSecondary, marginBottom: 12, lineHeight: 19 },
  emergencyButton:{ backgroundColor: colors.danger, padding: 14, borderRadius: 12, alignItems: 'center' },
  emergencyButtonText: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  shareAppButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  shareAppButtonText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  footer:         { alignItems: 'center', padding: 20, marginTop: 8 },
  footerText:     { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 6 },
  footerVersion:  { fontSize: 12, color: colors.textDisabled },
});