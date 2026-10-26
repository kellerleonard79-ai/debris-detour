import { map } from './map.js';

const banner = document.getElementById('location-banner');
const text = document.getElementById('location-text');
let afterFound;

export function showLocationBanner(message, then) {
  text.textContent = message;
  afterFound = then;
  banner.hidden = false;
}

function locate() {
  map.locate({ setView: true, maxZoom: 16 });
}

export function initLocation() {
  map.on('locationerror', () => {
    if (banner.hidden) showLocationBanner('Location is off. Tap Turn on location and choose Allow, or allow it in your browser or phone settings.');
  });

  map.on('locationfound', () => {
    banner.hidden = true;
    const then = afterFound;
    afterFound = null;
    if (then) setTimeout(then);
  });

  document.getElementById('enable-location').addEventListener('click', locate);
  locate();
}
