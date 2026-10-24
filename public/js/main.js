// public/js/main.js
import { initMap, loadReports } from './map.js';
import { openReportSheet } from './report.js';

initMap();
loadReports();
document.getElementById('report-btn').addEventListener('click', openReportSheet);
