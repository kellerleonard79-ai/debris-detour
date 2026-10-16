Debris Detour — Build Plan
Hard deadline: Monday, October 26, 2026, 12:00 PM Eastern (11:00 AM Central). That's when the Congressional App Challenge closes, and it needs source code and a demo video (source). Confirm it on your district's page. Work through this plan top to bottom.
This plan gives exact commands, websites, file names, and the config files you'll need. For the app's code files, it describes what each one has to do instead of writing the code, so the code itself is your team's work. Bring finished code back here for review.
1. Accounts and websites
Create these accounts first. Use one shared team email for Cloudflare and OpenRouteService, so every teammate can log in.
Site
What it's for
What to do there
github.com
Code storage and sharing
Each teammate makes an account. Keller creates the repo (section 3) and adds the others under Settings → Collaborators
dash.cloudflare.com
Hosting, database, photos, spam check
One team account on the free plan. This project never needs a card
openrouteservice.org/plans
Routing and address search
Sign up, then create a free Standard key under Dashboard → Tokens. It allows 2,000 directions and 1,000 autocomplete searches a day (plans)
overpass-turbo.eu
Testing OpenStreetMap road queries
No account needed. Use it to practice the snap query in section 9
openstreetmap.org
Checking road data
No account needed. Click a road, then "Query features" to see its highway class
congressionalappchallenge.us
Contest registration and submission
Register every teammate now; don't wait until the end
youtube.com
Hosting the demo video
Use an account you can upload an unlisted video to
2. Install tools (every teammate's computer)
1. Node.js. Go to nodejs.org, download the LTS installer, and run it with the default options.
2. Git.
    ◦ Windows: download from git-scm.com and use the defaults. On the "default editor" screen, pick VS Code.
    ◦ Mac: open Terminal and run xcode-select --install.
3. VS Code. Download from code.visualstudio.com. Then open the Extensions panel (Ctrl+Shift+X, or Cmd+Shift+X on Mac) and install:
    ◦ Prettier (code formatting)
    ◦ ESLint (catches mistakes)
    ◦ SQLite Viewer (lets you look inside the local database)
4. Check everything installed. Open a new terminal: on Windows, use Terminal or Git Bash; on Mac, use Terminal. Then run:
node -v      # should print v22 or higher
npm -v       # should print a version number
git --version
5. Tell Git who you are (once per computer):
git config --global user.name "Your Name"
git config --global user.email "the-email-on-your-github-account"
[ ] All three teammates' version checks print numbers.
3. Create the project and the GitHub repo
One person does this once; everyone else clones it at the end. On Windows, run these commands in Git Bash so they work exactly as written.
3a. Make the folder and install Wrangler (Cloudflare's command-line tool):
mkdir debris-detour && cd debris-detour
git init -b main
npm init -y
npm install --save-dev wrangler
mkdir -p public/css public/js public/img functions/api lib
code .
Turf (the map-math library) loads in the browser from a CDN, so the server doesn't need it. If you already ran npm install @turf/turf, undo it with npm uninstall @turf/turf.
3b. Create .gitignore in the project root. It keeps secrets and junk out of GitHub:
node_modules/
.wrangler/
.dev.vars
.DS_Store
3c. Add scripts to package.json. Replace its "scripts" block with:
"scripts": {
  "dev": "wrangler pages dev",
  "db:local": "wrangler d1 execute debris-detour-db --local --file=./schema.sql",
  "db:remote": "wrangler d1 execute debris-detour-db --remote --file=./schema.sql",
  "seed:local": "wrangler d1 execute debris-detour-db --local --file=./seed.sql",
  "seed:remote": "wrangler d1 execute debris-detour-db --remote --file=./seed.sql"
}
3d. Log Wrangler into Cloudflare. This opens a browser; click Allow.
npx wrangler login
npx wrangler whoami   # should show the team account
3e. Put it on GitHub.
1. Go to github.com/new. Name the repo debris-detour and make it Private. Do not turn on GitHub's "Add README" or ".gitignore template" options. You already have a .gitignore locally, and GitHub's copy would block your first push. Then click Create.
2. Back in the terminal, run these commands. Replace YOUR-USERNAME with your GitHub username.
git add .
git commit -m "Project setup"
git remote add origin https://github.com/YOUR-USERNAME/debris-detour.git
git push -u origin main
3. On GitHub, go to the repo's Settings → Collaborators and invite both teammates.
4. Each teammate runs:
git clone https://github.com/YOUR-USERNAME/debris-detour.git
cd debris-detour
npm install
npx wrangler login
[ ] Repo is on GitHub, and all three teammates have it cloned.
4. Set up Cloudflare resources and keys
4a. Create the database.
npx wrangler d1 create debris-detour-db
Copy the database_id it prints.
4b. Skip R2. Photos are stored in the D1 database instead (section 12), so you don't need R2 or a card on file.
4c. Create wrangler.toml in the project root. Paste your database ID in the marked spot. Set compatibility_date to the day you create the file; if Wrangler warns about it, use the date it suggests.
name = "debris-detour"
compatibility_date = "2026-10-16"
pages_build_output_dir = "./public"

[[d1_databases]]
binding = "DB"
database_name = "debris-detour-db"
database_id = "PASTE-DATABASE-ID-HERE"
In your server code, the database is then context.env.DB.
4d. Create schema.sql in the project root. Running it again wipes and rebuilds the tables, which is handy while you're developing.
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
Apply it to both copies of the database, then check the tables exist:
npm run db:local
npm run db:remote
npx wrangler d1 execute debris-detour-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"
4e. Get the Turnstile keys.
1. In the Cloudflare dashboard, go to Turnstile → Add widget.
2. Name it Debris Detour, and add the hostnames localhost and debris-detour.pages.dev. Set the mode to Managed, then click Create.
3. Save the site key (public, goes in the HTML) and the secret key (private).
4. For local testing, use Cloudflare's test keys, which always pass:
    ◦ site key: 1x00000000000000000000AA
    ◦ secret: 1x0000000000000000000000000000000AA
4f. Get the OpenRouteService key. In the OpenRouteService dashboard, copy your Standard token.
4g. Create .dev.vars in the project root. This holds the local secrets, and .gitignore keeps it out of GitHub. Send it to teammates by private message, never through the repo.
ORS_API_KEY=paste-your-openrouteservice-key
TURNSTILE_SECRET=1x0000000000000000000000000000000AA
[x] npx wrangler d1 execute lists the reports and votes tables.
[x] Every teammate has .dev.vars on their computer.
5. File map
This is every file the finished project will have. Create each one when the step that needs it comes up.
• Files in functions/ automatically become API routes: functions/api/snap.js answers /api/snap.
• Files in lib/ hold shared server code that the routes import.
• Files in public/ are the website itself.
debris-detour/
├── .gitignore
├── .dev.vars                 local secrets (never committed)
├── package.json
├── wrangler.toml
├── schema.sql
├── seed.sql                  backup of demo reports
├── README.md
├── lib/                      server helpers — small and fast, no libraries
│   ├── rules.js              constants: types, expiry hours, major road classes, distances
│   ├── respond.js            json() and error() response helpers
│   ├── reports-db.js         all SQL for reports, votes, photos
│   ├── geo.js                haversine distance + geometry checks
│   └── turnstile.js          verifies a Turnstile token
├── functions/api/
│   ├── reports/index.js      GET list, POST create
│   ├── reports/[id]/vote.js  POST vote
│   ├── reports/[id]/retract.js POST retract
│   ├── photos/[key].js       GET a photo from D1
│   ├── geocode.js            GET address search (OpenRouteService proxy)
│   └── route.js              POST check avoid zones + forward to OpenRouteService
└── public/
    ├── index.html
    ├── css/styles.css
    ├── img/                  tree.svg, flood.svg, power-line.svg, debris.svg, other.svg
    └── js/
        ├── main.js           startup: wires every module together
        ├── config.js         Turnstile site key
        ├── device.js         creates / reads the device ID
        ├── settings.js       settings storage + settings screen
        ├── api.js            one fetch function per endpoint + retry helper
        ├── map.js            Leaflet map, markers, refresh loop
        ├── snap.js           Overpass query + street section finder (heavy work, runs on the phone)
        ├── avoid.js          shouldAvoid, toPolygon, buildAvoidZones (runs on the phone)
        ├── report.js         the report bottom sheet
        ├── detail.js         report detail sheet, votes, retract
        ├── photo.js          resize + re-encode photos
        └── navigate.js       search, route preview, live navigation
Why the heavy work is in the browser: Cloudflare's free plan gives each server request only 10 ms of computing time. Snapping and avoid-zone geometry are the expensive parts, so they run on the phone, which has plenty of power. The server only does fast checks and database work.
Libraries loaded in index.html (no installs needed for the browser side):
• Leaflet CSS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.css
• Leaflet JS: https://unpkg.com/leaflet@1.9.4/dist/leaflet.js
• Turf: https://cdn.jsdelivr.net/npm/@turf/turf@7/turf.min.js
• Turnstile: https://challenges.cloudflare.com/turnstile/v0/api.js
Your own scripts load as one module: <script type="module" src="js/main.js"></script>. Each JS file then uses export and import. Turf is a global turf object in the browser, from the CDN link above. Server files in lib/ and functions/ use no outside libraries; keeping them small keeps them under the free plan's time limit.
6. Build: map shell
Goal: a full-screen map that opens on your location, with the main buttons in place.
Create public/index.html:
• In <head>:
    ◦ <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    ◦ the page title "Debris Detour"
    ◦ the Leaflet CSS link
    ◦ css/styles.css
• In <body>:
    ◦ <div id="map"></div>
    ◦ a top bar with <input id="search" placeholder="Where to?"> and <button id="settings-btn">
    ◦ a large <button id="report-btn">Report</button> at the bottom
    ◦ empty containers to fill later: <div id="sheet"> (the bottom sheet), <div id="nav-banner">, and <div id="toast">
• At the end of <body>: the Leaflet, Turf, and Turnstile scripts, then js/main.js as a module.
Create public/css/styles.css:
• Make html, body, and #map 100% height with no margin.
• Position the top bar and the Report button over the map with position: fixed.
• Make every button at least 56 px tall with text 18 px or larger, for gloves and bright sun.
• Use one high-contrast accent color for the Report button. Keep everything else neutral.
• Create a #sheet that slides up from the bottom, using transform: translateY(100%) and a .open class that moves it to 0.
Create public/js/device.js:
• Export getDeviceId(). It reads localStorage['dd_device_id'].
• If the ID is missing, it makes one with crypto.randomUUID() and saves it.
• Wrap the storage calls in try/catch, and fall back to an in-memory ID if storage is blocked.
Create public/js/map.js:
• Export initMap():
    1. Create the map with L.map('map'). Start it at Pensacola (30.4213, -87.2169), zoom 12.
    2. Add the OpenStreetMap tile layer:
        ▪ URL: https://tile.openstreetmap.org/{z}/{x}/{y}.png
        ▪ maxZoom: 19
        ▪ attribution: &copy; OpenStreetMap contributors
    3. Call navigator.geolocation.getCurrentPosition. On success, zoom to the user (zoom 16) and draw a blue "you are here" L.circleMarker. On error, stay on Pensacola.
• Export the map object, so other modules can add layers to it.
Create public/js/main.js: it imports initMap and getDeviceId, then calls them when the page loads.
Run it:
npm run dev
Open http://localhost:8788 and allow location access.
[ ] The map fills the screen and zooms to your location.
[ ] The Report button, search bar, and settings gear are visible and easy to tap.
[ ] Commit and push: git add . && git commit -m "Map shell" && git push
7. Build: basic reporting
Goal: drop a pin, pick a type and passability, submit, and see the marker on the map. Street snapping comes in section 9; for now the raw point is saved.
Create lib/rules.js. These are shared constants; use them everywhere instead of typing the numbers into other files.
• TYPES = ['tree','flood','power_line','debris','other']
• EXPIRY_HOURS = { flood: 24, debris: 48, other: 48, tree: 120, power_line: 120 }
• MAX_LIFE_HOURS = 168
• MAJOR_CLASSES = motorway, trunk, primary, secondary, tertiary, plus each one's _link version
• Distances and limits:
    ◦ ON_SITE_METERS = 150
    ◦ SNAP_SEARCH_METERS = 30
    ◦ INTERSECTION_SNAP_METERS = 25
    ◦ NOTE_MAX = 200
    ◦ CLEAR_VOTES_NEEDED = 2
    ◦ REPORTS_PER_HOUR = 10
Create lib/respond.js:
• json(data, status = 200) returns new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } }).
• error(message, status = 400) returns json({ error: message }, status).
Create lib/reports-db.js. All the SQL lives here. Always use ? placeholders with .bind(...), never string-joined SQL, which blocks SQL injection.
• listActive(db, west, south, east, north, now): selects reports where status='active' AND expires_at > ? and the lat/lng fall inside the box. Call it with db.prepare(sql).bind(...).all(), which returns { results }.
• insertReport(db, r): inserts one row.
Create functions/api/reports/index.js:
• export async function onRequestGet(context):
    1. Read bbox from new URL(context.request.url).searchParams.
    2. Split it into 4 numbers. If any is invalid, return error('bad bbox').
    3. Return json(results).
