import { DEFAULT_SETTINGS } from './avoid.js';
import { TYPES } from './constants.js';

const KEY = 'dd_settings';

export function getSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return { ...DEFAULT_SETTINGS, ...saved, types: { ...DEFAULT_SETTINGS.types, ...saved?.types } };
  } catch (err) {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (err) {
    console.error(err);
  }
}

export function initSettings() {
  document.getElementById('settings-btn').addEventListener('click', openSettings);
}

function openSettings() {
  const settings = getSettings();
  const sheet = document.getElementById('sheet');
  sheet.innerHTML = `<div class="panel">
    <h2>Settings <button id="close-settings">✕</button></h2>
    <h3>Avoid these types</h3>
    ${TYPES.map(t => `<label><input type="checkbox" data-type="${t}" ${settings.types[t] ? 'checked' : ''}> ${t.replace('_', ' ')}</label>`).join('')}
    <h3>Driving</h3>
    <label><input type="checkbox" id="avoid-passable" ${settings.avoidPassable ? 'checked' : ''}> Avoid passable obstructions</label>
    <label><input type="checkbox" id="cautious" ${settings.cautious ? 'checked' : ''}> Cautious Navigation (also avoid unverified reports)</label>
  </div>`;
  sheet.classList.add('open');

  sheet.onchange = () => {
    const types = {};
    sheet.querySelectorAll('[data-type]').forEach(box => types[box.dataset.type] = box.checked);
    saveSettings({
      types,
      avoidPassable: document.getElementById('avoid-passable').checked,
      cautious: document.getElementById('cautious').checked
    });
  };
  document.getElementById('close-settings').addEventListener('click', () => {
    sheet.classList.remove('open');
    sheet.onchange = null;
  });
}
