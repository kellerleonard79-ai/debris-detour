export const TYPES = ['tree', 'flood', 'power_line', 'debris', 'other'];

export const EXPIRY_HOURS = {
  flood: 24,
  debris: 48,
  other: 48,
  tree: 120,
  power_line: 120
};

export const MAX_LIFE_HOURS = 168;

export const MAJOR_CLASSES = [
  'motorway', 'motorway_link',
  'trunk', 'trunk_link',
  'primary', 'primary_link',
  'secondary', 'secondary_link',
  'tertiary', 'tertiary_link'
];

export const ON_SITE_METERS = 150;
export const SNAP_SEARCH_METERS = 30;
export const INTERSECTION_SNAP_METERS = 25;
export const NOTE_MAX = 200;
export const CLEAR_VOTES_NEEDED = 2;
export const REPORTS_PER_HOUR = 10;