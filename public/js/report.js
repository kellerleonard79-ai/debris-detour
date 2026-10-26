// public/js/report.js
import { map } from './map.js';
import { createReport } from './api.js';
import { loadReports } from './map.js';
import { TYPES, NOTE_MAX, COLORS } from './constants.js';
import { snapPoint } from './snap.js';
import { shrinkPhoto } from './photo.js';

const pinIcon = L.divIcon({
  className: '',
  html: `<svg width="36" height="48" viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${COLORS.red}"/><circle cx="12" cy="12" r="4.5" fill="white"/></svg>`,
  iconSize: [36, 48],
  iconAnchor: [18, 48]
});

let reportMarker = null;
let sectionLine = null;
let currentSnap = null;

export function openReportSheet() {
  const sheet = document.getElementById('sheet');
  if (!sheet) return;

  const center = map.getCenter();

  if (reportMarker) {
    map.removeLayer(reportMarker);
  }
  reportMarker = L.marker([center.lat, center.lng], { icon: pinIcon, draggable: true }).addTo(map);
  reportMarker.on('dragend', snapPin);

  currentSnap = null;
  showLocationStep();
  snapPin();
}

function showLocationStep() {
  const sheet = document.getElementById('sheet');
  reportMarker.dragging.enable();

  sheet.innerHTML = `
    <div style="padding-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h2 style="margin: 0; font-size: 20px;">Report Obstruction</h2>
        <button id="close-sheet" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
      </div>
      <p style="font-size: 14px; color: #666; margin: 0 0 8px;">Drag the pin precisely onto a street and it will snap to the nearest road.</p>
      <p id="street-label" style="font-weight: bold; margin: 0 0 12px;"></p>
      <button id="confirm-location" disabled style="width: 100%; height: 52px; background: ${COLORS.darkBlue}; color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer;">Confirm location</button>
    </div>
  `;
  sheet.classList.add('open');

  document.getElementById('close-sheet').addEventListener('click', closeReportSheet);
  document.getElementById('confirm-location').addEventListener('click', showForm);

  if (currentSnap) {
    document.getElementById('street-label').textContent = currentSnap.street_label;
    document.getElementById('confirm-location').disabled = false;
  }
}

async function snapPin() {
  const label = document.getElementById('street-label');
  const confirm = document.getElementById('confirm-location');
  confirm.disabled = true;
  currentSnap = null;
  label.textContent = 'Finding street...';
  if (sectionLine) map.removeLayer(sectionLine);
  try {
    const { lat, lng } = reportMarker.getLatLng();
    const snap = await snapPoint(lat, lng);
    if (!snap.found) {
      label.textContent = 'Move the pin onto a road';
      return;
    }
    reportMarker.setLatLng([snap.snapped.lat, snap.snapped.lng]);
    label.textContent = snap.street_label;
    currentSnap = snap;
    confirm.disabled = false;
    sectionLine = L.geoJSON(snap.geometry, {
      style: { color: COLORS.lightYellow, weight: 8 },
      pointToLayer: (f, latlng) => L.circleMarker(latlng, { radius: 14, color: COLORS.lightYellow })
    }).addTo(map);
  } catch (err) {
    label.textContent = 'Could not find the street. Drag the pin to try again.';
  }
}

