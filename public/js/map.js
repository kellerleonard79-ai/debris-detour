export let map;

export function initMap() { 
    map = L.map('map').setView([30.4213, -87.2169], 12);
  
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

navigator.geolocation.getCurrentPosition(
    (position) => {
        let lat = position.coords.latitude;
      let lng = position.coords.longitude;
      map.setView([lat, lng], 16);
      L.circleMarker([lat, lng], {
        radius: 8,
        fillColor: '#ff7800',
        color: '#000',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(map);
    },
    () => {
        console.log('Location unavailable, staying on Pensacola');
    }
  );
}