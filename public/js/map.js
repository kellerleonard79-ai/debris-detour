// public/js/map.js
import { getReports } from './api.js';

export let map;
const reportLayer = L.layerGroup();
const LETTERS = { tree: 'T', flood: 'F', power_line: 'P', debris: 'D', other: '?' };

export function initMap() {
  map = L.map('map', { zoomControl: false }).setView([30.4213, -87.2169], 12); // Pensacola

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  map.locate({ setView: true, maxZoom: 16 });
  map.on('locationfound', e => L.circleMarker(e.latlng, { radius: 8, fillOpacity: 1 }).addTo(map));

  reportLayer.addTo(map);
  map.on('moveend', loadReports);
  setInterval(loadReports, 30000);

  return map;
}

export async function loadReports() {
  try {
    const reports = await getReports(map.getBounds().toBBoxString());
    reportLayer.clearLayers();
    for (const r of reports) {
      const icon = L.divIcon({
        className: 'marker ' + (r.passable ? 'passable' : 'impassable'),
        html: LETTERS[r.type],
        iconSize: [32, 32]
      });
      const color = r.passable ? '#f9a825' : '#d32f2f';
      L.geoJSON(JSON.parse(r.geometry), {
        style: { color, weight: 8 },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 14, color })
      }).addTo(reportLayer);
      L.marker([r.lat, r.lng], { icon }).addTo(reportLayer);
    }
  } catch (err) {
    console.error('Could not refresh reports:', err); // keep the old markers
  }
}
