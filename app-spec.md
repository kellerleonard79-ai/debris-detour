Debris Detour — App Spec
Overview and goals
Debris Detour is a phone-first web app where anyone can report a blocked or damaged road after a storm, and drivers get live navigation that routes around those reports.
Goal 1: Accurate reporting. Reports are tied to a specific street section, checked for duplicates, verified by on-site GPS or community votes, and removed when they're cleared or go stale.
Goal 2: Navigation that avoids obstructions. Google Maps-style live driving directions where the route is built around active reports, and the driver is rerouted automatically when a new obstruction appears ahead.
Ground rules
• Anonymous. No accounts or sign-in. Each browser gets a random device ID so the app can recognize the original reporter.
• Always on. There is no special disaster mode.
• Works anywhere. It's built on worldwide open map data, and opens to the user's location or falls back to Northwest Florida.
• Driving only.
• Online only. No offline mode and no home-screen install for now.
• Built for the field. One-handed use on a phone, often in bright sun, with big tap targets and high contrast.
Screens and user flows
The app has five screens.
1. Map (home)
• Full-screen map centered on the user's location, falling back to Northwest Florida if location is unavailable.
• Active reports appear as markers along their street section.
    ◦ Each obstruction type gets its own icon.
    ◦ Color shows passability: red for impassable, amber for passable.
    ◦ An outline badge marks verified reports.
• Buttons: a large Report button, a search bar ("Where to?"), and a settings gear.
• The map refreshes reports every 30 seconds, and whenever the user pans the map.
2. Report flow (a bottom sheet, aiming for under 20 seconds)
1. Location. The pin starts at the user's GPS position. They can drag it, and it snaps to the nearest street section or intersection, which the sheet names (for example, "12th Ave between Gonzalez St and Mallory St").
2. Duplicate check. If that section already has an active report, the app shows a pop-up: "Someone already reported an obstruction on this section. Is this a different obstruction?"
    ◦ Yes, it's different: continue to the next step.
    ◦ No, confirm theirs: records a "still there" vote on the existing report and closes the sheet.
    ◦ Cancel: closes the sheet.
3. Type. Fallen tree, flooding, power line down, debris, or other. Choosing "other" requires a short description.
4. Passability. Impassable, or passable with caution.
5. Photo. Optional on minor roads and required on major roads. One photo per report.
6. Note. Optional, up to 200 characters.
7. Submit. Includes a Turnstile spam check.
3. Report detail (opens when a marker is tapped)
• Shows the type, passability, street section, how long ago it was reported, the photo, the note, an "On-site" or "Verified" badge, and vote counts.
• Still there and Cleared buttons.
• Retract my report appears only on the original reporter's device.
4. Navigation
1. Search. The user types an address and picks from the suggestions.
2. Route preview. Shows the route, the ETA and distance, how many obstructions it avoids, and a Start button.
3. Live navigation.
    ◦ A next-turn banner, with the map following the car's GPS.
    ◦ The screen stays awake for the whole trip.
    ◦ The app reroutes automatically if the driver goes off route or a new obstruction lands on the route, with a short alert: "New obstruction ahead. Rerouting."
4. Arrival. Shows an arrival message and returns to the map.
5. Settings (saved in the browser)
• Avoid these obstruction types: one toggle per type, all on by default.
    ◦ Turning off flooding avoidance shows a warning: "Driving into floodwater is the leading cause of flood deaths."
• Avoid passable obstructions: on by default.
• Cautious Navigation: also avoids unverified reports. Off by default.
Reporting rules
Every report is pinned to one street section (or one intersection), has one type and a passability level, and may need a photo depending on how major the road is.
Street sections and snapping
• A section is the stretch of a road between two intersections, using OpenStreetMap road data.
• When a pin is dropped, the browser asks Overpass for the roads within 300 m. It then:
    1. Snaps the pin to the closest road (within 30 m).
    2. Walks along that road in both directions to the nearest intersection on each side.
    3. Saves the section as way_id:start_node:end_node.
