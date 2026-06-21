import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  RefreshControl 
} from 'react-native';
import { logger } from '../utils/logger';
import { useTheme } from '../context/ThemeContext';

export default function AdminScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const scrollViewRef = useRef();

  useEffect(() => {
    loadInitialData();

    // S'abonner aux nouveaux logs
    const unsubscribe = logger.onLog((newLog) => {
      if (autoRefresh) {
        setLogs(prev => [newLog, ...prev.slice(0, 99)]);
        setStats(logger.getStats());
      }
    });

    return unsubscribe;
  }, [autoRefresh]);

  const loadInitialData = () => {
    setLogs(logger.getLogs(100));
    setStats(logger.getStats());
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInitialData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'ALL' || log.level === filter;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return '#e74c3c';
      case 'WARN': return '#f39c12';
      case 'INFO': return '#3498db';
      case 'DEBUG': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'ERROR': return '🔴';
      case 'WARN': return '🟡';
      case 'INFO': return '🔵';
      case 'DEBUG': return '🟢';
      default: return '⚪';
    }
  };

  const clearLogs = () => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment effacer tous les logs ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Effacer', 
          style: 'destructive',
          onPress: () => {
            logger.clearLogs();
            setLogs([]);
            setStats(logger.getStats());
          }
        }
      ]
    );
  };

  const exportLogs = () => {
    const logText = logger.exportLogs();
    Alert.alert(
      'Logs exportés',
      `${logs.length} logs prêts pour l'export\n\nCopiez le texte depuis la console développeur.`,
      [{ text: 'OK' }]
    );
    console.log('=== LOGS EXPORT ===\n', logText, '\n=== FIN LOGS ===');
  };

  const testLogs = () => {
    logger.info('Test log info');
    logger.warn('Test log warning');
    logger.error('Test log error');
    logger.debug('Test log debug');
    logger.trackAction('TEST_ACTION', { test: true });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Monitoring Temps Réel</Text>
      <Text style={styles.subtitle}>Surveillance de l'application ReMine</Text>
      
      {/* Contrôles */}
      <View style={styles.controls}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Rechercher dans les logs..."
          placeholderTextColor="#999"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        
        <View style={styles.filterButtons}>
          {['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map(level => (
            <TouchableOpacity
              key={level}
              style={[
                styles.filterButton,
                filter === level && styles.filterButtonActive
              ]}
              onPress={() => setFilter(level)}
            >
              <Text style={[
                styles.filterButtonText,
                filter === level && styles.filterButtonTextActive
              ]}>
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.actionButton, autoRefresh && styles.actionButtonActive]}
            onPress={() => setAutoRefresh(!autoRefresh)}
          >
            <Text style={styles.actionButtonText}>
              {autoRefresh ? '🔄 Auto' : '⏸️ Pause'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={testLogs}>
            <Text style={styles.actionButtonText}>🧪 Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={clearLogs}>
            <Text style={styles.actionButtonText}>🗑️ Vider</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={exportLogs}>
            <Text style={styles.actionButtonText}>📤 Exporter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistiques */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{stats.total || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.danger }]}>
            {stats.errors || 0}
          </Text>
          <Text style={styles.statLabel}>Erreurs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.orange }]}>
            {stats.warnings || 0}
          </Text>
          <Text style={styles.statLabel}>Avertissements</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, { color: colors.blue }]}>
            {stats.infos || 0}
          </Text>
          <Text style={styles.statLabel}>Infos</Text>
        </View>
      </View>

      {/* Logs en temps réel */}
      <ScrollView 
        style={styles.logsContainer}
        ref={scrollViewRef}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onContentSizeChange={() => {
          if (autoRefresh && filteredLogs.length > 0) {
            setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: true }), 100);
          }
        }}
      >
        {filteredLogs.length === 0 ? (
          <View style={styles.noLogs}>
            <Text style={styles.noLogsText}>Aucun log à afficher</Text>
            <Text style={styles.noLogsSubtext}>
              {searchTerm ? 'Aucun résultat pour votre recherche' : 'Les logs apparaîtront ici'}
            </Text>
          </View>
        ) : (
          filteredLogs.map((log) => (
            <View key={log.id} style={styles.logEntry}>
              <View style={styles.logHeader}>
                <Text style={[styles.logLevel, { color: getLevelColor(log.level) }]}>
                  {getLevelIcon(log.level)} {log.level}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </Text>
              </View>
              <Text style={styles.logMessage}>{log.message}</Text>
              {log.data && (
                <Text style={styles.logData}>
                  {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                </Text>
              )}
              {log.screen && log.screen !== 'Unknown' && (
                <Text style={styles.logScreen}>📱 {log.screen}</Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  controls: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  searchInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.textInverse,
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 14,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: colors.surfaceAlt,
    marginRight: 8,
    marginBottom: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.blue,
  },
  filterButtonText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: colors.textInverse,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: colors.primary,
  },
  actionButtonText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textInverse,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 10,
  },
  noLogs: {
    alignItems: 'center',
    padding: 40,
  },
  noLogsText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 8,
  },
  noLogsSubtext: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  logEntry: {
    backgroundColor: colors.surfaceAlt,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  logTime: {
    fontSize: 10,
    color: colors.textMuted,
  },
  logMessage: {
    color: colors.textInverse,
    fontSize: 14,
    marginBottom: 5,
  },
  logData: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  logScreen: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 5,
    fontStyle: 'italic',
  },
});