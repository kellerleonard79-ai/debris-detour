INSERT INTO reports (id, device_id, lat, lng, location_kind, section_key, geometry,
  street_label, road_class, type, other_text, passable, on_site, photo_key, note,
  status, created_at, expires_at)
VALUES ('test-1', 'test-device-a', 30.4381, -87.2009, 'section', 'test:1',
  '{"type":"Point","coordinates":[-87.2009,30.4381]}',
  '12th Ave near Gonzalez St', 'tertiary', 'tree', NULL, 0, 1, NULL,
  'Large oak across both lanes', 'active',
  CAST(strftime('%s','now') AS INTEGER),
  CAST(strftime('%s','now') AS INTEGER) + 432000);

  INSERT INTO reports (id, device_id, lat, lng, location_kind, section_key, geometry,
  street_label, road_class, type, other_text, passable, on_site, photo_key, note,
  status, created_at, expires_at)
VALUES ('test-2', 'test-device-b', 30.4213, -87.2169, 'section', 'test:2',
  '{"type":"Point","coordinates":[-87.2169,30.4213]}',
  'Palafox St near Main St', 'secondary', 'flood', NULL, 1, 0, NULL,
  'Water over the curb, slow down', 'active',
  CAST(strftime('%s','now') AS INTEGER),
  CAST(strftime('%s','now') AS INTEGER) + 86400);

    INSERT INTO reports (id, device_id, lat, lng, location_kind, section_key, geometry,
  street_label, road_class, type, other_text, passable, on_site, photo_key, note,
  status, created_at, expires_at)
VALUES ('test-3', 'test-device-c', 31.0, -87.0, 'section', 'test:3',
  '{"type":"Point","coordinates":[-87.0,31.0]}',
  '12th St', 'tertiary', 'tree', NULL, 1, 0, NULL,
  NULL, 'active',
  CAST(strftime('%s','now') AS INTEGER),
  CAST(strftime('%s','now') AS INTEGER) + 86400);