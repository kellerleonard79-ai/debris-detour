// public/js/navigate.js
import { map } from './map.js';
import { geocode, getRoute, getReports } from './api.js';
import { buildZones } from './avoid.js';
import { getSettings } from './settings.js';

const search = document.getElementById('search');
const results = document.getElementById('results');
const card = document.getElementById('route-card');
let timer;
let routeLine;
let watchId;
let carMarker;
let checkTimer;
let destination;
let spot;
let routeGeometry;
let lastReroute = 0;

export function initSearch() {
  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(showResults, 300); // wait until typing stops
  });
}

async function showResults() {
  const center = map.getCenter();
  try {
    const places = await geocode(search.value, center.lat, center.lng);
    results.innerHTML = '';
    for (const place of places) {
      const item = document.createElement('div');
      item.textContent = place.label;
      item.addEventListener('click', () => pickPlace(place));
      results.append(item);
    }
  } catch (err) {
    console.error(err);
  }
}

function pickPlace(place) {
  search.value = place.label;
  results.innerHTML = '';

  navigator.geolocation.getCurrentPosition(
    pos => drawRoute({ lat: pos.coords.latitude, lng: pos.coords.longitude }, place),
    () => drawRoute(map.getCenter(), place)
  );
}

async function loadZones(start, end) {
  const pad = 0.03;
  const bbox = [
    Math.min(start.lng, end.lng) - pad,
    Math.min(start.lat, end.lat) - pad,
    Math.max(start.lng, end.lng) + pad,
    Math.max(start.lat, end.lat) + pad
  ].join(',');
  const reports = await getReports(bbox);
  return buildZones(reports, getSettings());
}

function showRoute(route) {
  if (routeLine) routeLine.remove();
  routeGeometry = route.geometry;
  routeLine = L.geoJSON(route.geometry, { style: { weight: 7 } }).addTo(map);
}

async function drawRoute(start, end) {
  try {
    destination = end;
    const zones = await loadZones(start, end);
    const route = await getRoute(start, end, zones);
    showRoute(route);
    map.fitBounds(routeLine.getBounds());

    const minutes = Math.round(route.summary.duration / 60);
    const miles = (route.summary.distance / 1609.34).toFixed(1);
    card.innerHTML = `${minutes} min · ${miles} mi · Avoiding ${zones.length} ${zones.length === 1 ? 'obstruction' : 'obstructions'} <button id="start-nav">Start</button> <button id="cancel-route">Cancel</button>`;
    document.getElementById('start-nav').addEventListener('click', startNavigation);
    document.getElementById('cancel-route').addEventListener('click', cancelRoute);
  } catch (err) {
    console.error(err);
  }
}

function cancelRoute() {
  routeLine.remove();
  card.innerHTML = '';
  search.value = '';
}

function startNavigation() {
  card.innerHTML = '<span id="nav-status">Navigating</span> <button id="end-nav">End</button>';
  document.getElementById('end-nav').addEventListener('click', endNavigation);

  watchId = navigator.geolocation.watchPosition(pos => {
    spot = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (!carMarker) carMarker = L.circleMarker(spot, { radius: 10, color: '#1976d2', fillOpacity: 1 }).addTo(map);
    carMarker.setLatLng(spot);
    map.setView(spot, 17);

    const line = turf.lineString(routeGeometry.coordinates);
    if (turf.pointToLineDistance([spot.lng, spot.lat], line, { units: 'meters' }) > 50) {
      reroute('Off route. Rerouting');
    }
  }, console.error, { enableHighAccuracy: true });

  checkTimer = setInterval(checkForObstructions, 30000);
}

async function checkForObstructions() {
  if (!spot) return;
  try {
    const zones = await loadZones(spot, destination);
    const end = routeGeometry.coordinates[routeGeometry.coordinates.length - 1];
    const ahead = turf.lineSlice([spot.lng, spot.lat], end, turf.lineString(routeGeometry.coordinates));
    if (!zones.some(zone => turf.booleanIntersects(zone, ahead))) return;

    reroute('New obstruction ahead. Rerouting');
  } catch (err) {
    console.error(err);
  }
}

async function reroute(message) {
  if (Date.now() - lastReroute < 15000) return;
  lastReroute = Date.now();

  const status = document.getElementById('nav-status');
  status.textContent = message;
  try {
    const zones = await loadZones(spot, destination);
    showRoute(await getRoute(spot, destination, zones));
  } catch (err) {
    console.error(err);
  }
  status.textContent = 'Navigating';
}

function endNavigation() {
  navigator.geolocation.clearWatch(watchId);
  clearInterval(checkTimer);
  spot = null;
  if (carMarker) carMarker.remove();
  carMarker = null;
  cancelRoute();
}
