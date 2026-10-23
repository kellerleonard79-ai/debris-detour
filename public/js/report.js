// public/js/report.js
import { map } from './map.js';
import { createReport } from './api.js';
import { loadReports } from './map.js';
import { TYPES, NOTE_MAX } from '../../../lib/rules.js';

let reportMarker = null;

export function openReportSheet() {
  const sheet = document.getElementById('sheet');
  if (!sheet) return;

  // Center pin location on map center or user position
  const center = map.getCenter();

  // Populate sheet HTML
  sheet.innerHTML = `
    <div style="font-family: sans-serif; padding-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 20px;">Report Obstruction</h2>
        <button id="close-sheet" style="background: none; border: none; font-size: 20px; cursor: pointer;">✕</button>
      </div>

      <p style="font-size: 14px; color: #666; margin-top: 0;">Drag the pin on the map to the exact location.</p>

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
          flex: 1; padding: 14px; border: 2px solid #ff3b30; border-radius: 8px; background: white; color: #ff3b30; font-weight: bold; font-size: 16px; cursor: pointer;
        ">Impassable</button>
        <button type="button" class="pass-btn" data-passable="1" style="
          flex: 1; padding: 14px; border: 2px solid #ffcc00; border-radius: 8px; background: white; color: #b38600; font-weight: bold; font-size: 16px; cursor: pointer;
        ">Passable with caution</button>
      </div>

      <!-- Note Box -->
      <label style="font-weight: bold; display: block; margin-bottom: 4px;">Notes (Optional)</label>
      <textarea id="report-note" maxlength="${NOTE_MAX}" placeholder="Add any helpful details..." style="width: 100%; height: 80px; padding: 10px; font-size: 16px; border: 1px solid #ccc; border-radius: 8px; resize: none; box-sizing: border-box; margin-bottom: 16px;"></textarea>

      <!-- Submit Button -->
      <button id="submit-report" style="
        width: 100%; height: 56px; background: #007aff; color: white; border: none; border-radius: 12px; font-size: 18px; font-weight: bold; cursor: pointer;
      ">Submit Report</button>
    </div>
  `;

  sheet.classList.add('open');

  // Place draggable marker at map center
  if (reportMarker) {
    map.removeLayer(reportMarker);
  }
  reportMarker = L.marker([center.lat, center.lng], { draggable: true }).addTo(map);

  // State management inside the form
  let selectedType = null;
  let selectedPassable = null;

  // Handle Type Selection
  const typeButtons = sheet.querySelectorAll('.type-btn');
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.style.borderColor = '#ccc');
      btn.style.borderColor = '#007aff';
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
      });
      btn.style.background = btn.getAttribute('data-passable') === '0' ? '#ffebee' : '#fffde7';
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
      type: selectedType,
      passable: selectedPassable,
      note: note.trim() || null,
      otherText: selectedType === 'other' ? otherText.trim() : null
    };

    try {
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