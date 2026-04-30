# Migraine & Med Tracker

A personal migraine and medication tracker that runs as a Progressive Web App (PWA) on your phone. No accounts, no backend, no cloud — all data lives on your device. Hosted free on GitHub Pages.

## Features

**Daily**
- Tap to mark daily meds taken (Claritin, Omega, Probiotics, Magnesium, Multivitamin by default — fully customizable)
- Long-press a med card to edit the time you actually took it
- Streak counter for adherence motivation
- Daily check-in: sleep hours + quality, water, sunlight, stress, caffeine, free-text notes
- Smart check-in expansion: only auto-opens before 10 AM

**Scheduled meds**
- Track interval meds (default: testosterone every 4 days; configurable)
- Color-coded urgency: neutral when far out, **yellow** day before due, **red** when due/overdue
- "Took it" button for current dose, "Log past" for retroactive entry

**Migraine logging**
- **Quick log mode**: severity + location + rescue, optimized for during-attack speed. "Add more details" expands when ready.
- **Full mode**: type (migraine / headache / not sure), start time, "woke up with it", onset speed, locations, symptoms, aura (visual / sensory / speech / motor), triggers, notes
- Severity 1–10 with anchor descriptions ("1–3 noticeable / 4–6 disruptive / 7–8 can't function / 9–10 ER-level") to prevent rating drift
- Severity progression sparkline shown live and on past entries
- Rescue meds with time-to-relief tracking
- **Auto-snapshot on start**: weather (temp, pressure, 24h pressure change via Open-Meteo) and last 3 days of check-in data attached automatically for retroactive correlation
- **Stacking warning**: alert when 3+ rescue doses taken within 6 hours
- **Auto-end nudge**: if a migraine has been "active" for 72+ hours, the app suggests you may have forgotten to end it
- Postdrome auto-prompt 24 hours after a migraine ends
- Recent-3 pill at top of new entries for context ("oh, this is my third this week")

**Prodrome (warning signs)**
- Quick-log warning signs with intensity (mild / moderate / strong)
- Optional proactive rescue med toggle (logs the dose for tracking)
- Auto-links to any migraine that starts within 48 hours
- Hit-rate stat on History tab

**History & patterns**
- Last 14 days of daily med adherence as a tappable grid (tap any past day to fix)
- Time-of-day chart (12 buckets, 2-hour increments) showing when migraines tend to start
- Day-of-week chart
- Top 5 triggers, top 5 "what helped"
- Migraine list with inline severity sparklines for past entries
- 30-day stats strip on both Today and History (migraines, headaches, rescue days, adherence %)
- MOH (medication overuse headache) warning at 8+ rescue days/month, stronger at 10+
- Prodrome hit-rate stat

**Backup & data**
- Full JSON export / restore
- Doctor-friendly CSV export of migraines
- Raw data viewer
- Backup nudge after 5+ migraines logged or every 30 days
- Larger fonts toggle for light-sensitive periods

**No tracking, no telemetry, no accounts.** Data lives in IndexedDB on your device. Service worker caches the app shell so it works offline after the first load.

---

## Files in this repo

```
index.html              ← entry point
manifest.json           ← PWA manifest (name, icons, colors)
sw.js                   ← service worker (offline cache)
styles.css              ← all styling
icons/                  ← all PWA icons (see below)
js/
  app.js                ← main entry, view routing, modal management
  state.js              ← reducer-style store, IndexedDB persistence
  db.js                 ← IndexedDB wrapper
  constants.js          ← default meds, chip lists, SVG icons
  utils.js              ← date, format, DOM helpers
  weather.js            ← Open-Meteo integration with geolocation
  components/
    ui.js               ← chip, modal, confirm, long-press, expandable
  views/
    today.js            ← Today tab
    history.js          ← History tab
    settings.js         ← Settings tab
    migraine-editor.js  ← migraine entry/edit (quick + full modes, postdrome prompt)
    prodrome.js         ← prodrome form
    check-in.js         ← daily check-in card
    charts.js           ← time-of-day & day-of-week bar charts
```

---

## Icons (all included in `/icons/`)

The PWA needs multiple icon sizes for different platforms. All are pre-generated and ready to ship:

