// public/js/map.js
import { getReports } from './api.js';

export let map;
const reportLayer = L.layerGroup();
const LETTERS = { tree: 'T', flood: 'F', power_line: 'P', debris: 'D', other: '?' };

export function initMap() {
  map = L.map('map', { zoomControl: false }).setView([33.2443, -86.8164], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

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
      L.marker([r.lat, r.lng], { icon }).addTo(reportLayer);
    }
  } catch (err) {
    console.error('Could not refresh reports:', err); // keep the old markers
  }
}
