// src/theme/index.js
// ─────────────────────────────────────────────────────────────────────────────
// Système de design centralisé ReMine Citizen Track
// Couleurs, typographie, spacing, radius, statuts — tout ici.
//
// UTILISATION :
//   import { useTheme } from '../context/ThemeContext';
//   import { fontSize, spacing, radius } from '../theme';
//   const { colors } = useTheme();
// ─────────────────────────────────────────────────────────────────────────────

// ── Typographie ──────────────────────────────────────────────────────────────
export const fontSize = {
  xs:   11,   // labels discrets, timestamps
  sm:   13,   // texte secondaire, labels de champ
  md:   15,   // corps de texte principal
  lg:   17,   // titre de section
  xl:   22,   // titre d'écran
  xxl:  28,   // hero / statistique principale
};

export const fontWeight = {
  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  heavy:    '800',
};

// ── Spacing ───────────────────────────────────────────────────────────────────
export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
};

// ── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  sm:   8,    // badges, chips, tags
  md:   12,   // boutons, inputs, petites cartes
  lg:   16,   // cartes principales
  xl:   24,   // modals, bottom sheets
  full: 999,  // pilules, avatars
};

// ── Ombres ────────────────────────────────────────────────────────────────────
export const shadow = {
  sm: {
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius:  4,
    elevation:     2,
  },
  md: {
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     4,
  },
  lg: {
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius:  16,
    elevation:     8,
  },
};

// ── Couleurs mode clair ───────────────────────────────────────────────────────
export const lightColors = {
  // Fonds
  background:       '#f3f4f6',
  backgroundAlt:    '#f9fafb',
  surface:          '#ffffff',
  surfaceAlt:       '#f0f0f0',
  border:           '#e5e7eb',
  borderLight:      '#f0f0f0',

  // Textes
  textPrimary:      '#111827',
  textSecondary:    '#6b7280',
  textMuted:        '#9ca3af',
  textDisabled:     '#d1d5db',
  textInverse:      '#ffffff',

  // Marque principale (vert)
  primary:          '#16a34a',
  primaryLight:     '#dcfce7',
  primaryMid:       '#86efac',
  primaryDark:      '#15803d',

  // Bleu
  blue:             '#2563eb',
  blueLight:        '#eff6ff',
  blueMid:          '#bfdbfe',

  // Orange / Warning
  orange:           '#d97706',
  orangeLight:      '#fef3c7',
  warning:          '#f59e0b',

  // Rouge / Danger
  danger:           '#ef4444',
  dangerDark:       '#dc2626',
  dangerLight:      '#fee2e2',

  // Violet
  purple:           '#7c3aed',
  purpleLight:      '#f5f3ff',

  // Cyan
  cyan:             '#06b6d4',
  cyanLight:        '#ecfeff',

  // Overlay & ombres
  overlay:          'rgba(0,0,0,0.5)',
  shadow:           '#000000',
  shadowOpacity:    0.06,

  // Tab bar
  tabBar:           '#ffffff',
  tabBorder:        '#f0f0f0',
  tabActive:        '#16a34a',
  tabInactive:      '#9ca3af',

  // Header
  headerGreen:      '#16a34a',
  headerBlue:       '#2563eb',
  headerOrange:     '#d97706',
  headerDark:       '#1f2937',
  headerRed:        '#dc2626',
  headerPurple:     '#7c3aed',

  // ── Statuts (tokens sémantiques centralisés) ─────────────────────────────
  // Nouveau / en attente
  statusNewBg:      '#fef3c7',
  statusNewText:    '#92400e',
  statusNewBorder:  '#f59e0b',

  // Vérifié
  statusVerifiedBg:     '#eff6ff',
  statusVerifiedText:   '#1d4ed8',
  statusVerifiedBorder: '#bfdbfe',

  // En cours
  statusInProgressBg:     '#f5f3ff',
  statusInProgressText:   '#6d28d9',
  statusInProgressBorder: '#ddd6fe',

  // Résolu
  statusResolvedBg:     '#dcfce7',
  statusResolvedText:   '#15803d',
  statusResolvedBorder: '#86efac',

  // Rejeté
  statusRejectedBg:     '#fee2e2',
  statusRejectedText:   '#dc2626',
  statusRejectedBorder: '#fca5a5',

  // Urgent / critique
  statusUrgentBg:     '#fff7ed',
  statusUrgentText:   '#c2410c',
  statusUrgentBorder: '#fed7aa',
};

// ── Couleurs mode sombre ──────────────────────────────────────────────────────
export const darkColors = {
  // Fonds
  background:       '#0f172a',
  backgroundAlt:    '#1e293b',
  surface:          '#1e293b',
  surfaceAlt:       '#334155',
  border:           '#334155',
  borderLight:      '#1e293b',

  // Textes
  textPrimary:      '#f1f5f9',
  textSecondary:    '#94a3b8',
  textMuted:        '#64748b',
  textDisabled:     '#475569',
  textInverse:      '#0f172a',

  // Marque principale (vert — identique, couleur de marque)
  primary:          '#22c55e',   // légèrement plus lumineux en dark pour le contraste
  primaryLight:     '#064e3b',   // ✅ CORRECTION : était #14532d (trop sombre/illisible)
  primaryMid:       '#059669',   // ✅ CORRECTION : était #166534
  primaryDark:      '#16a34a',

  // Bleu
  blue:             '#60a5fa',
  blueLight:        '#1e3a5f',
  blueMid:          '#2563eb',

  // Orange / Warning
  orange:           '#fb923c',
  orangeLight:      '#431407',
  warning:          '#fbbf24',

  // Rouge / Danger
  danger:           '#f87171',
  dangerDark:       '#ef4444',
  dangerLight:      '#450a0a',

  // Violet
  purple:           '#a78bfa',
  purpleLight:      '#2e1065',

  // Cyan
  cyan:             '#22d3ee',
  cyanLight:        '#083344',

  // Overlay & ombres
  overlay:          'rgba(0,0,0,0.75)',
  shadow:           '#000000',
  shadowOpacity:    0.3,

  // Tab bar
  tabBar:           '#1e293b',
  tabBorder:        '#334155',
  tabActive:        '#22c55e',
  tabInactive:      '#64748b',

  // Header
  headerGreen:      '#15803d',
  headerBlue:       '#1d4ed8',
  headerOrange:     '#b45309',
  headerDark:       '#0f172a',
  headerRed:        '#b91c1c',
  headerPurple:     '#6d28d9',

  // ── Statuts en dark mode ─────────────────────────────────────────────────
  statusNewBg:      '#451a03',
  statusNewText:    '#fbbf24',
  statusNewBorder:  '#92400e',

  statusVerifiedBg:     '#1e3a5f',
  statusVerifiedText:   '#93c5fd',
  statusVerifiedBorder: '#1d4ed8',

  statusInProgressBg:     '#2e1065',
  statusInProgressText:   '#c4b5fd',
  statusInProgressBorder: '#7c3aed',

  statusResolvedBg:     '#064e3b',
  statusResolvedText:   '#6ee7b7',
  statusResolvedBorder: '#059669',

  statusRejectedBg:     '#450a0a',
  statusRejectedText:   '#fca5a5',
  statusRejectedBorder: '#dc2626',

  statusUrgentBg:     '#431407',
  statusUrgentText:   '#fdba74',
  statusUrgentBorder: '#c2410c',
};