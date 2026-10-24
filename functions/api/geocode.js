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
    'focus.point.lat': params.get('lat') || 30.4213, // Pensacola by default
    'focus.point.lon': params.get('lng') || -87.2169
  });

  const res = await fetch(url);
  if (!res.ok) return error('Search failed', 502);

  const { features } = await res.json();
  return json(features.map(f => {
    const [lng, lat] = f.geometry.coordinates;
    return { label: f.properties.label, lat, lng };
  }));
}