• export async function onRequestPost(context). For now it reads JSON: { lat, lng, type, passable, note, other_text }.
    ◦ Get the device ID from the X-Device-Id header. Reject the request if it's missing.
    ◦ Validate the fields:
        ▪ type must be in TYPES
        ▪ passable must be 0 or 1
        ▪ note can't be longer than NOTE_MAX
        ▪ other_text is required when type === 'other'
    ◦ Fill in the rest of the row:
        ▪ id = crypto.randomUUID()
        ▪ created_at = Math.floor(Date.now() / 1000)
        ▪ expires_at = created_at + EXPIRY_HOURS[type] * 3600
    ◦ Temporary values until section 9: section_key = 'raw:' + id, location_kind = 'section', geometry = a GeoJSON Point string, street_label = 'Unknown street'.
Create public/js/api.js:
• A headers() helper that always adds X-Device-Id.
• getReports(bboxString) fetches /api/reports?bbox=....
• createReport(data) POSTs to /api/reports.
Add to public/js/map.js:
• loadReports():
    1. Fetch reports for map.getBounds().toBBoxString().
    2. Clear an L.layerGroup.
    3. Add one L.marker per report, using an L.divIcon that shows the type icon with a red border for impassable or amber for passable.
• Call loadReports() on map.on('moveend'), and also with setInterval(loadReports, 30000).
Create the type icons in public/img/: tree.svg, flood.svg, power-line.svg, debris.svg, other.svg. Keep them simple and bold, so they're readable at 32 px.
Create public/js/report.js. Export openReportSheet(), which fills #sheet and adds .open:
1. Place a draggable L.marker at the user's GPS position (or the map center, if GPS isn't available).
2. Show five big type buttons. Picking "Other" reveals a required text box.
3. Show two big passability buttons: Impassable and Passable with caution.
4. Add a note box with maxlength="200".
5. Submit calls createReport, closes the sheet, reloads the markers, and shows the toast "Report submitted."
In main.js, connect #report-btn to openReportSheet().
Test it. Submit three reports, then check that they're in the database:
npx wrangler d1 execute debris-detour-db --local --command "SELECT id, type, passable, street_label FROM reports"
[ ] Reports appear as colored markers and survive a page refresh.
[ ] A bad request (no type, or a 300-character note) gets a 400 error.
[ ] Commit and push.
8. Build: routing spike
Goal: search an address, draw a route, and prove that a hard-coded avoid zone actually bends the route. Do this before anything else gets complicated, because routing is the riskiest piece.
Know the limits (free Standard plan, per OpenRouteService):
• The whole set of avoid zones must fit within 20 km wide or tall and 200 km² in area.
• Routes that use avoid zones max out at 150 km.
• The daily caps are 2,000 directions and 1,000 autocomplete searches.
Within a county, this is plenty.
Create functions/api/geocode.js:
• onRequestGet reads q, lat, and lng. If q is shorter than 3 characters, it returns [].
• It fetches https://api.openrouteservice.org/geocode/autocomplete, passing api_key=context.env.ORS_API_KEY, text=q, focus.point.lat, and focus.point.lon. Build the URL with URLSearchParams.
• It returns a short list: [{ label, lat, lng }], taken from each feature's properties.label and geometry.coordinates. Note that GeoJSON coordinates are [lng, lat].
Create functions/api/route.js:
1. onRequestPost reads { start: {lat,lng}, end: {lat,lng}, settings }.
2. For the spike only: build one hard-coded avoid polygon, a small square about 30 m across around a point on a street you pick in Pensacola.
3. POST to https://api.openrouteservice.org/v2/directions/driving-car/geojson with these headers:
    ◦ Authorization: <ORS_API_KEY>
    ◦ Content-Type: application/json
