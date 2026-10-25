import { json, error } from '../../../../lib/respond.js';
import { CLEAR_VOTES_NEEDED } from '../../../../lib/rules.js';

export async function onRequestPost({ request, env, params }) {
  const deviceId = request.headers.get('X-Device-Id');
  if (!deviceId) return error('Missing device ID');

  const { vote } = await request.json();
  if (!['still_there', 'cleared'].includes(vote)) return error('Invalid vote');

  const report = await env.DB.prepare('SELECT device_id FROM reports WHERE id = ? AND status = ?')
    .bind(params.id, 'active').first();
  if (!report) return error('Report not found', 404);
  if (report.device_id === deviceId) return error('You cannot vote on your own report', 403);

  await env.DB.prepare(`
    INSERT INTO votes (id, report_id, device_id, vote, created_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (report_id, device_id) DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at
  `).bind(crypto.randomUUID(), params.id, deviceId, vote, Math.floor(Date.now() / 1000)).run();

  const { cleared } = await env.DB.prepare(
    "SELECT COUNT(*) AS cleared FROM votes WHERE report_id = ? AND vote = 'cleared'"
  ).bind(params.id).first();

  if (cleared >= CLEAR_VOTES_NEEDED) {
    await env.DB.prepare("UPDATE reports SET status = 'cleared' WHERE id = ?").bind(params.id).run();
  }
  return json({ success: true, cleared: cleared >= CLEAR_VOTES_NEEDED });
}
