import { TYPES } from './constants.js';

export const DEFAULT_SETTINGS = {
  types: Object.fromEntries(TYPES.map(type => [type, true])),
  avoidPassable: true,
  cautious: false
};

export function shouldAvoid(report, settings) {
  if (!settings.types[report.type]) return false;
  if (report.passable && !settings.avoidPassable) return false;
  if (!report.verified && !settings.cautious) return false;
  return true;
}

function toPolygon(report) {
  const geometry = JSON.parse(report.geometry);
  if (report.location_kind === 'intersection') {
    return turf.circle(geometry.coordinates, 20, { units: 'meters' });
  }
  return turf.buffer(geometry, 10, { units: 'meters' });
}

export function buildZones(reports, settings) {
  return reports.filter(r => shouldAvoid(r, settings)).map(toPolygon);
}
