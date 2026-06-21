// src/screens/NotificationHistoryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmptyState from '../components/EmptyState';
import { useTheme } from '../context/ThemeContext';

const createStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    backgroundColor: colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.surfaceAlt 
  },
  title:  { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  unreadCount: { fontSize: 12, color: colors.primary, fontWeight: '600', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  headerBtn: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    backgroundColor: colors.background 
  },
  headerBtnDanger: { backgroundColor: colors.dangerLight },
  headerBtnText: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  filters: { 
    flexDirection: 'row', 
    gap: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 10, 
    backgroundColor: colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.surfaceAlt 
  },
  filterBtn: { 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 16, 
    backgroundColor: colors.background 
  },
  filterBtnActive: { 
    backgroundColor: colors.primaryLight, 
    borderWidth: 1, 
    borderColor: colors.primary 
  },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.primary },
  item: { 
    flexDirection: 'row', 
    alignItems: 'flex-start', 
    padding: 14, 
    backgroundColor: colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.background, 
    gap: 12 
  },
  itemUnread: { backgroundColor: colors.primaryLight },
  itemIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center', 
    flexShrink: 0 
  },
  itemIconText: { fontSize: 20 },
  itemBody: { flex: 1 },
  itemHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 3 
  },
  itemTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: colors.textPrimary, 
    flex: 1, 
    marginRight: 8 
  },
  itemTitleUnread: { color: colors.textPrimary, fontWeight: '700' },
  itemDate: { fontSize: 11, color: colors.textMuted, flexShrink: 0 },
  itemBody2: { 
    fontSize: 13, 
    color: colors.textSecondary, 
    lineHeight: 18, 
    marginBottom: 6 
  },
  itemTag: { 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8 
  },
  itemTagText: { fontSize: 10, fontWeight: '700' },
  unreadDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: colors.primary, 
    marginTop: 6, 
    flexShrink: 0 
  },
  empty: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 40 
  },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});


const HISTORY_KEY = 'remine_notification_history';
const MAX_HISTORY = 50;

const getNotifConfig = (colors) => ({
  status_update:   { icon: '🔄', color: colors.purple, bg: '#ede9fe', label: 'Statut mis à jour'     },
  note_added:      { icon: '💬', color: colors.blue, bg: '#dbeafe', label: 'Message agent'          },
  report_assigned: { icon: '👤', color: colors.orange, bg: '#fef3c7', label: 'Pris en charge'         },
  report_verified: { icon: '✅', color: colors.primary, bg: '#dcfce7', label: 'Signalement vérifié'    },
  report_resolved: { icon: '🎉', color: colors.primary, bg: '#dcfce7', label: 'Problème résolu'        },
  emergency:       { icon: '🚨', color: colors.dangerDark, bg: '#fee2e2', label: 'Alerte urgente'         },
  new_message:     { icon: '💬', color: colors.blue, bg: '#dbeafe', label: 'Nouveau message'        },
  report_created:  { icon: '📤', color: colors.textSecondary, bg: '#f3f4f6', label: 'Signalement envoyé'    },
  welcome:         { icon: '👋', color: colors.primary, bg: '#dcfce7', label: 'Bienvenue'              },
  achievement:     { icon: '🏆', color: colors.orange, bg: '#fef3c7', label: 'Récompense'             },
  community:       { icon: '👥', color: colors.purple, bg: '#ede9fe', label: 'Activité communautaire' },
  general:         { icon: '🔔', color: colors.textSecondary, bg: '#f3f4f6', label: 'Notification'           },
});

const formatDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)        return 'À l\'instant';
  if (diff < 3600)      return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400)     return `Il y a ${Math.floor(diff / 3600)} h`;
  if (diff < 604800)    return `Il y a ${Math.floor(diff / 86400)} j`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