• This work runs on the phone because Cloudflare's free plan allows only 10 ms of server computing per request.
• The server re-checks what the browser sends: the shape must be a valid line or point, have at most 200 coordinates, and sit within 30 m of the pin. It also decides photo_required from the road class itself.
• If the pin is within 25 m of an intersection, it snaps to the intersection instead. That report blocks every section touching that intersection.
• Duplicate rule: an active report already on the same section or intersection triggers the duplicate pop-up described in the report flow. The server enforces it too, returning 409 unless the reporter confirmed it's a separate obstruction.
Obstruction types
Type
Notes
Fallen tree

Flooding
Shows a warning if the user turns off avoiding it
Power line down

Debris

Other
A short description is required
Passability
• Impassable: the road can't be driven.
• Passable: the road can be driven with caution, for example with one lane open.
• Passability is shown to everyone, so utility crews can use the map too.
Photos
• One photo per report.
• The browser resizes the photo to a maximum of 1280 px and re-encodes it as JPEG at 0.7 quality, usually 150–250 KB. Re-encoding removes the hidden location data (EXIF).
• Photos are stored in D1, in a photos table, at no more than 1 MB each. There's no R2, so no card on file is needed.
• A photo is required on major roads. OpenStreetMap labels each road with a class (highway=*), and the snap lookup returns it. These classes count as major:
    ◦ motorway, trunk, primary, secondary, and tertiary
    ◦ the _link ramps of each class
On-site and verified
• On-site: the reporter's GPS was within 150 m of the snapped location when they submitted. These reports get an "On-site" badge.
• Verified: the report is on-site, or at least one other device has tapped "Still there."
• Unverified reports still show on the map, but routing only avoids them when Cautious Navigation is on.
Spam protection
• Every submit and every vote must pass a Cloudflare Turnstile check.
• Each device can submit at most 10 reports per hour.
• Each device gets one vote per report.
Report lifecycle
A report stays active until one of three things happens:
• its type's expiry time runs out, or
• two different devices vote "Cleared," or
• the original reporter retracts it.
No report lives longer than 7 days.
Expiry by type
Type
Expires after the last "still there"
Hard cap from the original report
Flooding
1 day
7 days
Debris
2 days
7 days
Other
2 days
7 days
Fallen tree
5 days
7 days
Power line down
5 days
7 days
Rules
• Every "Still there" vote restarts the expiry clock. The new expiry is the earlier of these two times:
    ◦ the vote time plus the type's expiry period, or
    ◦ the original report time plus 7 days.
• Two "Cleared" votes from two different devices immediately set the report's status to cleared.
• A retraction by the reporter's own device sets the status to retracted.
• Expiry doesn't need a background job. Every query simply filters on expires_at > now(), and the status is cleaned up later.
• Reports are never deleted from the database. Keeping them preserves a history you can show in the demo, such as "312 reports during the storm."
Navigation rules
The route is built by sending OpenRouteService a set of "avoid zones," one for each report the user's settings say to avoid.
Which reports become avoid zones
A report is avoided only if all four of these are true:
1. It is active.
2. Its type is toggled on in Settings.
3. It is impassable, or "Avoid passable obstructions" is on.
4. It is verified, or Cautious Navigation is on.
Building the route
1. The browser loads active reports within 3 km of the start and destination, and applies the four rules above using the user's settings.
2. It turns each report into an avoid zone with Turf.js:
    ◦ a section becomes its road line with a 10 m buffer around it
    ◦ an intersection becomes a 20 m circle
3. It adds zones closest to the trip first, and stops before they span more than 19 km. OpenRouteService's limit is 20 km.
4. It sends { start, end, zones } to /api/route. The server checks the zones (at most 100 polygons and 5,000 points, no more than 20 km across), adds the secret API key, and forwards them to the OpenRouteService directions API (driving-car, options.avoid_polygons).
5. The route line, turn-by-turn steps, and ETA come back to the browser.
6. The API key never reaches the browser.
Live navigation
• The app follows the car's GPS position with navigator.geolocation.watchPosition.
• It keeps the screen awake with the Screen Wake Lock API.
• A next-turn banner is built from the route's step list. The current step advances when the driver comes within 25 m of that step's end point.
• Off-route: if the driver is more than 40 m from the route line on two GPS updates in a row, the app reroutes from the current position.
• New obstruction: every 30 seconds the app re-checks the reports.
    ◦ If a newly avoidable report touches the rest of the route, it shows "New obstruction ahead. Rerouting" and reroutes.
    ◦ It skips this check while the driver is within 50 m of the obstruction, since rerouting at that point isn't safe.