4. Use this body:
{
  "coordinates": [[startLng, startLat], [endLng, endLat]],
  "instructions": true,
  "units": "m",
  "options": { "avoid_polygons": { "type": "MultiPolygon", "coordinates": [ ... ] } }
}
5. From the response's features[0], return:
    ◦ geometry: the route line
    ◦ properties.summary: distance in meters, duration in seconds
    ◦ properties.segments[0].steps: each step has an instruction, a distance, and way_points
6. If OpenRouteService returns an error, pass back error('No route found', 502).
Add to public/js/api.js: geocode(q, lat, lng) and getRoute(start, end, settings).
Create public/js/navigate.js (part 1):
• Search: typing in #search waits 300 ms after the last keystroke, then calls geocode and shows the results as a list under the bar.
• Picking a result:
    1. Call getRoute from the user's position to the chosen address.
    2. Draw the route with L.geoJSON(geometry, { style: { weight: 7 } }) and fit the map to it.
    3. Show a preview card with the minutes (Math.round(duration / 60)), the miles (distance / 1609.34), a Start button (wired up in section 13), and a Cancel button.
Test it:
1. Route between two points with the hard-coded zone turned off, then on.
2. Draw the zone itself on the map with L.geoJSON, so you can see that the route goes around it.
3. Repeat with a zone on a road that has no easy detour, and confirm you get a longer route or a clear error, not a crash.
[ ] Address search returns Pensacola results first.
[ ] The route visibly changes when the avoid zone is turned on.
[ ] The API key never appears in the browser's Network tab.
[ ] Commit and push.
9. Build: street snapping and duplicate check
Goal: every pin snaps to a real street section or intersection, gets a readable label like "12th Ave between Gonzalez St and Mallory St," and triggers the duplicate pop-up when that section already has a report.
9a. Practice the query in Overpass Turbo first. Go to overpass-turbo.eu, paste the query below, replace LAT,LNG with a Pensacola point (for example 30.4380,-87.2010), and click Run. Then switch to the Data tab and look at what comes back:
• each way has an id, a nodes array of node IDs, a geometry array of {lat, lon}, and tags (highway, name)
• nodes[i] and geometry[i] describe the same point
[out:json][timeout:25];
way(around:300,LAT,LNG)["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link)$"];
out body geom;
Service roads (driveways and parking lots) are left out on purpose, so they don't chop a street into tiny sections.
9b. Create public/js/snap.js. This runs in the browser, not on the server. Export async snapPoint(lat, lng), which does the following:
1. Check the cache first. Keep a Map of Overpass results, keyed by the point rounded to 3 decimal places (about 110 m). Dragging the pin around one block then reuses one lookup instead of making a new one every time.
2. Fetch the roads. POST the query to https://overpass-api.de/api/interpreter:
    ◦ body: 'data=' + encodeURIComponent(query)
    ◦ header Content-Type: application/x-www-form-urlencoded
    ◦ use an AbortController to give up after 8 seconds
    ◦ if it times out or returns 429 or 504, retry once on a backup server. Pick one from "Public Overpass API instances" at wiki.openstreetmap.org/wiki/Overpass_API, and keep its URL in a constant OVERPASS_BACKUP.
