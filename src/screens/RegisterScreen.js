import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const createStyles = (colors) => StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 24 },
  header:        { alignItems: 'center', marginBottom: 28, marginTop: 10 },
  title:         { fontSize: 30, fontWeight: '800', textAlign: 'center', marginBottom: 6, color: colors.primary, letterSpacing: -0.5 },
  subtitle:      { fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  form:          { backgroundColor: colors.surface, padding: 24, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4 },
  inputGroup:    { marginBottom: 18 },
  label:         { fontSize: 13, fontWeight: '600', marginBottom: 7, color: colors.textPrimary, letterSpacing: 0.2 },
  input:         { backgroundColor: colors.background, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, padding: 14, fontSize: 15, color: colors.textPrimary },
  pwdInputWrap:  { position: 'relative' },
  pwdInput:      { paddingRight: 46 },
  pwdToggle:     { position: 'absolute', right: 10, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 6 },
  pwdRules:      { marginTop: 8, gap: 5 },
  pwdRuleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  pwdRuleIcon:   { fontSize: 13 },
  pwdRuleText:   { fontSize: 12, fontWeight: '500' },
  inputError:    { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  inputValid:    { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  errorText:     { color: colors.danger, fontSize: 12, marginTop: 4, marginLeft: 2 },
  helperText:    { color: colors.textMuted, fontSize: 12, marginTop: 4, marginLeft: 2, fontStyle: 'italic' },
  button:        { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 14, shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4 },
  buttonDisabled:{ backgroundColor: colors.border, shadowOpacity: 0, elevation: 0 },
  buttonText:    { color: colors.surface, fontSize: 16, fontWeight: '700' },
  demoButton:    { backgroundColor: colors.orangeLight, padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.orangeLight },
  demoText:      { color: colors.orange, fontSize: 13, fontWeight: '500' },
  testButton:    { backgroundColor: colors.primaryLight, padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: colors.primaryMid },
  testText:      { color: colors.primary, fontSize: 12, fontWeight: '500' },
  separator:     { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  separatorLine: { flex: 1, height: 1, backgroundColor: colors.border },
  separatorText: { marginHorizontal: 14, color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  secondaryButton:    { backgroundColor: colors.surface, padding: 15, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, marginBottom: 14 },
  secondaryButtonText:{ color: colors.primary, fontSize: 15, fontWeight: '700' },
  terms:         { marginTop: 18, padding: 14, backgroundColor: colors.background, borderRadius: 10, borderLeftWidth: 4, borderLeftColor: colors.primary },
  termsText:     { fontSize: 12, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
  connectionStatus:    { marginTop: 14, alignItems: 'center' },
  connectionStatusText:{ fontSize: 11, color: colors.textMuted, fontStyle: 'italic' },
});


export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    community: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const { register, isLoading } = useAuth();

  // Validation en temps réel
  useEffect(() => {
    const errors = {};
    
    if (!formData.firstName || formData.firstName.length < 2) {
      errors.firstName = 'Le prénom doit contenir au moins 2 caractères';
    }
    
    // NOUVEAU : Validation pour lastName obligatoire
    if (!formData.lastName || formData.lastName.length < 2) {
      errors.lastName = 'Le nom doit contenir au moins 2 caractères';
    }
    
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Format d\'email invalide';
    }
    
    if (!formData.password || formData.password.length < 8) {
      errors.password = 'Le mot de passe doit contenir au moins 8 caractères';
    }
    
    if (!formData.confirmPassword || formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    
    if (formData.phone && !/^[0-9+\-\s()]{10,}$/.test(formData.phone)) {
      errors.phone = 'Numéro de téléphone invalide';
    }
    
    setErrors(errors);
    
    // Vérifier si tous les champs obligatoires sont remplis et valides
    const requiredFieldsValid = 
      formData.firstName && 
      formData.lastName && // ← AJOUTÉ
      formData.email && 
      formData.password && 
      formData.confirmPassword &&
      Object.keys(errors).length === 0;
    
    setIsFormValid(requiredFieldsValid);
  }, [formData]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRegister = async () => {
    if (!isFormValid) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires avant de continuer');
      return;
    }

    const { firstName, lastName, email, password, confirmPassword, community, phone } = formData;

    // Validation finale renforcée
    if (!firstName || !lastName || !email || !password) {
      Alert.alert('Erreur', 'Tous les champs obligatoires doivent être remplis');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    try {
      const result = await register({ 
        firstName, 
        lastName, 
        email, 
        password, 
        community, 
        phone 
      });
      
      if (result.success) {
        Alert.alert(
          'Inscription réussie ! 🎉',
          `Bienvenue ${firstName} ! Votre compte a été créé avec succès.`,
          [{ 
            text: 'Explorer l\'application', 
            style: 'default'
          }]
        );
        
        // Réinitialiser le formulaire
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          community: '',
          phone: ''
        });
        setErrors({});
        
        // La navigation vers MainApp se fait automatiquement via l'auth
      } else {
        Alert.alert(
          'Erreur d\'inscription', 
          result.error || 'Une erreur est survenue lors de la création du compte',
          [{ text: 'OK', style: 'default' }]
        );
      }
      
    } catch (error) {
      Alert.alert(
        'Erreur', 
        'Une erreur inattendue est survenue',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleQuickDemo = () => {
    Alert.alert(
      'Remplissage automatique',
      'Voulez-vous remplir le formulaire avec des données de démonstration ?',
      [
        {
          text: 'Annuler',
          style: 'cancel'
        },
        {
          text: 'Remplir automatiquement',
          onPress: () => {
            setFormData({
              firstName: 'Jean',
              lastName: 'Dupont', // ← Maintenant obligatoire
              email: 'jean.dupont@email.com',
              password: 'demo1234',
              confirmPassword: 'demo1234',
              community: 'Dakar',
              phone: '+221 77 123 45 67'
            });
          }
        }
      ]
    );
  };

  const handleQuickTest = () => {
    // Remplir rapidement pour les tests
    setFormData({
      firstName: 'Test',
      lastName: 'User', // ← Maintenant obligatoire
      email: 'test@remine.com',
      password: 'test1234',
      confirmPassword: 'test1234',
      community: 'Test Community',
      phone: '+221 70 000 00 00'
    });
    Alert.alert('Données de test chargées', 'Modifiez si nécessaire puis cliquez sur "Créer mon compte"');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Inscription</Text>
          <Text style={styles.subtitle}>Rejoignez la communauté ReMine</Text>
        </View>
        
        <View style={styles.form}>
          {/* Prénom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom *</Text>
            <TextInput
              style={[
                styles.input, 
                errors.firstName && styles.inputError,
                formData.firstName && !errors.firstName && styles.inputValid
              ]}
              placeholder="Votre prénom"
              value={formData.firstName}
              onChangeText={(text) => handleChange('firstName', text)}
              autoComplete="name-given"
              editable={!isLoading}
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
          </View>
          
          {/* Nom */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom *</Text>
            <TextInput
              style={[
                styles.input, 
                errors.lastName && styles.inputError,
                formData.lastName && !errors.lastName && styles.inputValid
              ]}
              placeholder="Votre nom de famille"
              value={formData.lastName}
              onChangeText={(text) => handleChange('lastName', text)}
              autoComplete="name-family"
              editable={!isLoading}
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
          </View>
          
          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[
                styles.input, 
                errors.email && styles.inputError,
                formData.email && !errors.email && styles.inputValid
              ]}
              placeholder="votre@email.com"
              value={formData.email}
              onChangeText={(text) => handleChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>
          
          {/* Téléphone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Téléphone (optionnel)</Text>
            <TextInput
              style={[
                styles.input, 
                errors.phone && styles.inputError,
                formData.phone && !errors.phone && styles.inputValid
              ]}
              placeholder="+221 XX XXX XX XX"
              value={formData.phone}
              onChangeText={(text) => handleChange('phone', text)}
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!isLoading}
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            <Text style={styles.helperText}>
              📞 Facultatif - pour les notifications importantes
            </Text>
          </View>
          
          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mot de passe *</Text>
            <View style={styles.pwdInputWrap}>
              <TextInput
                style={[
                  styles.input, 
                  styles.pwdInput,
                  errors.password && styles.inputError,
                  formData.password && !errors.password && styles.inputValid
                ]}
                placeholder="Au moins 8 caractères"
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete="password-new"
                editable={!isLoading}
              />
              <TouchableOpacity style={styles.pwdToggle} onPress={() => setShowPwd(s => !s)} hitSlop={10}>
                <Text style={{ fontSize: 17 }}>{showPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            {formData.password.length > 0 && (
              <View style={styles.pwdRules}>
                <View style={styles.pwdRuleRow}>
                  <Text style={[styles.pwdRuleIcon, formData.password.length >= 8 && { color: colors.primary }]}>
                    {formData.password.length >= 8 ? '✅' : '⭕'}
                  </Text>
                  <Text style={[styles.pwdRuleText, { color: formData.password.length >= 8 ? colors.primary : colors.textSecondary }]}>
                    Au moins 8 caractères
                  </Text>
                </View>
              </View>
            )}
          </View>
          
          {/* Confirmation mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmer le mot de passe *</Text>
            <View style={styles.pwdInputWrap}>
              <TextInput
                style={[
                  styles.input, 
                  styles.pwdInput,
                  errors.confirmPassword && styles.inputError,
                  formData.confirmPassword && !errors.confirmPassword && styles.inputValid
                ]}
                placeholder="Retapez votre mot de passe"
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPwd}
                autoCapitalize="none"
                autoComplete="password-new"
                editable={!isLoading}
              />
              <TouchableOpacity style={styles.pwdToggle} onPress={() => setShowConfirmPwd(s => !s)} hitSlop={10}>
                <Text style={{ fontSize: 17 }}>{showConfirmPwd ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            {formData.confirmPassword.length > 0 && (
              <View style={styles.pwdRuleRow}>
                <Text style={[styles.pwdRuleIcon, formData.password === formData.confirmPassword && { color: colors.primary }]}>
                  {formData.password === formData.confirmPassword ? '✅' : '⭕'}
                </Text>
                <Text style={[styles.pwdRuleText, { color: formData.password === formData.confirmPassword ? colors.primary : colors.textSecondary }]}>
                  Les mots de passe correspondent
                </Text>
              </View>
            )}
          </View>
          
          {/* Communauté */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Communauté (optionnel)</Text>
            <TextInput
              style={[
                styles.input, 
                formData.community && styles.inputValid
              ]}
              placeholder="Ex: Dakar, Thiès, Saint-Louis..."
              value={formData.community}
              onChangeText={(text) => handleChange('community', text)}
              editable={!isLoading}
            />
            <Text style={styles.helperText}>
              🌍 Indiquez votre ville ou région pour connecter avec votre communauté locale
            </Text>
          </View>
          
          {/* Bouton d'inscription */}
          <TouchableOpacity 
            style={[
              styles.button, 
              (!isFormValid || isLoading) && styles.buttonDisabled
            ]}
            onPress={handleRegister}
            disabled={!isFormValid || isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? '📝 Création du compte...' : '🚀 Créer mon compte'}
            </Text>
          </TouchableOpacity>

          {/* Bouton démo (développement seulement) */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.demoButton}
              onPress={handleQuickDemo}
              disabled={isLoading}
            >
              <Text style={styles.demoText}>🎮 Remplir automatiquement (démo)</Text>
            </TouchableOpacity>
          )}

          {/* Bouton test rapide (développement seulement) */}
          {__DEV__ && (
            <TouchableOpacity 
              style={styles.testButton}
              onPress={handleQuickTest}
              disabled={isLoading}
            >
              <Text style={styles.testText}>⚡ Données de test rapides</Text>
            </TouchableOpacity>
          )}

          <View style={styles.separator}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>Déjà un compte ?</Text>
            <View style={styles.separatorLine} />
          </View>

          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Login')}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>🔐 Se connecter</Text>
          </TouchableOpacity>

          <View style={styles.terms}>
            <Text style={styles.termsText}>
              🔒 En créant un compte, vous acceptez nos conditions d'utilisation. 
              Vos données sont sécurisées et utilisées uniquement pour améliorer 
              la transparence minière dans votre communauté.
            </Text>
          </View>

          {/* Indicateur de connexion */}
          <View style={styles.connectionStatus}>
            <Text style={styles.connectionStatusText}>
              {isLoading ? '🔄 Connexion au serveur...' : '✅ Prêt à créer le compte'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}