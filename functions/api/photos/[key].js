import { error } from '../../../lib/respond.js';

export async function onRequestGet({ params, env }) {
    const row = await env.DB.prepare('SELECT data FROM photos WHERE key = ?').bind(params.key).first();
    if (!row) return error('Photo not found', 404);
    return new Response(new Uint8Array(row.data), { headers: { 'content-type': 'image/jpeg' } });
}