3. Find the intersections.
    ◦ Build a map from each node ID to the ways that use it.
    ◦ A node is an intersection if 3 or more ways touch it, or if the ways touching it have 2 or more different name tags.
    ◦ A node shared by 2 ways with the same name is just OpenStreetMap splitting one street, so it doesn't count.
4. Find the closest road. For each way, build turf.lineString from its geometry (as [lon, lat]) and run turf.nearestPointOnLine(line, point, { units: 'meters' }).
    ◦ Keep the way with the smallest properties.dist.
    ◦ If that's more than 30 m, return { found: false }.
5. Intersection check. If an intersection node on that way is within 25 m of the pin (use turf.distance), return intersection mode:
    ◦ section_key = 'node:' + nodeId
    ◦ geometry = a Point
    ◦ street_label = 'Intersection of A and B', using the names of the ways at that node
6. Otherwise, walk the section.
    ◦ Start from properties.index, the segment the pin landed on.
    ◦ Walk backward through nodes until you hit an intersection or index 0, then forward until you hit an intersection or the last node.
    ◦ geometry = the LineString of the geometry between those two indexes.
    ◦ section_key = wayId + ':' + startNodeId + ':' + endNodeId
    ◦ street_label = "<name> between <cross street at start> and <cross street at end>". Use "dead end" or "unnamed road" when there's no cross street.
7. Return { found: true, location_kind, section_key, geometry, street_label, road_class: tags.highway, photo_required, snapped: { lat, lng } }. If both Overpass servers failed, return { error: true } instead.
Known simplification: if OpenStreetMap splits a street in the middle of a block, the section ends at that split. That's fine for this version.
9c. Duplicate check in the browser. map.js already holds the active reports in view, from loadReports(). After snapping, look for one with the same section_key; if there is one, that's existing. There's no /api/snap endpoint. The server repeats the duplicate check when the report arrives (9d).
9d. Update POST /api/reports.
• The browser now sends lat, lng (the snapped point), location_kind, section_key, geometry (GeoJSON as a string), street_label, road_class, and confirmed_separate.
• Create lib/geo.js with fast checks and no libraries:
    ◦ haversineMeters(lat1, lng1, lat2, lng2), the standard 10-line formula
    ◦ pointToSegmentMeters(...): convert degrees to meters around the pin (x = (lng − lng0) × 111320 × cos(lat0), y = (lat − lat0) × 110540), then use the usual point-to-segment formula
    ◦ validateLocation(body) rejects the report unless all of these are true:
        ▪ geometry parses as a LineString (for a section) or a Point (for an intersection)
        ▪ it has at most 200 coordinates, all valid numbers
        ▪ the pin is within 30 m of it
        ▪ section_key matches /^\d+:\d+:\d+$/ or /^node:\d+$/
        ▪ road_class is a real road class
        ▪ street_label is at most 120 characters
• Work out photo_required on the server from road_class and MAJOR_CLASSES. Never trust the browser's value.
• Save the location fields.
• Duplicate rule: use findActiveBySection in lib/reports-db.js. Without confirmed_separate: true, if an active report already exists on that section, return error('duplicate', 409) with the existing report's ID.
• Known limit: someone technical could send a made-up road shape near a real spot. Turnstile, rate limits, community votes, and the 30 m check keep this small. List it in the submission.
9e. Update public/js/report.js.
• When the pin first appears and on every dragend:
    1. Show "Finding street…" and call snapPoint from snap.js.
    2. Move the pin to snapped.
    3. Draw the section (or intersection) in orange with L.geoJSON.
    4. Show street_label at the top of the sheet.
