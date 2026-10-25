// functions/api/route.js
import { json, error } from '../../lib/respond.js';

export async function onRequestPost({ request, env }) {
  const { start, end, zones = [] } = await request.json();

  const options = {};
  if (zones.length) {
    options.avoid_polygons = {
      type: 'MultiPolygon',
      coordinates: zones.map(zone => zone.geometry.coordinates)
    };
  }

  const res = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/geojson', {
    method: 'POST',
    headers: { Authorization: env.ORS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
      instructions: true,
      units: 'm',
      options
    })
  });
  if (!res.ok) return error('No route found', 502);

  const route = (await res.json()).features[0];
  return json({
    geometry: route.geometry,
    summary: route.properties.summary,
    steps: route.properties.segments[0].steps
  });
}
