// src/utils/listHelpers.js — VERSION CORRIGÉE

// ✅ CORRECTIF : Math.random() dans generateUniqueKey causait des clés différentes
// à chaque render → les FlatList détruisaient et recréaient tous les items.
// La clé doit être STABLE (même item = même clé) et UNIQUE (deux items différents = clés différentes).
export const generateUniqueKey = (item, index, prefix = 'item') => {
  const id = item?.id || item?._id;
  if (id) return `${prefix}-${id}`;
  // Fallback sans Math.random : utiliser date + index uniquement si pas d'id
  const ts = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
  return `${prefix}-idx${index}-ts${ts}`;
};

// Supprimer les doublons d'un tableau
export const removeDuplicates = (array, idKey = 'id') => {
  if (!Array.isArray(array)) {
    if (__DEV__) console.warn('removeDuplicates: argument invalide', array);
    return [];
  }

  const seen   = new Map();
  const result = [];

  array.forEach((item, index) => {
    if (!item) return;
    const key = item[idKey] || item._id || `index-${index}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      result.push(item);
    } else if (__DEV__) {
      // ✅ CORRECTIF : log de debug uniquement en développement
      console.warn('⚠️ Doublon supprimé:', key);
    }
  });

  if (__DEV__ && result.length !== array.length) {
    console.log(`🧹 Doublons: ${array.length} → ${result.length} items`);
  }

  return result;
};

// ✅ CORRECTIF : createKeyExtractor retourne une fonction stable qui
// privilégie l'id natif de l'item avant de tomber sur generateUniqueKey
export const createKeyExtractor = (prefix = 'item') =>
  (item, index) => {
    const id = item?.id || item?._id;
    if (id) return `${prefix}-${id}`;
    return generateUniqueKey(item, index, prefix);
  };

// KeyExtractors nommés pour chaque liste
export const keyExtractors = {
  top:       createKeyExtractor('top'),
  recent:    createKeyExtractor('recent'),
  dashboard: createKeyExtractor('dashboard'),
  user:      createKeyExtractor('user'),
  report:    createKeyExtractor('report'),
  stat:      createKeyExtractor('stat'),
  home:      createKeyExtractor('home'),
  list:      createKeyExtractor('list'),
};

// Utilitaire de debug uniquement (à ne pas appeler en production)
export const checkDuplicates = (array, idKey = 'id') => {
  if (!__DEV__) return [];
  const duplicates = [];
  const seen = new Set();
  array.forEach(item => {
    const id = item[idKey] || item._id;
    if (seen.has(id)) duplicates.push(id);
    else seen.add(id);
  });
  if (duplicates.length > 0) console.warn('🚨 DOUBLONS:', duplicates);
  return duplicates;
};