• If found is false, show "Move the pin onto a road" and disable Submit.
• If error is true, show "Couldn't look up the street. Tap to retry," and keep everything already entered in the form.
• If existing is set, show the pop-up:
  Someone already reported an obstruction on this section. Is this a different obstruction? [Yes, it's different] [No, confirm theirs] [Cancel]
    ◦ Yes sends confirmed_separate: true.
    ◦ No will call the vote endpoint from section 11. Until then, it just closes the sheet.
• If photo_required is true, mark the photo field Required. It's wired up in section 12.
[ ] Pins snap to the road and show the right label on 5 different Pensacola streets, including dense downtown blocks.
[ ] A pin dropped near an intersection snaps to the intersection.
[ ] A second report on the same section triggers the pop-up, and the API returns 409 if the pop-up is skipped.
[ ] With DevTools → Network → Offline while dragging, the retry message appears and the form keeps its contents.
[ ] Check 9th Ave, 12th Ave, 17th Ave, and Cervantes St: does photo_required come back true? If not, note their highway class for an exceptions list in rules.js.
[ ] Commit and push.
10. Build: avoid zones from real reports and settings
Goal: routes avoid real reports according to the user's settings, and the hard-coded zone from section 8 is gone.
10a. Add verified to listActive in lib/reports-db.js. Add this to the SELECT:
(r.on_site = 1 OR EXISTS (
   SELECT 1 FROM votes v
   WHERE v.report_id = r.id AND v.vote = 'still_there' AND v.device_id != r.device_id
)) AS verified
10b. Create public/js/avoid.js (runs in the browser and uses the global turf):
• shouldAvoid(report, settings) returns true only if all four are true:
    1. settings.avoidTypes[report.type]
    2. report.passable === 0 || settings.avoidPassable
    3. report.verified || settings.cautious
    4. the report is active, which listActive already guarantees
• toPolygon(report):
    ◦ for a section, turf.buffer(JSON.parse(report.geometry), 10, { units: 'meters' })
    ◦ for an intersection, turf.circle([lng, lat], 20, { units: 'meters', steps: 16 })
• buildAvoidZones(reports, start, end, settings):
    1. Keep only the reports that pass shouldAvoid.
    2. Sort them by distance to the straight line from start to end (turf.pointToLineDistance).
    3. Add polygons one at a time, checking turf.bbox of everything so far. Stop before the box gets wider or taller than 19 km.
    4. Return { zones: { type: 'MultiPolygon', coordinates: [...] }, ids: [...] }, or zones: null if nothing needs avoiding. If turf.buffer returns a MultiPolygon, add each of its parts.
• Section 13 reuses toPolygon and shouldAvoid for the new-obstruction check.
10c. Update functions/api/route.js:
1. Delete the hard-coded square.
2. It now reads { start, end, zones }. The browser builds the zones, and the server only checks and forwards them.
3. Run fast checks with helpers in lib/geo.js:
    ◦ zones is null or a MultiPolygon with at most 100 polygons and 5,000 coordinates in total
    ◦ loop over the coordinates to find the min and max lat and lng, then use haversineMeters to reject the zones if that box is wider or taller than 20 km
4. Forward the request to OpenRouteService as in section 8. If zones is null, leave out options.
5. In navigate.js, before every getRoute:
    1. Fetch the reports in a box around start and end, padded by 3 km, with getReports.
    2. Run buildAvoidZones(reports, start, end, loadSettings()).
    3. Send zones in getRoute(start, end, zones).
    4. Keep ids as avoidedIds for the preview card and for section 13.
10d. Create public/js/settings.js:
• DEFAULTS = { avoidTypes: { tree: true, flood: true, power_line: true, debris: true, other: true }, avoidPassable: true, cautious: false }
• loadSettings() and saveSettings(s) use localStorage['dd_settings'], wrapped in try/catch. If storage fails, fall back to DEFAULTS.
• openSettings() fills #sheet with large toggle rows:
    ◦ Avoid: one row per type (Fallen trees, Flooding, Power lines down, Debris, Other)
    ◦ Avoid passable obstructions
    ◦ Cautious Navigation, with the subtitle "Also avoid reports no one has confirmed yet"
• Turning Flooding off shows a confirm dialog: "Driving into floodwater is the leading cause of flood deaths. Turn off flood avoidance anyway?"
• If a route is on screen when settings change, request the route again.
In main.js, connect #settings-btn to openSettings().
10e. Show sections on the map. In loadReports(), also draw each report's geometry as a thick line, red for impassable and amber for passable, so people can see exactly which stretch is blocked. In the route preview card, show "Routing around N reported obstructions."
[ ] An impassable report on your test route makes the route detour.
[ ] Turning that type off in Settings brings the original route back.
[ ] An unverified report (remote, no votes) is avoided only when Cautious Navigation is on.
[ ] Settings survive a page refresh.
[ ] Commit and push.
11. Build: report detail, votes, retraction, expiry
Goal: tap a marker to see the report, vote "Still there" or "Cleared," retract your own report, and watch reports expire on schedule.
11a. Update listActive so it also returns:
• still_there_count and cleared_count (subqueries on votes)
• is_mine (r.device_id = ?, using the requester's device ID)
Never send device_id itself to the browser. It works like a password for retracting.
At the top of onRequestGet in reports/index.js, run one cleanup statement:
UPDATE reports SET status = 'expired' WHERE status = 'active' AND expires_at <= ?
11b. Create functions/api/reports/[id]/vote.js. In onRequestPost, the report ID is context.params.id.
1. Read the X-Device-Id header and { vote }. Reject any vote other than still_there or cleared.
2. Load the report. Reject the vote if the report isn't active or has expired, or if the voter is the reporter (403; they can retract instead).
3. Save the vote with an upsert, so people can change their vote:
INSERT INTO votes (id, report_id, device_id, vote, created_at) VALUES (?, ?, ?, ?, ?)
ON CONFLICT(report_id, device_id) DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at
4. If the vote is still_there, set expires_at = MIN(now + EXPIRY_HOURS[type] * 3600, created_at + MAX_LIFE_HOURS * 3600).
5. If the vote is cleared, count the cleared votes. At CLEAR_VOTES_NEEDED or more, set status = 'cleared'.
6. Return the updated counts.
11c. Create functions/api/reports/[id]/retract.js:
• Run UPDATE reports SET status = 'retracted' WHERE id = ? AND device_id = ? AND status = 'active'.
• If result.meta.changes !== 1, return 403.
11d. Add to api.js: vote(id, vote) and retract(id).
11e. Create public/js/detail.js. Export openDetail(report); each marker's click calls it. It fills #sheet with:
• Header: the type icon and name, plus the "other" description if there is one.
• Status: a passability badge (red Impassable or amber Passable), the street label, and a relative time like "Reported 2 h ago" (write a small timeAgo(seconds) helper).
• Trust badges: "On-site" if on_site, and "Verified" if verified.
• Content: the photo, if any (section 12), the note, and the vote counts: "3 say still there · 1 says cleared."
• Buttons:
    ◦ Still there and Cleared. Remember which reports this device voted on in localStorage['dd_votes'], and show the user's current choice.
    ◦ Retract my report, only when is_mine is true.
• After any action: reload the markers and show a toast.
Also wire the duplicate pop-up's No, confirm theirs button (section 9) to vote(existing.id, 'still_there').
Testing tip: a private or incognito window has separate storage, so it acts as a second device. Use it to test the two-vote clear rule. To test expiry without waiting, run:
npx wrangler d1 execute debris-detour-db --local --command "UPDATE reports SET expires_at = 0 WHERE id = 'PASTE-ID'"
[ ] Two "Cleared" votes from two windows remove the report; one doesn't.
[ ] "Still there" pushes expires_at later, but never past 7 days from the original report.
[ ] Retract shows only on the reporter's device and removes the report.
[ ] A report whose expires_at has passed disappears from the map.
[ ] Commit and push.
12. Build: photos
Goal: one optional photo per report, required on major roads, resized and stripped of location data before upload.
12a. Create public/js/photo.js. Export async preparePhoto(file):
1. Load the image with createImageBitmap(file, { imageOrientation: 'from-image' }), so phone photos aren't sideways.
2. Scale it so the longest side is at most 1280 px.
3. Draw it onto a <canvas>.
4. Return a JPEG with canvas.toBlob(resolve, 'image/jpeg', 0.7) (wrap it in a Promise).
Re-drawing the image throws away all of its hidden data (EXIF), including GPS. That's how location data gets stripped.
12b. Add the photo field to report.js:
• Use <input type="file" accept="image/*">. Leave out capture, so people can choose the camera or their photo library.
• Show a thumbnail after the photo is picked, plus a Remove button.
• If photo_required is true, label the field "Photo (required on major roads)" and disable Submit until a photo is added.
12c. Switch createReport in api.js to FormData. Append every field, then:
form.append('photo', blob, 'photo.jpg')
Don't set Content-Type yourself; the browser adds it.
12d. Update POST /api/reports:
1. Read the form with const form = await context.request.formData(). Get the photo with form.get('photo').
2. Validate everything else before uploading:
    ◦ if there's no photo but snap.photo_required is true, return error('A photo is required on major roads')
    ◦ the photo must be image/jpeg and at most 1 MB (a 1280 px photo at 0.7 quality is usually 150–250 KB)
3. Store the report and the photo together:
const key = id + '.jpg'
await db.batch([
  db.prepare('INSERT INTO reports (...) VALUES (...)').bind(/* ...all fields, photo_key = key */),
  db.prepare('INSERT INTO photos (key, report_id, data, created_at) VALUES (?, ?, ?, ?)')
    .bind(key, id, await photo.arrayBuffer(), now)
])
4. db.batch runs both inserts together, so you never end up with a report missing its photo or a photo missing its report. The report row goes first, because the photo row points at it. Without a photo, insert just the report.
12e. Create functions/api/photos/[key].js:
• Check that context.params.key matches /^[0-9a-f-]+\.jpg$/; otherwise return 404.
• Load it: const row = await context.env.DB.prepare('SELECT data FROM photos WHERE key = ?').bind(key).first(). If there's no row, return 404.
• D1 hands BLOB columns back as an array of numbers, so new Uint8Array(row.data) turns it back into image bytes:
return new Response(new Uint8Array(row.data), {
  headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=86400' }
})
• The cache-control header matters. It lets browsers and Cloudflare reuse the photo instead of reading it from D1 every time.
In detail.js, show <img src="/api/photos/{photo_key}"> when photo_key is set.
[ ] A photo shows up in the report detail.
[ ] Submitting on a major road without a photo is blocked, both in the UI and by the API.
[ ] Location data check: take a phone photo with location turned on, report with it, then download it from /api/photos/....
    ◦ Windows: right-click → Properties → Details shows no GPS section.
    ◦ Mac: open it in Preview, then Tools → Show Inspector shows no GPS tab.
[ ] Commit and push.
13. Build: live navigation
Goal: tap Start to get a turn banner, a map that follows the car, automatic rerouting, and a screen that stays awake.
Add to public/js/navigate.js (part 2):
13a. Starting and stopping.
• Start:
    ◦ Hide the search bar and the Report button, then show #nav-banner and an End button.
    ◦ Keep the screen awake: wakeLock = await navigator.wakeLock.request('screen'), inside try/catch.
    ◦ Request it again on document.visibilitychange when the page becomes visible, because phones release it when the app is hidden.
    ◦ Start tracking: watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }).
