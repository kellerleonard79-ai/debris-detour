import { sendVote } from './api.js';
import { loadReports } from './map.js';

function timeAgo(seconds) {
  const minutes = Math.floor((Date.now() / 1000 - seconds) / 60);
  if (minutes < 60) return `${Math.max(minutes, 1)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

export function openDetailSheet(report) {
  const sheet = document.getElementById('sheet');
  const type = report.type === 'other' && report.other_text ? report.other_text : report.type.replace('_', ' ');
  sheet.innerHTML = `
    <div class="panel">
      <h2><span id="detail-type"></span> <button id="close-detail">✕</button></h2>
      ${report.verified ? '<p class="verified">✔ Verified</p>' : '<p>Unconfirmed</p>'}
      <p><b>${report.passable ? 'One lane open' : 'Blocked'}</b></p>
      <p id="detail-street"></p>
      <p>Reported ${timeAgo(report.created_at)}</p>
      ${report.photo_key ? `<a href="/api/photos/${report.photo_key}" target="_blank"><img src="/api/photos/${report.photo_key}" alt="Photo"></a>` : ''}
      <p id="detail-note"></p>
      <p>${report.still_there_count} still there · ${report.cleared_count} cleared</p>
      <p id="detail-error"></p>
      ${report.is_mine ? '' : `
        <button class="vote-btn" data-vote="still_there">Still there</button>
        <button class="vote-btn" data-vote="cleared">Cleared</button>`}
    </div>
  `;
  document.getElementById('detail-type').textContent = type;
  document.getElementById('detail-street').textContent = report.street_label;
  document.getElementById('detail-note').textContent = report.note || '';
  sheet.classList.add('open');

  document.getElementById('close-detail').addEventListener('click', () => sheet.classList.remove('open'));
  sheet.querySelectorAll('.vote-btn').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await sendVote(report.id, button.dataset.vote);
        sheet.classList.remove('open');
        loadReports();
      } catch (err) {
        document.getElementById('detail-error').textContent = err.message;
      }
    });
  });
}
