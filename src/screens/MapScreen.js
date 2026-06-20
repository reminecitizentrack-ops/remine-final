// src/screens/MapScreen.js — Carte avec vrais signalements backend
import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView, Linking, TextInput, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const createStyles = (colors) => StyleSheet.create({
  safe:   { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt },
  title:  { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  count:  { fontSize: 13, color: colors.textSecondary },
  filters:{ paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
  filterBtn:       { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.background, marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  filterBtnActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  filterText:      { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive:{ color: colors.primary, fontWeight: '700' },
  modeRow:         { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt, gap: 6 },
  modeBtn:         { flex: 1, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center' },
  modeBtnActive:   { backgroundColor: colors.textPrimary },
  modeBtnText:     { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  modeBtnTextActive:{ color: colors.surface },
  searchToggle:    { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  searchToggleText:{ fontSize: 16 },
  searchBar:       { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.surfaceAlt, gap: 8 },
  searchInput:     { flex: 1, fontSize: 14, color: colors.textPrimary, paddingVertical: 4, backgroundColor: colors.background, borderRadius: 16, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border },
  clearBtn:        { fontSize: 16, color: colors.textMuted, paddingHorizontal: 4 },
  map:    { flex: 1 },
  gpsBtn: { position: 'absolute', bottom: 20, right: 16, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
  gpsBtnIcon: { fontSize: 20 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderText: { color: colors.textSecondary, fontSize: 14 },
  detail: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, borderTopWidth: 1, borderTopColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  detailHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  detailTitle:   { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textTransform: 'capitalize' },
  detailClose:   { fontSize: 20, color: colors.textMuted, fontWeight: 'bold', padding: 4 },
  detailDesc:    { fontSize: 14, color: colors.textPrimary, lineHeight: 20, marginBottom: 6 },
  detailAddr:    { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  detailRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  detailBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  detailStatus:  { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  mapsBtn:       { backgroundColor: colors.primaryLight, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.primaryMid },
  mapsBtnText:   { color: colors.primary, fontWeight: '600', fontSize: 14 },
});


const TYPE_ICONS = {
  water_pollution:    '💧',
  dust:               '🌫️',
  waste_deposit:      '🗑️',
  abandoned_site:     '🏚️',
  air_pollution:      '💨',
  soil_contamination: '🟤',
  noise_pollution:    '🔊',
  other:              '⚠️',
};

const SEVERITY_COLORS = {
  low:      '#22c55e',
  medium:   '#f59e0b',
  high:     '#ef4444',
  critical: '#7f1d1d',
};

const STATUS_LABELS = {
  new:         'Nouveau',
  verified:    'Vérifié',
  in_progress: 'En cours',
  resolved:    'Résolu',
  rejected:    'Rejeté',
};

export default function MapScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = React.useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [reports, setReports]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected]     = useState(null);
  const [filter, setFilter]         = useState('all');
  const [mapMode, setMapMode]       = useState('markers'); // markers | clusters | heatmap
  const [search, setSearch]         = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const webViewRef                  = useRef(null);
  const [locating, setLocating]     = useState(false);

  const loadReports = useCallback(async () => {
    try {
      const params = filter !== 'all' ? { severity: filter } : {};
      const response = await api.get('/reports', { params });
      const data = response.data?.data?.reports || response.data?.data || [];
      setReports(Array.isArray(data) ? data : []);
    } catch (e) {
      if (__DEV__) console.log('Erreur chargement carte:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const onRefresh = () => { setRefreshing(true); loadReports(); };

  // Centre la carte sur la position GPS actuelle de l'utilisateur
  const centerOnMe = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la localisation pour vous centrer sur la carte.');
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      const js = `
        (function() {
          if (window.map) {
            window.map.setView([${latitude}, ${longitude}], 14, { animate: true });
            if (window.userMarker) { window.map.removeLayer(window.userMarker); }
            window.userMarker = L.circleMarker([${latitude}, ${longitude}], {
              radius: 8, fillColor: '#3b82f6', color: '#fff', weight: 3, fillOpacity: 1
            }).addTo(window.map);
          }
          true;
        })();
      `;
      webViewRef.current?.injectJavaScript(js);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position.');
    } finally {
      setLocating(false);
    }
  };

  // Filtrage par recherche
  const filteredReports = reports.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.description || '').toLowerCase().includes(q)
      || (r.location?.address || '').toLowerCase().includes(q)
      || (r.type || '').toLowerCase().includes(q);
  });

  const generateMapHTML = () => {
    const markers = filteredReports
      .filter(r => r.location?.latitude && r.location?.longitude)
      .map(r => ({
        id:    r._id || r.id,
        lat:   r.location.latitude,
        lng:   r.location.longitude,
        type:  r.type,
        icon:  TYPE_ICONS[r.type] || '📍',
        color: SEVERITY_COLORS[r.severity] || '#6b7280',
        title: (TYPE_ICONS[r.type] || '📍') + ' ' + (r.type || '').replace(/_/g, ' '),
        desc:  (r.description || '').substring(0, 80),
        addr:  r.location.address || '',
        status: STATUS_LABELS[r.status] || r.status,
        severity: r.severity || 'medium',
      }));

    const center = markers.length > 0
      ? [markers[0].lat, markers[0].lng]
      : [14.7167, -17.4677];

    const MODE = mapMode;

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 100vw; height: 100vh; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .custom-marker {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 18px;
      border: 3px solid white; font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .popup-title  { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
    .popup-desc   { font-size: 12px; color: #555; margin-bottom: 4px; }
    .popup-addr   { font-size: 11px; color: #888; }
    .popup-status { font-size: 11px; font-weight: 600; color: #16a34a; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  const MODE    = '${MODE}';
  const markers = ${JSON.stringify(markers)};
  const map     = L.map('map').setView(${JSON.stringify(center)}, ${markers.length > 0 ? 10 : 7});
  window.map    = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap', maxZoom: 18
  }).addTo(map);

  function makeIcon(m) {
    return L.divIcon({
      html: '<div class="custom-marker" style="background:' + m.color + '">' + m.icon + '</div>',
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    });
  }

  function makePopup(m) {
    return '<div class="popup-title">' + m.title + '</div>'
         + '<div class="popup-desc">'  + m.desc  + '</div>'
         + '<div class="popup-addr">📍 ' + m.addr + '</div>'
         + '<div class="popup-status">Statut : ' + m.status + '</div>';
  }

  if (MODE === 'clusters') {
    var cluster = L.markerClusterGroup({
      maxClusterRadius: 60,
      iconCreateFunction: function(c) {
        var n = c.getChildCount();
        var col = n > 10 ? '#ef4444' : n > 5 ? '#f59e0b' : '#16a34a';
        return L.divIcon({
          html: '<div style="background:' + col + ';color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)">' + n + '</div>',
          iconSize: [40, 40], className: ''
        });
      }
    });
    markers.forEach(function(m) {
      var mk = L.marker([m.lat, m.lng], { icon: makeIcon(m) }).bindPopup(makePopup(m));
      mk.on('click', function() { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'marker_click', id: m.id })); });
      cluster.addLayer(mk);
    });
    map.addLayer(cluster);

  } else if (MODE === 'heatmap') {
    var heatData = markers.map(function(m) {
      var w = m.severity === 'critical' ? 1.0 : m.severity === 'high' ? 0.7 : m.severity === 'medium' ? 0.4 : 0.2;
      return [m.lat, m.lng, w];
    });
    if (heatData.length > 0) {
      L.heatLayer(heatData, { radius: 35, blur: 25, gradient: { 0.2: '#22c55e', 0.5: '#f59e0b', 0.8: '#ef4444', 1.0: '#7f1d1d' } }).addTo(map);
    }
    markers.forEach(function(m) {
      var mk = L.circleMarker([m.lat, m.lng], { radius: 5, fillColor: m.color, color: 'white', weight: 2, fillOpacity: 0.9 }).addTo(map).bindPopup(makePopup(m));
      mk.on('click', function() { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'marker_click', id: m.id })); });
    });

  } else {
    markers.forEach(function(m) {
      var mk = L.marker([m.lat, m.lng], { icon: makeIcon(m) }).addTo(map).bindPopup(makePopup(m));
      mk.on('click', function() { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'marker_click', id: m.id })); });
    });
  }

  if (markers.length > 1) {
    var group = markers.map(function(m) { return [m.lat, m.lng]; });
    map.fitBounds(group, { padding: [40, 40] });
  }
</script>
</body>
</html>`;
  };

  const handleWebViewMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'marker_click') {
        const report = reports.find(r => (r._id || r.id) === msg.id);
        if (report) setSelected(report);
      }
    } catch {}
  };

  const openGoogleMaps = (report) => {
    const lat = report.location?.latitude;
    const lng = report.location?.longitude;
    if (lat && lng) Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  };

  const filtered = filter === 'all' ? reports : reports.filter(r => r.severity === filter);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <Text style={styles.title}>🗺️ Carte des signalements</Text>
        <Text style={styles.count}>{reports.length} signalement{reports.length > 1 ? 's' : ''}</Text>
      </View>

      {/* Filtres */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {[
          { key: 'all',      label: 'Tous'     },
          { key: 'critical', label: '🔴 Critique' },
          { key: 'high',     label: '🟠 Élevé'   },
          { key: 'medium',   label: '🟡 Moyen'   },
          { key: 'low',      label: '🟢 Faible'  },
        ].map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Recherche */}
      {showSearch && (
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Type, description, lieu…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Text style={styles.clearBtn}>✕</Text></TouchableOpacity> : null}
        </View>
      )}

      {/* Mode carte */}
      <View style={[styles.modeRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {[
          { key: 'markers',  label: '📍 Marqueurs' },
          { key: 'clusters', label: '🔵 Clusters'  },
          { key: 'heatmap',  label: '🌡️ Heatmap'  },
        ].map(m => (
          <TouchableOpacity key={m.key} style={[styles.modeBtn, mapMode === m.key && styles.modeBtnActive]} onPress={() => setMapMode(m.key)}>
            <Text style={[styles.modeBtnText, mapMode === m.key && styles.modeBtnTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.searchToggle} onPress={() => setShowSearch(v => !v)}>
          <Text style={styles.searchToggleText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Carte */}
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loaderText}>Chargement de la carte…</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={{ html: generateMapHTML() }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            javaScriptEnabled
            scrollEnabled={false}
            originWhitelist={['*']}
          />
          <TouchableOpacity
            style={[styles.gpsBtn, { backgroundColor: colors.surface }]}
            onPress={centerOnMe}
            disabled={locating}
            activeOpacity={0.8}
          >
            {locating
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={styles.gpsBtnIcon}>🎯</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Panneau détail */}
      {selected && (
        <View style={[styles.detail, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>
              {TYPE_ICONS[selected.type] || '📍'} {(selected.type || '').replace(/_/g, ' ')}
            </Text>
            <TouchableOpacity onPress={() => setSelected(null)}>
              <Text style={styles.detailClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.detailDesc} numberOfLines={3}>{selected.description}</Text>
          <Text style={styles.detailAddr}>📍 {selected.location?.address}</Text>
          <View style={styles.detailRow}>
            <Text style={[styles.detailBadge, { backgroundColor: SEVERITY_COLORS[selected.severity] + '20', color: SEVERITY_COLORS[selected.severity] }]}>
              {selected.severity}
            </Text>
            <Text style={styles.detailStatus}>{STATUS_LABELS[selected.status] || selected.status}</Text>
          </View>
          <TouchableOpacity style={styles.mapsBtn} onPress={() => openGoogleMaps(selected)}>
            <Text style={styles.mapsBtnText}>🗺️ Ouvrir dans Google Maps</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}