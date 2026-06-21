// src/screens/OnboardingScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Écran d'onboarding — affiché uniquement au premier lancement
//
// Utilise AsyncStorage (déjà installé dans le projet) pour mémoriser
// que l'utilisateur a déjà vu l'onboarding.
//
// INTÉGRATION dans App.js :
//   1. Importer OnboardingScreen
//   2. Lire la clé AsyncStorage 'hasSeenOnboarding' au démarrage
//   3. Si false/absent → afficher OnboardingScreen avant Login
//   4. Le callback onDone passe hasSeenOnboarding à true et redirige vers Login
//
//   Exemple d'intégration dans AppNavigator (avant le bloc isAuthenticated) :
//
//   const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
//
//   useEffect(() => {
//     AsyncStorage.getItem('hasSeenOnboarding').then(val => {
//       setHasSeenOnboarding(val === 'true');
//     });
//   }, []);
//
//   if (hasSeenOnboarding === null) return <LoadingScreen />;
//
//   if (!hasSeenOnboarding) {
//     return (
//       <OnboardingScreen
//         onDone={() => {
//           AsyncStorage.setItem('hasSeenOnboarding', 'true');
//           setHasSeenOnboarding(true);
//         }}
//       />
//     );
//   }
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Contenu des slides ───────────────────────────────────────────────────────

const SLIDES = [
  {
    key:        'slide1',
    emoji:      '🌍',
    title:      'Bienvenue sur\nReMine Citizen Track',
    subtitle:   'La plateforme citoyenne pour surveiller et signaler les impacts environnementaux de l\'activité minière au Sénégal.',
    bg:         '#16a34a',
    accent:     '#bbf7d0',
    buttonText: null,
  },
  {
    key:        'slide2',
    emoji:      '📸',
    title:      'Signalez\nen quelques secondes',
    subtitle:   'Prenez une photo, décrivez le problème, localisez-le sur la carte. Votre signalement est transmis immédiatement aux autorités compétentes.',
    bg:         '#2563eb',
    accent:     '#bfdbfe',
    buttonText: null,
  },
  {
    key:        'slide3',
    emoji:      '🗺️',
    title:      'Suivez l\'impact\nsur votre territoire',
    subtitle:   'Visualisez tous les signalements sur une carte interactive, votez pour les plus urgents et suivez leur résolution en temps réel.',
    bg:         '#ea580c',
    accent:     '#fed7aa',
    buttonText: null,
  },
  {
    key:        'slide4',
    emoji:      '🤝',
    title:      'Ensemble,\nprotégeons notre environnement',
    subtitle:   'Rejoignez des milliers de citoyens engagés. Chaque signalement compte. Commencez maintenant.',
    bg:         '#7c3aed',
    accent:     '#ddd6fe',
    buttonText: 'Commencer',
  },
];

// ─── Composant Slide ──────────────────────────────────────────────────────────

function Slide({ item }) {
  return (
    <View style={[styles.slide, { backgroundColor: item.bg, width: SCREEN_W }]}>
      {/* Grande illustration emoji */}
      <View style={[styles.emojiCircle, { backgroundColor: item.accent + '40' }]}>
        <Text style={styles.emojiLarge}>{item.emoji}</Text>
      </View>

      {/* Texte */}
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function OnboardingScreen({ onDone }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX     = useRef(new Animated.Value(0)).current;

  const isLast = currentIndex === SLIDES.length - 1;
  const currentSlide = SLIDES[currentIndex];

  const goToNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    const nextIndex = currentIndex + 1;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    setCurrentIndex(nextIndex);
  };

  const skip = () => onDone();

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: currentSlide.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor={currentSlide.bg} />

      {/* Bouton Passer */}
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={skip} activeOpacity={0.7}>
          <Text style={[styles.skipText, { color: currentSlide.accent }]}>Passer</Text>
        </TouchableOpacity>
      )}

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={({ item }) => <Slide item={item} />}
        keyExtractor={(item) => item.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Footer : dots + bouton */}
      <View style={styles.footer}>
        {/* Indicateurs de pagination */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, index) => {
            const inputRange = [
              (index - 1) * SCREEN_W,
              index * SCREEN_W,
              (index + 1) * SCREEN_W,
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    width:           dotWidth,
                    opacity,
                    backgroundColor: currentSlide.accent,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Bouton Suivant / Commencer */}
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.surface }]}
          onPress={goToNext}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextButtonText, { color: currentSlide.bg }]}>
            {isLast ? '🚀 Commencer' : 'Suivant →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position:  'absolute',
    top:       16,
    right:     20,
    zIndex:    10,
    padding:   10,
  },
  skipText: {
    fontSize:   14,
    fontWeight: '600',
  },

  // Slide
  slide: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    height:         SCREEN_H * 0.75,
  },
  emojiCircle: {
    width:          160,
    height:         160,
    borderRadius:   80,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   36,
  },
  emojiLarge: {
    fontSize: 80,
  },
  slideTitle: {
    fontSize:   28,
    fontWeight: '800',
    color:      '#fff',
    textAlign:  'center',
    marginBottom: 18,
    lineHeight: 36,
  },
  slideSubtitle: {
    fontSize:   16,
    color:      'rgba(255,255,255,0.88)',
    textAlign:  'center',
    lineHeight: 24,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom:     24,
    alignItems:        'center',
    gap:               20,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
  },
  dot: {
    height:       8,
    borderRadius: 4,
  },
  nextButton: {
    width:          '100%',
    paddingVertical: 16,
    borderRadius:   16,
    alignItems:     'center',
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.15,
    shadowRadius:   8,
    elevation:      6,
  },
  nextButtonText: {
    fontSize:   17,
    fontWeight: '800',
  },
});