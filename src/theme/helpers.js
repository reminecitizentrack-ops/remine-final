// src/theme/helpers.js
// ─────────────────────────────────────────────────────────────────────────────
// Fonctions utilitaires du système de design ReMine.
// Remplace les getStatusColor / getStatusConfig dupliqués dans 6+ fichiers.
//
// UTILISATION :
//   import { getStatusStyle, getStatusLabel, getSeverityStyle } from '../theme/helpers';
//   const { bg, text, border } = getStatusStyle('resolved', colors);
// ─────────────────────────────────────────────────────────────────────────────

// ── Styles de statut ──────────────────────────────────────────────────────────
// Retourne { bg, text, border, icon, label } pour un statut donné
export const getStatusStyle = (status, colors) => {
  const key = status?.toLowerCase() ?? '';

  if (['pending','new','nouveau','en_attente'].includes(key)) {
    return { bg: colors.statusNewBg, text: colors.statusNewText, border: colors.statusNewBorder, icon: '🆕', label: 'Nouveau' };
  }
  if (['verified','confirmed','vérifié'].includes(key)) {
    return { bg: colors.statusVerifiedBg, text: colors.statusVerifiedText, border: colors.statusVerifiedBorder, icon: '✅', label: 'Vérifié' };
  }
  if (['in_progress','processing','en_cours'].includes(key)) {
    return { bg: colors.statusInProgressBg, text: colors.statusInProgressText, border: colors.statusInProgressBorder, icon: '🔄', label: 'En cours' };
  }
  if (['resolved','closed','done','résolu'].includes(key)) {
    return { bg: colors.statusResolvedBg, text: colors.statusResolvedText, border: colors.statusResolvedBorder, icon: '✓', label: 'Résolu' };
  }
  if (['rejected','invalid','rejeté'].includes(key)) {
    return { bg: colors.statusRejectedBg, text: colors.statusRejectedText, border: colors.statusRejectedBorder, icon: '✕', label: 'Rejeté' };
  }
  if (['urgent','critical','critique'].includes(key)) {
    return { bg: colors.statusUrgentBg, text: colors.statusUrgentText, border: colors.statusUrgentBorder, icon: '🚨', label: 'Urgent' };
  }

  const _map = null;

  return {
    bg:     colors.surfaceAlt,
    text:   colors.textSecondary,
    border: colors.border,
    icon:   '•',
    label:  status ?? 'Inconnu',
  };
};

// Alias simple pour les cas où on veut juste la couleur du texte
export const getStatusColor = (status, colors) =>
  getStatusStyle(status, colors).text;

// ── Labels de statut ──────────────────────────────────────────────────────────
export const getStatusLabel = (status) => {
  const labels = {
    pending:      'Nouveau',
    new:          'Nouveau',
    nouveau:      'Nouveau',
    en_attente:   'En attente',
    verified:     'Vérifié',
    confirmed:    'Vérifié',
    in_progress:  'En cours',
    processing:   'En cours',
    en_cours:     'En cours',
    resolved:     'Résolu',
    closed:       'Clôturé',
    done:         'Terminé',
    rejected:     'Rejeté',
    invalid:      'Invalide',
    urgent:       'Urgent',
    critical:     'Critique',
  };
  return labels[status?.toLowerCase()] ?? (status ?? 'Inconnu');
};

// ── Styles de sévérité ────────────────────────────────────────────────────────
export const getSeverityStyle = (severity, colors) => {
  const map = {
    low:      { color: colors.primary,   label: 'Faible',   icon: '🟢' },
    medium:   { color: colors.warning,   label: 'Moyenne',  icon: '🟡' },
    high:     { color: colors.orange,    label: 'Élevée',   icon: '🟠' },
    critical: { color: colors.danger,    label: 'Critique', icon: '🔴' },
  };
  return map[severity?.toLowerCase()] ?? { color: colors.textMuted, label: severity ?? '—', icon: '⚪' };
};

export const getSeverityColor = (severity, colors) =>
  getSeverityStyle(severity, colors).color;

// ── Icônes de type de signalement ─────────────────────────────────────────────
export const getTypeIcon = (type) => {
  const icons = {
    water_pollution:    '💧',
    dust:               '💨',
    air_pollution:      '🌫️',
    waste_deposit:      '🗑️',
    abandoned_site:     '🏚️',
    soil_contamination: '⚠️',
    noise_pollution:    '🔊',
    other:              '📍',
  };
  return icons[type?.toLowerCase()] ?? '📍';
};

// ── Libellés de type de signalement ───────────────────────────────────────────
export const getTypeLabel = (type) => {
  const labels = {
    water_pollution:    'Pollution de l\'eau',
    dust:               'Poussière',
    air_pollution:      'Pollution de l\'air',
    waste_deposit:      'Dépôt de déchets',
    abandoned_site:     'Site abandonné',
    soil_contamination: 'Contamination sol',
    noise_pollution:    'Nuisances sonores',
    other:              'Autre',
  };
  return labels[type?.toLowerCase()] ?? (type ?? 'Non défini');
};

// ── Format de date ─────────────────────────────────────────────────────────────
export const formatDate = (date, options = {}) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('fr-FR', {
      day:   '2-digit',
      month: 'short',
      year:  'numeric',
      ...options,
    });
  } catch {
    return '—';
  }
};

export const formatRelativeDate = (date) => {
  if (!date) return '—';
  try {
    const diff = Date.now() - new Date(date).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days  = Math.floor(diff / 86400000);

    if (mins  < 1)   return 'À l\'instant';
    if (mins  < 60)  return `Il y a ${mins} min`;
    if (hours < 24)  return `Il y a ${hours}h`;
    if (days  < 7)   return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return formatDate(date);
  } catch {
    return '—';
  }
};

// ── Style de carte signalement ─────────────────────────────────────────────────
// Génère un objet de style complet pour une carte signalement
export const getCardStyle = (colors, elevated = false) => ({
  backgroundColor: colors.surface,
  borderRadius:    16,
  borderWidth:     1,
  borderColor:     colors.border,
  ...(elevated ? {
    shadowColor:    colors.shadow,
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  colors.shadowOpacity,
    shadowRadius:   8,
    elevation:      4,
  } : {}),
});