| File | Size | Purpose |
|---|---|---|
| `icon-192.png` | 192×192 | Android home screen |
| `icon-512.png` | 512×512 | Android splash / store |
| `icon-192-maskable.png` | 192×192 | Android adaptive icon (safe-zone padded) |
| `icon-512-maskable.png` | 512×512 | Android adaptive icon (safe-zone padded) |
| `apple-touch-icon.png` | 180×180 | iOS home screen |
| `favicon-32.png` | 32×32 | Browser tab |
| `favicon-16.png` | 16×16 | Browser tab |
| `icon-master.png` | 1024×1024 | Source/reference (not loaded by app) |

Design: dark warm gradient circle with cream lightning bolt and amber accent ring. Distinctive on a home screen, evokes migraine without being clinical.

---

## Deploy to GitHub Pages

1. **Create a new GitHub repo** (any name, public or private — Pages works either way for personal use).
2. **Copy all files** from this folder into the repo, preserving the directory structure.
3. **Commit and push** to the `main` branch.
4. **Enable Pages**: Repo → Settings → Pages → Source: "Deploy from a branch" → Branch: `main` → Folder: `/ (root)` → Save.
5. **Wait ~1 minute** for the first deploy. GitHub will show you the URL (something like `https://<you>.github.io/<repo-name>/`).
6. **Visit the URL on your phone** in Safari (iOS) or Chrome (Android).

### Install as a PWA

**iOS (Safari):**
- Tap the Share button (square with up arrow)
- Scroll down → "Add to Home Screen"
- Confirm. The icon appears on your home screen.

**Android (Chrome):**
- Tap the three-dot menu
- "Install app" or "Add to Home screen"
- Confirm.

After install, the app launches in standalone mode (no browser chrome), works offline, and behaves like a native app.

### First-run notes

- **Geolocation prompt**: appears the first time you log a migraine (used for weather snapshot). Allow it for richer data, deny it if you'd rather not. The app works fine either way.
- **No login needed.** No accounts. Period.
- **Backups are your responsibility.** Tap Settings → Export full backup (JSON) periodically. Keep the file somewhere safe (email it to yourself, AirDrop to your computer, etc.). The app will nudge you after 5+ migraines and again every 30 days.

---

## Updating the app

When you push changes to GitHub, the service worker caches the old version aggressively. To force update on your phone:

1. Bump `CACHE_VERSION` in `sw.js` (e.g. `v1.0.0` → `v1.0.1`)
2. Commit and push
3. On your phone, close the app fully and reopen. The new SW activates and fetches fresh files.

---

## Privacy

- **Data lives only on your device.** IndexedDB, no remote storage.
- **Weather** is fetched from [Open-Meteo](https://open-meteo.com/) (free, no API key, no tracking). The app sends your coordinates rounded to 0.01° (~1 km).
- **No analytics, no telemetry, no third-party scripts** beyond Google Fonts (which can be self-hosted if you prefer — just download the font files and update `index.html`).
- **Geolocation** is requested only when logging a migraine; declining still lets the rest of the app work.

---

## Customizing

Most defaults can be edited in the app via Settings. If you want to change defaults at the code level:

- **Default daily meds**: `js/constants.js` → `DEFAULT_DAILY_MEDS`
- **Default scheduled meds + interval**: `js/constants.js` → `DEFAULT_INTERVAL_MEDS`
- **Default chip lists** (rescue meds, locations, symptoms, triggers, prodrome signs): same file
- **Color palette**: `styles.css` → `:root` block (CSS custom properties)
- **App name** (shown on home screen): `manifest.json` → `name` and `short_name`

---

## Tech notes

- **No build step.** Pure ES modules (`<script type="module">`), works directly from the file system on any modern browser. GitHub Pages serves it as-is.
- **Persistence**: IndexedDB via a tiny wrapper in `js/db.js`. Single key-value object store. Survives app restarts, browser updates, and most cache evictions.
- **State**: reducer pattern in `js/state.js`. All mutations go through `dispatch(action)`. Subscribers re-render on change.
- **Service worker**: caches the app shell on install. Cache-first for static files, network-first for the weather API. Bump `CACHE_VERSION` to force-refresh.
- **No external runtime dependencies.** All logic, icons, and styling are self-contained. The only network requests are to Open-Meteo (weather) and Google Fonts (typography).
