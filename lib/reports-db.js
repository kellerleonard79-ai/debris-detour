// lib/reports-db.js

export async function listActive(db, deviceId, west, south, east, north, now) {
    const sql = `
        SELECT 
            r.*,
            (r.device_id = ?) AS is_mine,
            EXISTS (
                SELECT 1 FROM votes v
                WHERE v.report_id = r.id AND v.vote = 'still_there' AND v.device_id != r.device_id
            ) AS verified,
            (SELECT COUNT(*) FROM votes v WHERE v.report_id = r.id AND v.vote = 'still_there') AS still_there_count,
            (SELECT COUNT(*) FROM votes v WHERE v.report_id = r.id AND v.vote = 'cleared') AS cleared_count
        FROM reports r
        WHERE r.status = 'active' 
          AND r.expires_at > ? 
          AND r.lng >= ? AND r.lng <= ? 
          AND r.lat >= ? AND r.lat <= ?
    `;
    return await db.prepare(sql).bind(deviceId, now, west, east, south, north).all();
}

export async function insertReport(db, r) {
    const sql = `
        INSERT INTO reports (
            id, device_id, lat, lng, location_kind, section_key, 
            geometry, street_label, road_class, type, other_text, 
            passable, on_site, photo_key, note, status, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await db.prepare(sql).bind(
        r.id, r.deviceId, r.lat, r.lng, r.locationKind, r.sectionKey,
        r.geometry, r.streetLabel, r.roadClass, r.type, r.otherText,
        r.passable, r.onSite, r.photoKey, r.note, r.status, r.createdAt, r.expiresAt
    ).run();
}