function showForm() {
  const sheet = document.getElementById('sheet');
  reportMarker.dragging.disable();

  sheet.innerHTML = `
    <div style="padding-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 20px;">Report Obstruction</h2>
        <button id="close-sheet" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
      </div>

      <p id="street-label" style="font-weight: bold; margin: 0 0 4px;"></p>
      <button type="button" id="change-location" style="background: none; border: none; color: ${COLORS.darkBlue}; font-size: 14px; padding: 0; margin-bottom: 16px; cursor: pointer;">Change location</button>

      <!-- Hazard Type Selection -->
      <label style="font-weight: bold; display: block; margin-bottom: 8px;">Hazard Type</label>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px;">
        ${TYPES.map(t => `
          <button type="button" class="type-btn" data-type="${t}" style="
            padding: 12px 8px; 
            border: 2px solid #ccc; 
            border-radius: 8px; 
            background: white; 
            font-size: 14px; 
            cursor: pointer;
            text-transform: capitalize;
          ">${t.replace('_', ' ')}</button>
        `).join('')}
      </div>

      <!-- Other Text Input (Hidden by default) -->
      <div id="other-container" style="display: none; margin-bottom: 16px;">
        <label style="font-weight: bold; display: block; margin-bottom: 4px;">Describe Hazard</label>
        <input type="text" id="other-text" placeholder="Specify hazard type..." maxlength="50" style="width: 100%; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box;">
      </div>

      <!-- Passability Selection -->
      <label style="font-weight: bold; display: block; margin-bottom: 8px;">Passability</label>
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <button type="button" class="pass-btn" data-passable="0" style="
          flex: 1; padding: 14px; border: 2px solid ${COLORS.red}; border-radius: 8px; background: white; color: ${COLORS.red}; font-weight: bold; font-size: 16px; cursor: pointer;
        ">Impassable</button>
        <button type="button" class="pass-btn" data-passable="1" style="
          flex: 1; padding: 14px; border: 2px solid ${COLORS.darkYellow}; border-radius: 8px; background: white; color: #222; font-weight: bold; font-size: 16px; cursor: pointer;
        ">Passable with caution</button>
      </div>

      <!-- Note Box -->
      <label style="font-weight: bold; display: block; margin-bottom: 4px;">Notes (Optional)</label>
      <textarea id="report-note" maxlength="${NOTE_MAX}" placeholder="Add any helpful details..." style="width: 100%; height: 80px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 8px; resize: none; box-sizing: border-box; margin-bottom: 16px;"></textarea>

      <label style="font-weight: bold; display: block; margin-bottom: 4px;">Photo (Optional)</label>
      <input type="file" id="report-photo" accept="image/*" style="width: 100%; font-size: 16px; margin-bottom: 16px;">

      <!-- Submit Button -->
      <button id="submit-report" style="
        width: 100%; height: 56px; background: ${COLORS.darkBlue}; color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer;
      ">Submit Report</button>
    </div>
  `;

  document.getElementById('street-label').textContent = currentSnap.street_label;
  document.getElementById('change-location').addEventListener('click', showLocationStep);

  // State management inside the form
  let selectedType = null;
  let selectedPassable = null;

  // Handle Type Selection
  const typeButtons = sheet.querySelectorAll('.type-btn');
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.style.borderColor = '#ccc');
      btn.style.borderColor = COLORS.darkBlue;
      selectedType = btn.getAttribute('data-type');

      const otherContainer = document.getElementById('other-container');
      if (selectedType === 'other') {
        otherContainer.style.display = 'block';
      } else {
        otherContainer.style.display = 'none';
      }
    });
  });

  // Handle Passability Selection
  const passButtons = sheet.querySelectorAll('.pass-btn');
  passButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      passButtons.forEach(b => {
        b.style.background = 'white';
        b.style.color = b.getAttribute('data-passable') === '0' ? COLORS.red : '#222';
      });
      if (btn.getAttribute('data-passable') === '0') {
        btn.style.background = COLORS.red;
        btn.style.color = 'white';
      } else {
        btn.style.background = COLORS.lightYellow;
      }
      selectedPassable = parseInt(btn.getAttribute('data-passable'), 10);
    });
  });

  // Close Sheet button
  document.getElementById('close-sheet').addEventListener('click', closeReportSheet);

  // Submit Handler
  document.getElementById('submit-report').addEventListener('click', async () => {
    if (!selectedType) {
      alert('Please select a hazard type.');
      return;
    }
    if (selectedPassable === null) {
      alert('Please select whether the road is passable or impassable.');
      return;
    }

    const otherText = document.getElementById('other-text').value;
    if (selectedType === 'other' && !otherText.trim()) {
      alert('Please describe the hazard.');
      return;
    }

    const note = document.getElementById('report-note').value;
    const markerPos = reportMarker.getLatLng();

    const payload = {
      lat: markerPos.lat,
      lng: markerPos.lng,
      location_kind: currentSnap.location_kind,
      section_key: currentSnap.section_key,
      geometry: JSON.stringify(currentSnap.geometry),
      street_label: currentSnap.street_label,
      type: selectedType,
      passable: selectedPassable,
      note: note.trim() || null,
      other_text: selectedType === 'other' ? otherText.trim() : null
    };

    try {
      const photo = document.getElementById('report-photo').files[0];
      if (photo) payload.photo = await shrinkPhoto(photo);
      await createReport(payload);
      closeReportSheet();
      loadReports();
      showToast('Report submitted successfully.');
    } catch (err) {
      alert('Error submitting report: ' + err.message);
    }
  });
}

function closeReportSheet() {
  const sheet = document.getElementById('sheet');
  if (sheet) {
    sheet.classList.remove('open');
  }
  if (reportMarker) {
    map.removeLayer(reportMarker);
    reportMarker = null;
  }
  if (sectionLine) {
    map.removeLayer(sectionLine);
    sectionLine = null;
  }
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    background: rgba(0,0,0,0.8); color: white; padding: 12px 24px;
    border-radius: 24px; font-size: 16px; z-index: 2000; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  setTimeout(() => {
    toast.style.cssText = 'display: none;';
  }, 3000);
}