• End: call clearWatch(watchId) and wakeLock?.release(), remove the route, and restore the normal buttons.
13b. Following the car (onPosition).
• Move a car marker and map.panTo it at zoom 17.
• Off-route check: turf.pointToLineDistance(car, routeLine, { units: 'meters' }).
    ◦ Above 40 m, add one to offCount; otherwise reset it to 0.
    ◦ At 2, reroute from the car's position.
13c. Turn banner. OpenRouteService steps describe the move made at the start of each step.
• Each step's way_points[1] is the index in the route's coordinates where that step ends.
• While the car is on step i:
    ◦ The banner shows steps[i+1].instruction with the distance left to the end of step i.
    ◦ Format distances in feet under 0.1 mi, and in miles above that.
• When the car comes within 25 m of the end of step i, move on to i + 1.
• Within 30 m of the destination, show "You have arrived" and end navigation.
13d. New obstruction check. Every 30 seconds during navigation:
1. Get the rest of the route: turf.lineSlice(car, destination, routeLine).
2. Fetch the reports in that area (turf.bbox of the remaining line).
3. Keep only reports that pass the same four shouldAvoid rules (from avoid.js) and aren't already in avoided_ids.
4. For each one, build its zone with toPolygon from avoid.js, and test it with turf.booleanIntersects(zone, remainingLine).
5. Skip any report within 50 m of the car.
6. If one hits: show the toast "New obstruction ahead. Rerouting" and reroute.
13e. Protect your daily quota. Allow at most one reroute every 15 seconds. Keep a lastRerouteAt timestamp.
Testing without driving:
1. In Chrome, open DevTools (F12) → ⋮ → More tools → Sensors.
2. Set Location to a custom latitude/longitude, then change the coordinates step by step along the route to simulate moving.
3. Move the point off-route to trigger a reroute.
4. In another window, submit a report on the route ahead and wait up to 30 s.
The real-phone test comes after deploying (section 15), because phone GPS needs HTTPS. In a car, a passenger holds the phone; the driver never does.
[ ] The banner advances through turns in the simulated drive.
[ ] Going off route causes a reroute within about 2 GPS updates.
[ ] A new report on the route ahead causes a reroute and the toast.
[ ] The screen stays on during navigation.
[ ] Commit and push.
14. Build: spam protection, the on-site check, and reliability
Goal: every report and vote passes Turnstile, each device is rate-limited, and on-site reports are marked by the server.
14a. Create public/js/config.js:
export const TURNSTILE_SITE_KEY = location.hostname === 'localhost'
  ? '1x00000000000000000000AA'
  : 'PASTE-REAL-SITE-KEY';
