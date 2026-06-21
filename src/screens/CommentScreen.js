// src/screens/CommentScreen.js — Commentaires & Messagerie
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const getStatusConfig = (colors) => ({
  new:         { label: 'Nouveau',  color: colors.orange, bg: '#fef3c7' },
  verified:    { label: 'Vérifié', color: colors.blue, bg: '#dbeafe' },
  in_progress: { label: 'En cours', color: colors.purple, bg: '#ede9fe' },
  resolved:    { label: 'Résolu',   color: colors.primary, bg: '#dcfce7' },
  rejected:    { label: 'Rejeté',   color: colors.dangerDark, bg: '#fee2e2' },
});

const MessageBubble = ({ comment, isOwn, isAdmin }) => {
  const time = new Date(comment.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const date = new Date(comment.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const authorName = comment.author?.firstName
    ? `${comment.author.firstName} ${comment.author.lastName || ''}`.trim()
    : 'Anonyme';
  const isAdminMsg = comment.type === 'admin_message' || ['admin','moderator'].includes(comment.author?.role);

  return (
    <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
      {!isOwn && (
        <View style={[styles.avatar, isAdminMsg && styles.avatarAdmin]}>
          <Text style={styles.avatarText}>
            {isAdminMsg ? '⚡' : (comment.author?.firstName?.[0] || '?')}
          </Text>
        </View>
      )}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : (isAdminMsg ? styles.bubbleAdmin : styles.bubbleOther)]}>
        {!isOwn && (
          <Text style={[styles.bubbleAuthor, isAdminMsg && styles.bubbleAuthorAdmin]}>
            {isAdminMsg ? '⚡ ' + authorName + ' (Agent)' : authorName}
          </Text>
        )}
        <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>{comment.content}</Text>
        <Text style={[styles.bubbleTime, isOwn && styles.bubbleTimeOwn]}>{time} · {date}</Text>
      </View>
    </View>
  );
};

export default function CommentScreen({ route, navigation }) {
  const { colors } = useTheme();
  const STATUS_CONFIG = getStatusConfig(colors);
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { reportId, reportType, reportStatus } = route.params || {};
  const isLocalReport = String(reportId || '').startsWith('local_');
  const { user } = useAuth();
  const [comments,    setComments]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [sending,     setSending]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [text,        setText]        = useState('');
  const flatRef = useRef();

  const isAdmin = ['admin', 'moderator'].includes(user?.role);
  const statusCfg = getStatusConfig(colors)[reportStatus] || getStatusConfig(colors).new;

  const loadComments = useCallback(async () => {
    if (isLocalReport) { setLoading(false); return; }
    try {
      const res = await api.get(`/reports/${reportId}/comments`);
      if (res.data?.success) {
        setComments(res.data.data.comments || []);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } catch (e) {
      console.log('Erreur chargement commentaires:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reportId]);

  useEffect(() => { loadComments(); }, [loadComments]);

  const handleSend = async () => {
    if (isLocalReport) {
      Alert.alert('Signalement local', 'Ce signalement n\'a pas encore été synchronisé avec le serveur. Les commentaires seront disponibles une fois la synchronisation effectuée.');
      return;
    }
    const content = text.trim();
    if (!content) return;
    setSending(true);
    setText('');
    try {
      const res = await api.post(`/reports/${reportId}/comments`, {
        content,
        type: isAdmin ? 'admin_message' : 'public',
      });
      if (res.data?.success) {
        setComments(prev => [...prev, res.data.data.comment]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
      }
    } catch (e) {
      setText(content);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = (commentId) => {
    Alert.alert('Supprimer', 'Supprimer ce commentaire ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/reports/${reportId}/comments/${commentId}`);
          setComments(prev => prev.filter(c => c._id !== commentId));
        } catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Bandeau statut */}
      <View style={[styles.statusBar, { backgroundColor: statusCfg.bg }]}>
        <Text style={styles.statusType}>{(reportType || '').replace(/_/g, ' ')}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color }]}>
          <Text style={styles.statusLabel}>{statusCfg.label}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color="#16a34a" />
          <Text style={styles.loaderText}>Chargement…</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={comments}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onLongPress={() => {
                const isOwn = String(item.author?._id || item.author) === String(user?._id || user?.id);
                if (isOwn || isAdmin) handleDelete(item._id);
              }}
            >
              <MessageBubble
                comment={item}
                isOwn={String(item.author?._id || item.author) === String(user?._id || user?.id)}
                isAdmin={isAdmin}
              />
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadComments(); }} tintColor="#16a34a" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{isLocalReport ? '📡' : '💬'}</Text>
              <Text style={styles.emptyTitle}>{isLocalReport ? 'Signalement hors-ligne' : 'Aucun message'}</Text>
              <Text style={styles.emptyText}>{isLocalReport ? 'Ce signalement a été créé hors-ligne. Les commentaires seront disponibles après synchronisation avec le serveur.' : 'Soyez le premier à commenter ce signalement'}</Text>
            </View>
          }
        />
      )}

      {/* Zone de saisie */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inputRow}>
          {isAdmin && (
            <View style={styles.adminTag}>
              <Text style={styles.adminTagText}>⚡ Agent</Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={isAdmin ? 'Message officiel…' : 'Votre commentaire…'}
            placeholderTextColor="#9ca3af"
            multiline
            maxLength={500}
            returnKeyType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.sendIcon}>↑</Text>
            }
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Appui long sur un message pour le supprimer</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.backgroundAlt },
  statusBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  statusType: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textTransform: 'capitalize', flex: 1 },
  statusBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusLabel:{ color: colors.textInverse, fontSize: 11, fontWeight: '700' },
  loader:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loaderText: { color: colors.textSecondary, fontSize: 14 },
  list:       { padding: 16, paddingBottom: 8, gap: 12, flexGrow: 1 },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 6 },
  emptyText:  { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },

  bubbleRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  bubbleRowOwn:   { flexDirection: 'row-reverse' },
  avatar:         { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarAdmin:    { backgroundColor: colors.orangeLight },
  avatarText:     { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  bubble:         { maxWidth: '75%', borderRadius: 16, padding: 12 },
  bubbleOwn:      { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  bubbleAdmin:    { backgroundColor: colors.orangeLight, borderWidth: 1, borderColor: colors.warning, borderBottomLeftRadius: 4 },
  bubbleOther:    { backgroundColor: colors.textInverse, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
  bubbleAuthor:   { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  bubbleAuthorAdmin: { color: colors.orange },
  bubbleText:     { fontSize: 14, color: colors.textPrimary, lineHeight: 20 },
  bubbleTextOwn:  { color: colors.textInverse },
  bubbleTime:     { fontSize: 10, color: colors.textMuted, marginTop: 4, textAlign: 'right' },
  bubbleTimeOwn:  { color: 'rgba(255,255,255,0.7)' },

  inputRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: colors.textInverse, borderTopWidth: 1, borderTopColor: colors.border },
  adminTag:   { backgroundColor: colors.orangeLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 4 },
  adminTagText:{ fontSize: 10, fontWeight: '700', color: colors.orange },
  input:      { flex: 1, backgroundColor: colors.backgroundAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: colors.textPrimary, maxHeight: 100 },
  sendBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.border },
  sendIcon:   { color: colors.textInverse, fontSize: 20, fontWeight: '800', marginTop: -2 },
  hint:       { fontSize: 10, color: colors.border, textAlign: 'center', paddingBottom: 6, backgroundColor: colors.textInverse },
});