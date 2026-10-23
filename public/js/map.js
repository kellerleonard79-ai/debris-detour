// public/js/map.js
export let map = null;

export function initMap() {
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    console.error('Map element not found in HTML!');
    return null;
  }

  // Double-check that Leaflet is loaded into the global scope
  if (typeof window.L === 'undefined') {
    console.error('Leaflet script is not loaded on window yet.');
    return null;
  }

  // Initialize Leaflet map (Default coordinates set to Alabama area)
  map = window.L.map('map', { zoomControl: false }).setView([33.2443, -86.8164], 13);

  // Add CartoDB tiles to bypass strict network/CORS blocks
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  // Force Leaflet to check container size after load
  setTimeout(() => {
    map.invalidateSize();
  }, 100);

  return map;
}

export function loadReports() {
  console.log('loadReports called');
}