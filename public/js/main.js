// public/js/main.js
import { initMap, loadReports } from './map.js';
import { openReportSheet } from './report.js';
import { initSearch } from './navigate.js';
import { initSettings } from './settings.js';
import { initLocation } from './location.js';

initMap();
initLocation();
loadReports();
initSearch();
initSettings();
document.getElementById('report-btn').addEventListener('click', openReportSheet);