14b. Add Turnstile to the report sheet and the detail sheet.
• The sheets are built by JavaScript, so render the widget yourself:
widgetId = turnstile.render('#ts', { sitekey: TURNSTILE_SITE_KEY, callback: t => (tsToken = t) })
• Send tsToken with every report (as a form field) and every vote (in the JSON body), named turnstile.
• Tokens work only once, so call turnstile.reset(widgetId) after each submit.
• Disable Submit and the vote buttons until the callback gives you a token.
14c. Create lib/turnstile.js. Export async verifyTurnstile(token, secret, ip):
1. POST to https://challenges.cloudflare.com/turnstile/v0/siteverify.
2. Send a FormData body with secret, response (the token), and remoteip. Get the IP from request.headers.get('CF-Connecting-IP').
3. Return (await res.json()).success.
Call it at the top of POST /api/reports and POST .../vote, using context.env.TURNSTILE_SECRET. If it fails, return 403.
14d. Rate limit in POST /api/reports:
SELECT COUNT(*) AS n FROM reports WHERE device_id = ? AND created_at > ?   -- now - 3600
If n >= REPORTS_PER_HOUR, return error('Too many reports. Try again later.', 429).
14e. The on-site check.
• In report.js, send the phone's current GPS as gps_lat and gps_lng. Leave them blank if location was denied.
• On the server:
    ◦ on_site = 1 only if both are present and haversineMeters(gps_lat, gps_lng, lat, lng) <= ON_SITE_METERS, using lib/geo.js
    ◦ the server decides this, never the browser
