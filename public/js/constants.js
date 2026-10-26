// public/js/constants.js
// Browser-side copy of the constants report.js needs. lib/rules.js sits outside
// public/, so the browser can't import it. Keep these in sync with lib/rules.js.
export const TYPES = ['tree', 'flood', 'power_line', 'debris', 'other'];
export const NOTE_MAX = 200;
export const COLORS = {
  darkBlue: '#1d52bc',
  lightBlue: '#3ca5e6',
  red: '#df3941',
  lightYellow: '#ffde00',
  darkYellow: '#f4ab19'
};
