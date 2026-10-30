# LiftLog

A personal gym workout logger that runs as a home-screen web app on iPhone. It has unlimited templates, set logging with the previous session's numbers shown, a rest timer, history, and per-exercise progress charts. There's no account and no server. All data stays on the phone.

## Install on iPhone

1. Open the app's URL in **Safari** (it must be Safari).
2. Tap **Share**, then **Add to Home Screen**.
3. Launch it from the home screen icon. It runs full screen and works offline.

## Back up your data

Data is stored in the browser on your phone. Use **Settings > Export backup** regularly and save the file to Files or iCloud Drive. To move to a new phone, install the app there and use **Import backup**.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Updating

After changing any file, bump `CACHE` in `sw.js` (e.g. `liftlog-v2`). The phone picks up the new version the next time the app opens with a connection; you may need to close and reopen it twice.

## Layout

- `js/store.js`: state, localStorage persistence, export/import
- `js/views/*.js`: one file per tab (workout, history, exercises, settings)
- `js/rest.js`: rest timer (timestamp-based, survives backgrounding)
- `sw.js`: offline cache
