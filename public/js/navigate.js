// public/js/navigate.js
import { map } from './map.js';
import { geocode, getRoute } from './api.js';

const search = document.getElementById('search');
const results = document.getElementById('results');
let timer;
let routeLine;

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

async function drawRoute(start, end) {
  try {
    const route = await getRoute(start, end);
    if (routeLine) routeLine.remove();
    routeLine = L.geoJSON(route.geometry, { style: { weight: 7 } }).addTo(map);
    map.fitBounds(routeLine.getBounds());
  } catch (err) {
    console.error(err);
  }
}
