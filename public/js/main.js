// public/js/main.js
import { initMap, loadReports } from './map.js';
import { openReportSheet } from './report.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Debris Detour initializing...');
  
  // 1. Initialize the Leaflet map
  const map = initMap();
  
  if (map) {
    // 2. Load existing reports onto the map
    loadReports(map);
  }

  // 3. Open the reporting bottom sheet when Report is tapped
  document.getElementById('report-btn')?.addEventListener('click', openReportSheet);
});