export default function NotificationHistoryScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const NOTIF_CONFIG = getNotifConfig(colors);
  const [history, setHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadHistory = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const data = raw ? JSON.parse(raw) : [];
      // Filtrer les entrées invalides
      const validData = data.filter(item => item && item.id);
      setHistory(validData);
    } catch { 
      setHistory([]); 
    }
    setRefreshing(false);
  }, []);

  useEffect(() => { 
    loadHistory(); 
    
    // Vérifier s'il y a une notification en attente au montage
    if (global.__pendingNotification) {
      const { reportId, type } = global.__pendingNotification;
      if (reportId && reportId !== 'undefined') {
        setTimeout(() => {
          navigation.navigate('Signalement', { id: reportId, reportId: reportId });
          global.__pendingNotification = null;
        }, 1000);
      }
    }
  }, [loadHistory, navigation]);

  const markAllRead = async () => {
    const updated = history.map(n => ({ ...n, read: true }));
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const clearAll = () => {
    Alert.alert('Effacer l\'historique', 'Supprimer toutes les notifications ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Effacer', style: 'destructive', onPress: async () => {
        setHistory([]);
        await AsyncStorage.removeItem(HISTORY_KEY);
      }},
    ]);
  };

  const markRead = async (id) => {
    const updated = history.map(n => n.id === id ? { ...n, read: true } : n);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleTap = (notif) => {
    console.log('🔍 Notification tapée:', { 
      id: notif.id, 
      type: notif.data?.type, 
      reportId: notif.data?.reportId 
    });
    
    markRead(notif.id);
    
    const reportId = notif.data?.reportId;
    
    // ✅ Validation stricte du reportId
    if (!reportId || reportId === 'undefined' || reportId === null) {
      console.error('❌ ID de signalement invalide:', reportId);
      Alert.alert(
        'Notification invalide',
        'Impossible d\'ouvrir ce signalement car l\'identifiant est manquant ou invalide.'
      );
      return;
    }
    
    // ✅ Navigation avec plusieurs clés possibles
    navigation.navigate('Signalement', { 
      id: reportId,
      reportId: reportId,
      signalementId: reportId
    });
  };

  const filtered = filter === 'all' ? history
    : filter === 'unread' ? history.filter(n => !n.read)
    : history.filter(n => n.data?.type === filter);

  const unreadCount = history.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadCount}>
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <TouchableOpacity style={styles.headerBtn} onPress={markAllRead}>
              <Text style={styles.headerBtnText}>Tout lire</Text>
            </TouchableOpacity>
          )}
          {history.length > 0 && (
            <TouchableOpacity style={[styles.headerBtn, styles.headerBtnDanger]} onPress={clearAll}>
              <Text style={[styles.headerBtnText, { color: colors.dangerDark }]}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtres */}
      <View style={[styles.filters, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {[
          { key: 'all', label: 'Toutes' },
          { key: 'unread', label: 'Non lues' },
          { key: 'status_update', label: 'Statuts' },
          { key: 'report_created', label: 'Signalements' },
        ].map(f => (
          <TouchableOpacity 
            key={f.key} 
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]} 
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => { setRefreshing(true); loadHistory(); }} 
            tintColor="#16a34a" 
          />
        }
        renderItem={({ item }) => {
          const cfg = NOTIF_CONFIG[item.data?.type] || NOTIF_CONFIG.general;
          return (
            <TouchableOpacity 
              style={[styles.item, !item.read && styles.itemUnread]} 
              onPress={() => handleTap(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.itemIcon, { backgroundColor: cfg.bg }]}>
                <Text style={styles.itemIconText}>{cfg.icon}</Text>
              </View>
              <View style={styles.itemBody}>
                <View style={styles.itemHeader}>
                  <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                </View>
                <Text style={styles.itemBody2} numberOfLines={2}>
                  {item.body}
                </Text>
                <View style={[styles.itemTag, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.itemTagText, { color: cfg.color }]}>
                    {cfg.label}
                  </Text>
                </View>
              </View>
              {!item.read && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            preset="noNotifications"
            subtitle={
              filter === 'unread'
                ? 'Toutes vos notifications ont été lues.'
                : 'Les notifications apparaîtront ici lorsque vous recevrez des mises à jour.'
            }
          />
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
    </SafeAreaView>
  );
}