• Destination search uses OpenRouteService geocoding through /api/geocode. Results are biased toward the user's current location.
Tech stack and architecture
The heavy map work (snapping to streets and building avoid zones) runs on the phone, because Cloudflare's free plan allows only 10 ms of server computing per request. The server does fast checks, holds the secret keys, and talks to the database. The browser also talks directly to Overpass and to the OpenStreetMap tile servers, since neither needs a key.
Layer
Choice
Why
Frontend
Plain HTML, CSS, and JavaScript, plus Leaflet
No framework to learn; Leaflet is the standard open-source map library
Map data and tiles
OpenStreetMap
Free and worldwide
Hosting and API
Cloudflare Pages and Pages Functions
One deploy for both the site and the API, free plan
Database
Cloudflare D1 (SQLite)
Free tier, SQL, already on Cloudflare
Photos
A photos table in D1
No card needed (R2 requires one)
Spam protection
Cloudflare Turnstile
Free CAPTCHA, no puzzles for real users
Routing and address search
OpenRouteService API, through /api/route and /api/geocode
Supports avoid zones; has a free tier; key stays on the server
Road lookup
Overpass API, called from the browser
Finds roads, intersections, and road class in OpenStreetMap
Geometry
Turf.js, in the browser only
Keeps the server under the free plan's 10 ms limit
Database tables
The app needs three tables in Cloudflare D1, which is SQLite. Times are stored as Unix seconds.
reports
Column
Type
Notes
id
TEXT PK
random UUID
device_id
TEXT
the reporter's browser ID, used for retraction
lat, lng
REAL
the snapped point
location_kind
TEXT
section or intersection
section_key
TEXT
way:startNode:endNode, or node:<id> for an intersection
geometry
TEXT
GeoJSON line or point, used to build the avoid zone
street_label
TEXT
for example "12th Ave between Gonzalez St and Mallory St"
road_class
TEXT
the OpenStreetMap highway value
type
TEXT
tree, flood, power_line, debris, or other
other_text
TEXT
required when type is other
passable
INTEGER
0 = impassable, 1 = passable
on_site
INTEGER
1 if the reporter's GPS was within 150 m
photo_key
TEXT
the photos table key, or null
note
TEXT
up to 200 characters
status
TEXT
active, cleared, retracted, or expired
created_at
INTEGER

expires_at
INTEGER
moved later by "still there" votes, capped at created_at + 7 days
votes
Column
Type
Notes
id
TEXT PK

report_id
TEXT FK
references reports.id
device_id
TEXT
UNIQUE(report_id, device_id), so each device gets one vote per report
vote
TEXT
still_there or cleared
created_at
INTEGER

photos
Column
Type
Notes
key
TEXT PK
<report id>.jpg
report_id
TEXT FK
references reports.id
data
BLOB
the JPEG bytes, under 1 MB
created_at
INTEGER

