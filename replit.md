# Marine Navigator — Project Overview

## What This Is
A professional offline marine navigation Android app built with Expo React Native. Styled inspired by Garmin Etrex 10, with a deep navy blue / orange / gold color theme.

## Architecture
- **Frontend only** — no backend server. All data stored locally via AsyncStorage and expo-file-system.
- **Expo SDK 54** with React Native 0.81.5
- **Expo Router** (file-based routing)

## Artifact
- `artifacts/marine-nav/` — The Expo mobile app

## Key Features
1. **Offline Map** — WebView + HTML5 Canvas renders MBTiles tiles read from SQLite via expo-sqlite. Tile bridge: WebView ↔ React Native via postMessage.
2. **GPS Tracking** — expo-location with auto track recording, displayed on map canvas
3. **360° Compass** — expo-sensors Magnetometer, animated SVG compass rose
4. **Waypoint Management** — Save/edit/delete with AsyncStorage, sorted by distance
5. **GPX Import/Export** — Pure JS parser/generator, works fully offline
6. **Destination Navigation** — Arrow pointing to selected waypoint with distance/ETA

## App Screens (5 tabs)
- `app/(tabs)/index.tsx` — Map screen (WebView + Canvas + GPS overlay + FABs)
- `app/(tabs)/compass.tsx` — Compass screen with animated SVG compass rose
- `app/(tabs)/destination.tsx` — Destination picker + big direction arrow
- `app/(tabs)/waypoints.tsx` — Waypoints CRUD list + GPX import/export
- `app/(tabs)/menu.tsx` — Main menu hub

## Modal Screens
- `app/satellite.tsx` — Satellite status + sky view
- `app/settings.tsx` — Units, track color, recording settings
- `app/map-settings.tsx` — MBTiles file picker + GPX export

## Key Files
- `context/NavigationContext.tsx` — All GPS, compass, track, waypoints, MBTiles state
- `utils/geo.ts` — Distance (Haversine), bearing, coordinate formatting
- `utils/gpx.ts` — GPX XML generation and parsing
- `utils/mbtiles.ts` — expo-sqlite MBTiles reader (copies to SQLite dir, queries tiles table)
- `components/CompassArrow.tsx` — Animated react-native-svg compass component

## Color Theme (Marine Navy)
- Background: `#0B1E35` (deep navy)
- Card: `#132A47`
- Primary: `#4DA6FF` (blue)
- Accent: `#FF9800` (orange)
- Gold: `#C8A84B`
- Success: `#4CAF50`

## MBTiles Support
- User picks `.mbtiles` file via expo-document-picker
- File is copied to `FileSystem.documentDirectory + 'SQLite/'`
- expo-sqlite opens it and queries: `SELECT tile_data FROM tiles WHERE zoom_level=? AND tile_column=? AND tile_row=?`
- TMS Y flip: `tmsY = (1 << z) - 1 - y`
- Tile BLOB → base64 → sent to WebView via `injectJavaScript`
- WebView renders as `data:image/png;base64,...` on canvas

## Notes
- WebView map requires Android or iOS (shows placeholder on web)
- expo-sensors (Magnetometer) doesn't work on web — only on device
- User needs to scan QR code with Expo Go to test on physical device
- MBTiles file required for offline map tiles; app still works for GPS/compass without it