GPS can be faked, but that's acceptable for this version; mention it as a known limit in the submission.
[ ] Removing the token from a request (test with DevTools) gets a 403.
[ ] The 11th report in an hour from one device gets a 429.
[ ] A report submitted while standing at the spot gets the On-site badge; one dropped 2 miles away doesn't.
[ ] Commit and push.
14f. Make every failure recoverable. The free services this app depends on (Cloudflare's free plan, Overpass, OpenRouteService) will occasionally fail. The goal is that a failure means a short wait and a retry, never a lost report or a lost route.
• Retry helper. In api.js, write fetchWithRetry(url, options):
    1. Try the request.
    2. On a network error or a 5xx or 429 response, wait 1.5 seconds and try once more.
    3. If it still fails, throw a plain-English error.
    ◦ Every function in api.js uses it.
• Never lose the form. If submitting a report fails, keep every field and the photo exactly as they were. Show "Couldn't send. Tap Submit to try again."
• Map refresh failures are quiet. If loadReports() fails, keep the markers already on screen and try again at the next 30-second tick. Only show a toast if it fails 3 times in a row.
• Routing failures keep the current route.
    ◦ If a reroute fails, or OpenRouteService returns 429, keep the current route on screen and try again in 10 seconds.
    ◦ Show a small "Route may be out of date" banner until it succeeds.
    ◦ Never clear the route because a request failed.
• Watch the server's time limit. If any request returns error 1102 ("Worker exceeded resource limits"), that endpoint is doing too much work. Move the work to the browser, or simplify it.
[ ] With DevTools → Network → Offline, submitting keeps the form. Back online, Submit works.
[ ] Blocking api.openrouteservice.org in DevTools (right-click a request → Block request URL) during navigation keeps the route on screen and shows the out-of-date banner.
15. Deploy to Cloudflare Pages
You can do this any time after section 6, and earlier is better: phone GPS only works over HTTPS, so real-phone testing needs a deployed copy. Once it's connected, every git push deploys automatically.
15a. Connect the repo.
1. In dash.cloudflare.com, go to Workers & Pages → Create → Pages → Connect to Git.
2. Authorize GitHub, then pick debris-detour.
3. Set:
    ◦ Project name: debris-detour (match name in wrangler.toml)
    ◦ Production branch: main
    ◦ Framework preset: None
    ◦ Build command: leave blank (if the form insists on one, enter exit 0)
    ◦ Build output directory: public
4. Click Save and Deploy.
Cloudflare runs npm install itself and reads the D1 binding from wrangler.toml. Don't also add bindings in the dashboard; the file is the source of truth.
15b. Add the production secrets. Use the real Turnstile secret here, not the test one.
npx wrangler pages secret put ORS_API_KEY --project-name debris-detour
npx wrangler pages secret put TURNSTILE_SECRET --project-name debris-detour
Secrets only apply to new deployments. Afterward, push any commit, or click Retry deployment in the dashboard.
15c. Finish the setup.
• Your site is at https://debris-detour.pages.dev. If Cloudflare added a suffix because the name was taken, use that URL everywhere below.
• Add that hostname to the Turnstile widget (Turnstile → your widget → Hostnames).
• Paste the real site key into public/js/config.js.
• The remote database already has the tables from section 4. Only run npm run db:remote again if you change schema.sql, and remember it wipes the remote data.
• Branch previews: pushing a branch other than main gives it its own URL, like https://my-branch.debris-detour.pages.dev. Use those to test on phones without touching the main site.
15d. Optional custom domain. Buy one through Cloudflare Registrar (for example debrisdetour.com). Then add it under the Pages project's Custom domains tab, and add it to the Turnstile hostnames.
[ ] The live URL loads on a phone, finds your location, and shows reports.
[ ] A report submitted on the live site appears in the remote database:
npx wrangler d1 execute debris-detour-db --remote --command "SELECT id, street_label FROM reports ORDER BY created_at DESC LIMIT 5"
16. Polish, demo data, and phone testing
16a. UI polish pass.
[ ] Check every text and background color pair at webaim.org/resources/contrastchecker. Aim for at least 4.5:1, and 7:1 for the turn banner.
[ ] Make every tap target at least 48 × 48 px. Test with your thumb, one-handed.
[ ] Add a loading state (spinner or disabled button) to every action that waits on the network.
[ ] Make every failure show a plain-English toast. Test with DevTools → Network → Offline and Slow 4G.
[ ] Add a legend or help sheet: what red and amber mean, what the On-site and Verified badges mean, and what Cautious Navigation does.
[ ] Put the app name and logo in the top bar. Add public/img/favicon.svg and link it in <head>.
[ ] Add an aria-label to every icon-only button: settings, close, and end navigation.
[ ] Show the OpenStreetMap attribution on the map. It's required, and Leaflet does it if the tile layer has attribution.
16b. Demo data.
• The best way: create the demo reports through the live app, so they get real snapping and real photos.
    ◦ Make 15–25 reports across Pensacola, mixing types, passable and impassable, verified and unverified.
    ◦ Include at least one on a major road with a photo, one intersection report, and one cluster on your demo route.
• Do it the day you record. Flooding reports expire after 1 day.
• Before recording, push every report's expiry out:
npx wrangler d1 execute debris-detour-db --remote --command "UPDATE reports SET expires_at = created_at + 604800 WHERE status = 'active'"
• Backup: after the demo data is in place, save it to seed.sql, so you can restore it if something wipes the database (photos are included, since they live in D1):
npx wrangler d1 export debris-detour-db --remote --no-schema --output=seed.sql
16c. Phone testing matrix. Run the full flow on each phone: report, detail, vote, route, navigate.
[ ] iPhone + Safari
[ ] Android + Chrome
[ ] A small screen (iPhone SE size, or DevTools device mode at 375 px wide)
[ ] Location permission denied: the map falls back to Pensacola, and reporting still works by dragging the pin.
[ ] A real drive with a passenger running navigation, including one reroute.
16d. Write README.md. It's part of your submission. Include:
• what the app does and who it's for
• the tech stack
• how to run it locally (the commands from sections 3–4)
• credits: OpenStreetMap contributors, OpenRouteService, Leaflet, Turf
• an AI use disclosure describing exactly where AI was used
17. Congressional App Challenge submission
Submissions close Monday, October 26, 2026, at 12:00 PM ET, and they need source code plus a demo video (source). AI tools are allowed, but all AI use must be fully disclosed, and each student is expected to show real individual contribution and understanding (source).
Eligibility checks (do these now):
[ ] Confirm Florida's 1st District (Rep. Jimmy Patronis, which covers Pensacola) is hosting a 2026 challenge, on congressionalappchallenge.us.
[ ] At least half the team lives or goes to school in that district.
[ ] Every teammate is registered in the student portal.
[ ] Read the official 2026 rulebook for the video length limit and the exact required fields.
Prepare the written answers. Districts commonly ask for: the app's name, its target audience, how it works, and a technical challenge you hit and how you solved it (example). Strong material for the technical challenge:
• turning raw OpenStreetMap roads into intersection-to-intersection street sections (section 9)
• staying inside OpenRouteService's 20 km avoid-zone limit (section 10)
• detecting new obstructions on the route while driving (section 13)
Write the AI disclosure (put it in the README and the submission). Be specific:
• AI helped plan the app's design, write this build plan, and review code.
• List any code AI wrote or changed, by file.
• Say what each teammate wrote themselves.
Keep notes as you go, so this is easy to write at the end.
Record the demo video.
1. Screen-record a phone (iPhone: Control Center → Screen Recording; Android: Quick Settings → Screen record), plus short clips of the app in a car (passenger only).
2. Suggested order:
    1. The problem: roads blocked after hurricanes in Pensacola.
    2. Reporting a fallen tree: snapping, the duplicate pop-up, the required photo on a major road.
    3. The detail screen and voting.
    4. Settings and Cautious Navigation.
    5. Navigating to an address, with a live reroute when a new report lands on the route.
    6. A quick look at the code and architecture.
3. Upload it to YouTube as Unlisted.
Get the source code ready.
[ ] Make sure no secrets were ever committed: git log -p | grep -i -E "ORS_API_KEY=|TURNSTILE_SECRET=" should print nothing.
[ ] Make the GitHub repo Public (Settings → General → Danger Zone → Change visibility), or share it the way the rulebook says.
[ ] Submit through the portal with the repo link, video link, and written answers. Aim to finish well before the noon deadline.
18. Everyday commands
Task
Command
Start the local site + API
npm run dev → open http://localhost:8788
Stop it
Ctrl+C in that terminal
Get teammates' latest work
git checkout main && git pull
Start a new piece of work
git checkout -b feature/short-name
Save and share your work
git add . → git commit -m "What changed" → git push -u origin feature/short-name
Merge it
On GitHub, open a Pull request, have a teammate look, then Merge → locally git checkout main && git pull
Look inside the local database
npx wrangler d1 execute debris-detour-db --local --command "SELECT * FROM reports"
Look inside the live database
same command with --remote
Wipe and rebuild the local tables
npm run db:local
Watch live server logs
npx wrangler pages deployment tail --project-name debris-detour
Change a production secret
npx wrangler pages secret put NAME --project-name debris-detour
Common problems:
• context.env.DB is undefined. Check wrangler.toml is in the project root, and restart npm run dev. Restart after any change to wrangler.toml or .dev.vars.
• Git asks for a password on push. GitHub no longer accepts passwords. On Windows, the Git installer's browser sign-in handles it. On Mac, install GitHub CLI (cli.github.com) and run gh auth login.
• Location doesn't work on a phone. You're on plain http://. Use the pages.dev URL instead, since phones need HTTPS for GPS.
• Merge conflict. VS Code highlights the conflicting lines. Pick Accept Current, Accept Incoming, or Accept Both, save, then git add . and git commit.
• OpenRouteService returns an error. Check the error's code against the restrictions page. Most problems come from zones covering too much area or a route that's too long.