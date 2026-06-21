import React, { useEffect, useRef } from 'react';

const WebMap = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    // Charger Leaflet dynamiquement pour le web
    if (typeof window !== 'undefined') {
      const L = require('leaflet');
      require('leaflet/dist/leaflet.css');

      // Fix pour les icônes Leaflet
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Initialiser la carte
      const map = L.map(mapRef.current).setView([14.7167, -17.4677], 12);

      // Ajouter la couche OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Ajouter des marqueurs
      const reports = [
        { lat: 14.7167, lng: -17.4677, title: 'Pollution Eau - Thiès', type: 'water' },
        { lat: 14.7640, lng: -17.3660, title: 'Site Abandonné - Diamniadio', type: 'abandoned' },
        { lat: 14.7150, lng: -17.4500, title: 'Poussière - Rufisque', type: 'dust' }
      ];

      reports.forEach(report => {
        const icon = L.divIcon({
          html: report.type === 'water' ? '💧' : report.type === 'abandoned' ? '🏭' : '💨',
          className: 'custom-marker',
          iconSize: [30, 30]
        });

        L.marker([report.lat, report.lng], { icon })
          .addTo(map)
          .bindPopup(
            <div style="padding: 10px; min-width: 200px;">
              <strong>${report.title}</strong><br>
              Statut: En cours<br>
              <small>Cliquez pour plus de détails</small>
            </div>
          );
      });

      return () => {
        map.remove();
      };
    }
  }, []);

  return <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '10px' }} />;
};

export default WebMap;