import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function StatusScreen() {
  // Données de démonstration
  const reports = [
    {
      id: '1',
      type: 'Pollution Eau',
      status: 'en_cours',
      date: '15 Jan 2024',
      location: 'Thiès, Site minier A',
      description: 'Eau rougeâtre dans les puits environnants',
      photos: 2
    },
    {
      id: '2', 
      type: 'Site Abandonné',
      status: 'resolu',
      date: '10 Jan 2024',
      location: 'Diamniadio, Carrière B',
      description: 'Ancienne carrière non sécurisée',
      photos: 1
    },
    {
      id: '3',
      type: 'Poussière',
      status: 'nouveau',
      date: '8 Jan 2024', 
      location: 'Rufisque, Zone industrielle',
      description: 'Poussière excessive affectant les habitations',
      photos: 0
    }
  ];

  const getStatusInfo = (status) => {
    switch(status) {
      case 'nouveau':
        return { text: 'Nouveau', color: '#f39c12', bgColor: '#fef5e7' };
      case 'en_cours':
        return { text: 'En cours', color: '#3498db', bgColor: '#ebf5fb' };
      case 'resolu':
        return { text: 'Résolu', color: '#27ae60', bgColor: '#eafaf1' };
      default:
        return { text: 'Inconnu', color: '#95a5a6', bgColor: '#f8f9fa' };
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'Pollution Eau': return '💧';
      case 'Site Abandonné': return '🏭';
      case 'Poussière': return '💨';
      default: return '⚠️';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>📊 Suivi des Signalements</Text>
      
      {/* Statistiques */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reports.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {reports.filter(r => r.status === 'resolu').length}
          </Text>
          <Text style={styles.statLabel}>Résolus</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {reports.filter(r => r.status === 'en_cours').length}
          </Text>
          <Text style={styles.statLabel}>En cours</Text>
        </View>
      </View>

      {/* Liste des signalements */}
      <View style={styles.reportsList}>
        <Text style={styles.sectionTitle}>Vos signalements récents</Text>
        
        {reports.map(report => {
          const statusInfo = getStatusInfo(report.status);
          
          return (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.typeContainer}>
                  <Text style={styles.typeIcon}>{getTypeIcon(report.type)}</Text>
                  <Text style={styles.reportType}>{report.type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.text}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.location}>📍 {report.location}</Text>
              <Text style={styles.description}>{report.description}</Text>
              
              <View style={styles.reportFooter}>
                <Text style={styles.date}>📅 {report.date}</Text>
                <Text style={styles.photosCount}>
                  📸 {report.photos} photo{report.photos !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Barre de progression */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill,
                      { 
                        width: report.status === 'nouveau' ? '33%' : 
                              report.status === 'en_cours' ? '66%' : '100%',
                        backgroundColor: statusInfo.color
                      }
                    ]} 
                  />
                </View>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressLabel}>Reçu</Text>
                  <Text style={styles.progressLabel}>En traitement</Text>
                  <Text style={styles.progressLabel}>Terminé</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Message d'information */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>ℹ️ Comment ça marche ?</Text>
        <Text style={styles.infoText}>
          • <Text style={styles.bold}>Nouveau</Text> : Signalement reçu{'\n'}
          • <Text style={styles.bold}>En cours</Text> : Notre équipe intervient{'\n'}
          • <Text style={styles.bold}>Résolu</Text> : Problème traité
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 25,
    color: '#2ecc71',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  statCard: {
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  reportsList: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  reportCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  reportType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  photosCount: {
    fontSize: 12,
    color: '#999',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    color: '#95a5a6',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  infoText: {
    lineHeight: 20,
    color: '#555',
  },
  bold: {
    fontWeight: 'bold',
  },
});