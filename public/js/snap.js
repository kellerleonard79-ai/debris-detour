// public/js/snap.js
const SNAP_METERS = 30; // how far from a road a pin can be
const INTERSECTION_METERS = 5; // closer than this to a corner snaps to the corner
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

// Nodes where roads cross: map of node ID -> names of the roads there.
// Two roads with the same name meeting at a node is just OSM splitting one street, so it doesn't count.
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

// Finds the closest road to the point. Returns { found: false } if none is within SNAP_METERS.
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

  // Near a corner? Report the intersection instead of a section.
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

  // Walk along the road from the pin's segment to the intersection on each side.
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

// The other street at this node, or "dead end" if the road just stops here.
function crossStreet(way, i, intersections) {
  const names = intersections.get(way.nodes[i]);
  if (!names) return 'dead end';
  return names.find(n => n !== way.tags.name) || 'unnamed road';
}

// The closest intersection on this road within INTERSECTION_METERS of the pin, if any.
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