Indexes
• reports(status, expires_at), for loading the active reports.
• reports(section_key, status), for the duplicate check.
• reports(lat, lng), for map-area queries.
Verification is worked out when a report is read, not stored: a report is verified if on_site = 1, or at least one still_there vote comes from a device other than the reporter's.
API endpoints
All endpoints are Cloudflare Pages Functions under /api. The browser sends its device ID in an X-Device-Id header on every request.
Method
Path
What it does
GET
/api/reports?bbox=w,s,e,n
Lists the active reports in the map view, each with its verified flag, vote counts, and whether it belongs to this device
POST
/api/reports
Creates a report (multipart form, so the photo can be included). It checks Turnstile, the rate limit, the location shape, and the duplicate rule; works out photo_required and on_site; and saves the report and photo together
POST
/api/reports/:id/vote
Records a vote, { vote: "still_there" or "cleared" }. It also moves expires_at later or marks the report cleared
POST
/api/reports/:id/retract
Retracts a report, only when the device ID matches the reporter's
GET
/api/photos/:key
Serves a report photo from the D1 photos table, with a one-day cache header
GET
/api/geocode?q=&lat=&lng=
Passes address search through to OpenRouteService
POST
/api/route
Takes { start, end, zones }, checks the zones, and forwards them to OpenRouteService with the key. Returns the route line and the steps
The client sends its GPS position along with the report. The server decides on_site itself, so the client never just claims it.
Build order
Build in this order, so that something demo-able exists after every phase and the riskiest piece (routing) gets tested early.
1. Setup. Create the Cloudflare Pages project, the D1 database with both tables, the R2 bucket, and a Turnstile site key. Sign up for an OpenRouteService API key. Put everything in a shared GitHub repo.
2. Map shell. Show a Leaflet map with OpenStreetMap tiles, the user's location, and the Northwest Florida fallback.
3. Basic reporting. Drop a pin, pick a type and passability, submit, and see markers appear. Skip snapping for now; just save the raw point.
4. Routing spike. Call /api/route with hard-coded avoid zones and draw the route.
    ◦ Do this early: if OpenRouteService's limits cause trouble, you want to know now.
5. Snapping and sections. Build /api/snap with Overpass: find the section or intersection, the street label, and the road class. Then add the duplicate pop-up.
6. Avoid zones from real reports. Connect the settings to the four avoid rules and the Turf.js buffers.
7. Report detail and votes. Add "Still there," "Cleared," retraction, verification badges, and expiry.
8. Photos. Resize and strip location data in the browser, upload to R2, and require photos on major roads.
9. Live navigation. Add GPS follow, the turn banner, keeping the screen awake, off-route rerouting, and the new-obstruction check.
10. Polish and demo prep. Finish the UI, add Turnstile and rate limits, seed realistic Pensacola reports for the demo, and record the walkthrough video.
Phases 1–4 are the foundation and should be done first. Once phase 3 works, frontend and backend work can split and run in parallel.
Open items and risks
Decisions still open
[ ] Should "Avoid passable obstructions" default to on? The spec assumes yes, to match "all avoidance on by default."
[ ] Is 150 m the right distance for counting a report as on-site?
[ ] Does the 200-character note limit work?
Risks to check early
• Free-plan server limit. Cloudflare's free plan allows 10 ms of computing per request, and requests that go over fail with error 1102. Snapping and geometry run in the browser for this reason; keep every server endpoint to fast checks and SQL.
• OpenRouteService limits. The free plan allows 2,000 directions and 1,000 autocomplete searches per day, and 40 directions per minute. Avoid zones must fit within 20 km and 200 km². The reroute throttle and the 19 km zone cap keep you inside these.
• Overpass reliability. The public Overpass servers are volunteer-run and can be slow or busy. The browser caches lookups, gives up after 8 seconds, and retries once on a backup server.
• Trusting the browser's snap. The browser does the snapping, so someone technical could send a fake road shape near a real spot. The server's checks, Turnstile, rate limits, and votes keep this small. Disclose it as a known limit.
• Road classes in OpenStreetMap. Check how 9th Ave, 12th Ave, 17th Ave, and Cervantes St are labeled on openstreetmap.org. If any are tagged residential instead of tertiary or higher, the photo rule won't fire for them. The fix is a small list of exceptions.
• Map tile usage. OpenStreetMap's own tile servers have a usage policy that is fine for a demo, but not for a real launch.
• GPS in the browser. Location tracking and keeping the screen awake behave differently across browsers. Test on both an iPhone (Safari) and an Android phone (Chrome).
• Abuse. Anonymous reporting can be spammed. Turnstile, rate limits, verification, and the two-vote clear rule are the defenses. Mention them in the pitch.