DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS reports;

CREATE TABLE reports (
  id            TEXT PRIMARY KEY,
  device_id     TEXT NOT NULL,
  lat           REAL NOT NULL,
  lng           REAL NOT NULL,
  location_kind TEXT NOT NULL CHECK (location_kind IN ('section','intersection')),
  section_key   TEXT NOT NULL,
  geometry      TEXT NOT NULL,
  street_label  TEXT NOT NULL,
  road_class    TEXT,
  type          TEXT NOT NULL CHECK (type IN ('tree','flood','power_line','debris','other')),
  other_text    TEXT,
  passable      INTEGER NOT NULL CHECK (passable IN (0,1)),
  on_site       INTEGER NOT NULL DEFAULT 0,
  photo_key     TEXT,
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','cleared','retracted','expired')),
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER NOT NULL
);
CREATE INDEX idx_reports_active  ON reports(status, expires_at);
CREATE INDEX idx_reports_section ON reports(section_key, status);
CREATE INDEX idx_reports_latlng  ON reports(lat, lng);

CREATE TABLE votes (
  id         TEXT PRIMARY KEY,
  report_id  TEXT NOT NULL REFERENCES reports(id),
  device_id  TEXT NOT NULL,
  vote       TEXT NOT NULL CHECK (vote IN ('still_there','cleared')),
  created_at INTEGER NOT NULL,
  UNIQUE (report_id, device_id)
);

CREATE TABLE photos (
  key        TEXT PRIMARY KEY,          -- e.g. '<report id>.jpg'
  report_id  TEXT NOT NULL REFERENCES reports(id),
  data       BLOB NOT NULL,             -- the JPEG bytes, kept under 1 MB
  created_at INTEGER NOT NULL
);