// functions/api/geocode.js
import { json, error } from '../../lib/respond.js';

export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const q = params.get('q') || '';
  if (q.length < 3) return json([]);

  const url = new URL('https://api.openrouteservice.org/geocode/autocomplete');
  url.search = new URLSearchParams({
    api_key: env.ORS_API_KEY,
    text: q,
    'focus.point.lat': params.get('lat') || 30.4213, // bias results toward the user, else Pensacola
    'focus.point.lon': params.get('lng') || -87.2169
  });

  const res = await fetch(url);
  if (!res.ok) return error('Search failed', 502);

  const data = await res.json();
  return json(data.features.map(f => ({
    label: f.properties.label,
    lat: f.geometry.coordinates[1], // GeoJSON is [lng, lat]
    lng: f.geometry.coordinates[0]
  })));
}
