# Golozur Mobile Agent Notes

## Commands
- `npm start`: Expo dev server.
- `npm run dev`: Expo Go (`expo start --go`).
- `npm run android` / `npm run ios`: local native run via `expo run:*`.
- `npm run web`: Expo web dev server.
- `npm run build`: Android EAS build using the default `production` profile in `eas.json`. Other available profiles are `preview`, `preview2`, and `development`; run them explicitly with `npx eas build --platform android --profile <name>`.
- There are no lint, test, format, or typecheck scripts, and no CI workflows in the repo. Do not invent a `lint -> typecheck -> test` pipeline; verify changed flows manually in Expo/Android.

## Config
- Expo config is driven by `app.config.js`; `app.json` also exists but is not the authoritative config when both files are present.
- Runtime env is loaded in `app.config.js` via `dotenv/config` and consumed in app code through `Constants.expoConfig.extra`, not `process.env`.
- Env-backed keys currently wired this way: `DB_HOST`, `JWT_SECRET`, `GOOGLE_MAPS_API_KEY`, plus `GOOGLE_MAPS_IOS_API_KEY` as the iOS fallback. If a new runtime env var is needed, add it to `app.config.js`.

## App Structure
- This is a single Expo app. `App.js` is the real entrypoint: it mounts Redux, `OfflineProvider`, `NavigationContainer`, global `Loading`/`Alert`, and starts `initNotificationSystem()` on mount.
- All routes are declared manually in `src/navigation/NavigationStack.js`. Adding a screen is not enough; add it to the stack.
- `src/context.js/` is an actual directory name. Offline and socket context files live there.

## Data And Sync
- `src/utils/client.js` is the shared Axios client. It reads `DB_HOST` from Expo config and injects the bearer token from Redux first, then falls back to AsyncStorage `user`.
- AsyncStorage keys are shared across screens and services: `user`, `saleStorage`, `productStorage`, `offlineStorage`. Renaming or reshaping them breaks auth restore, offline sales, product cache, and `InfoStorage`.
- Offline sales/product sync lives in `src/context.js/contextOffline.js`.
- The background notification/sync logic that actually runs is `src/services/NotificationService.js`; `src/services/setupBackgroundFetch.js` exists but is not referenced anywhere.

## Realtime Gotchas
- Realtime is decentralized. Many screens/components create their own `io(DB_HOST)` connection; `SocketProvider` exists in `src/context.js/socketContext.js` but is not mounted in `App.js`.
- When changing socket or backend event behavior, search across screens/components, not just the context file.
- Backend host usage is split: normal API calls use `DB_HOST`, but the connection health ping in `src/services/NotificationService.js` is hard-coded to `https://apigolozur.onrender.com/ping`. Review both when touching connectivity or environment behavior.
