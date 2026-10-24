// public/js/main.js
import { initMap, loadReports } from './map.js';
import { openReportSheet } from './report.js';
import { initSearch } from './navigate.js';

initMap();
loadReports();
initSearch();
document.getElementById('report-btn').addEventListener('click', openReportSheet);
