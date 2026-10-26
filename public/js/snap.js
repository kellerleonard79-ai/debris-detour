const SNAP_METERS = 30;
const INTERSECTION_METERS = 5;
const OVERPASS_URLS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const OVERPASS_TIMEOUT_MS = 15000;
const ROAD_TYPES = 'motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link';

async function askOverpass(url, query, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
    signal
  });
  if (!res.ok) throw new Error('Overpass failed');
  const data = await res.json();
  if (data.remark) throw new Error('Overpass failed');
  return data.elements;
}

async function getRoads(lat, lng) {
  const query = `[out:json][timeout:15];
    way(around:300,${lat},${lng})["highway"~"^(${ROAD_TYPES})$"];
    out body geom;`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  try {
    const roads = await Promise.any(OVERPASS_URLS.map(url => askOverpass(url, query, controller.signal)));
    return roads.filter(way => way.geometry.every(Boolean));
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

function findIntersections(roads) {
  const waysAtNode = new Map();
  for (const way of roads) {
    for (const node of way.nodes) {
      if (!waysAtNode.has(node)) waysAtNode.set(node, []);
      waysAtNode.get(node).push(way);
    }
  }

  const intersections = new Map();
  for (const [node, ways] of waysAtNode) {
    const names = [...new Set(ways.map(way => way.tags.name))];
    if (ways.length >= 3 || names.length >= 2) intersections.set(node, names);
  }
  return intersections;
}

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

  if (!best || best.dist > SNAP_METERS) return { found: false };

  const { way, index } = best;
  const intersections = findIntersections(roads);

  const corner = nearestIntersection(way, pin, intersections);
  if (corner) {
    const names = intersections.get(corner.node).map(n => n || 'unnamed road');
    return {
      found: true,
      location_kind: 'intersection',
      section_key: 'node:' + corner.node,
      geometry: corner.point.geometry,
      street_label: 'Intersection of ' + names.join(' and '),
      snapped: { lat: corner.point.geometry.coordinates[1], lng: corner.point.geometry.coordinates[0] }
    };
  }

  let start = index;
  while (start > 0 && !intersections.has(way.nodes[start])) start--;
  let end = index + 1;
  while (end < way.nodes.length - 1 && !intersections.has(way.nodes[end])) end++;

  const name = way.tags.name || 'unnamed road';
  const from = crossStreet(way, start, intersections);
  const to = crossStreet(way, end, intersections);

  return {
    found: true,
    location_kind: 'section',
    section_key: `${way.id}:${way.nodes[start]}:${way.nodes[end]}`,
    geometry: turf.lineString(way.geometry.slice(start, end + 1).map(p => [p.lon, p.lat])).geometry,
    street_label: `${name} between ${from} and ${to}`,
    snapped: { lat: best.coords[1], lng: best.coords[0] }
  };
}

function crossStreet(way, i, intersections) {
  const names = intersections.get(way.nodes[i]);
  if (!names) return 'dead end';
  return names.find(n => n !== way.tags.name) || 'unnamed road';
}

function nearestIntersection(way, pin, intersections) {
  let closest = null;
  way.nodes.forEach((node, i) => {
    if (!intersections.has(node)) return;
    const point = turf.point([way.geometry[i].lon, way.geometry[i].lat]);
    const dist = turf.distance(pin, point, { units: 'meters' });
    if (dist <= INTERSECTION_METERS && (!closest || dist < closest.dist)) closest = { node, dist, point };
  });
  return closest;
}
