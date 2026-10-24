// public/js/snap.js
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const ROAD_TYPES = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';

// All roads within 300 m of the point, each with its node IDs and shape.
async function getRoads(lat, lng) {
  const query = `[out:json][timeout:25];
    way(around:300,${lat},${lng})["highway"~"^(${ROAD_TYPES})$"];
    out body geom;`;

  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query)
  });
  if (!res.ok) throw new Error('Overpass failed');
  return (await res.json()).elements;
}

// Finds the closest road to the point. Returns { found: false } if none is within 30 m.
export async function snapPoint(lat, lng) {
  const roads = await getRoads(lat, lng);
  const pin = turf.point([lng, lat]);

  let best = null;
  for (const way of roads) {
    const line = turf.lineString(way.geometry.map(p => [p.lon, p.lat]));
    const near = turf.nearestPointOnLine(line, pin, { units: 'meters' });
    if (!best || near.properties.dist < best.dist) {
      best = { way, dist: near.properties.dist, index: near.properties.index, coords: near.geometry.coordinates };
    }
  }

  if (!best || best.dist > 30) return { found: false };
  return {
    found: true,
    way: best.way,
    index: best.index, // which segment of the road the pin landed on
    snapped: { lat: best.coords[1], lng: best.coords[0] }
  };
}
