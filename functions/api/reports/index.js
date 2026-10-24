// functions/api/reports/index.js
import { json, error } from '../../../lib/respond.js';
import { listActive, insertReport } from '../../../lib/reports-db.js';
import { TYPES, EXPIRY_HOURS, NOTE_MAX } from '../../../lib/rules.js';

export async function onRequestGet(context) {
    const url = new URL(context.request.url);
    const bboxParam = url.searchParams.get('bbox');
    
    if (!bboxParam) {
        return error('Missing bbox parameter');
    }

    const parts = bboxParam.split(',').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) {
        return error('bad bbox');
    }

    const [west, south, east, north] = parts;
    const now = Math.floor(Date.now() / 1000);

    try {
        const { results } = await listActive(context.env.DB, west, south, east, north, now);
        return json(results);
    } catch (err) {
        console.error('Database error:', err);
        return error('Failed to fetch reports', 500);
    }
}

export async function onRequestPost(context) {
    const deviceId = context.request.headers.get('X-Device-Id');
    if (!deviceId) {
        return error('Missing device ID', 400);
    }

    let body;
    try {
        body = await context.request.json();
    } catch (e) {
        return error('Invalid JSON', 400);
    }

    const { lat, lng, type, passable, note, other_text } = body;

    if (!TYPES.includes(type)) {
        return error('Invalid report type', 400);
    }

    if (passable !== 0 && passable !== 1) {
        return error('Passable must be 0 or 1', 400);
    }

    if (note && note.length > NOTE_MAX) {
        return error('Note is too long', 400);
    }

    if (type === 'other' && (!other_text || other_text.trim() === '')) {
        return error('Other text is required when type is other', 400);
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (EXPIRY_HOURS[type] || 48) * 3600;

    const report = {
        id,
        deviceId,
        lat: lat || 30.4213,
        lng: lng || -87.2169,
        locationKind: 'section',
        sectionKey: 'raw:' + id,
        geometry: JSON.stringify({ type: 'Point', coordinates: [lng || -87.2169, lat || 30.4213] }),
        streetLabel: 'Unknown street',
        roadClass: 'residential',
        type,
        otherText: other_text || null,
        passable,
        onSite: 0,
        photoKey: null,
        note: note || null,
        status: 'active',
        createdAt: now,
        expiresAt
    };

    try {
        await insertReport(context.env.DB, report);
        return json({ success: true, id });
    } catch (err) {
        console.error('Insert error:', err);
        return error('Failed to save report', 500);
    }
}