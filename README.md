# Casa · Couple chores (chat-style PWA)

Household tasks as a WhatsApp-style chat for two people. Works fully offline on one device; optional Firebase Realtime Database syncs a shared room between two phones.

## Stack

- React 19 + TypeScript
- Vite + SCSS (BEM)
- Layered DDD (domain → application queries/mutations → infrastructure → presentation)
- Installable PWA via `vite-plugin-pwa`
- Optional Firebase Realtime Database (modular SDK)

## Develop

```bash
npm install
npm run dev
```

## Build & preview

```bash
npm run build
npm run preview
```

Deploy the `dist/` folder to any static host with HTTPS (Netlify, GitHub Pages, Cloudflare Pages).

## Firebase sync (optional)

Without Firebase the app stays local-only. To sync between two phones:

1. Create a Firebase project and a **Realtime Database** (locked mode is fine).
2. Publish these rules:

```json
{
  "rules": {
    "rooms": {
      "$room": {
        ".read": true,
        ".write": true,
        ".validate": "$room.matches(/^[a-z0-9]{8,32}$/)"
      }
    }
  }
}
```

Rooms cannot be listed; only someone who knows the code can open one.

3. Register a Web app and copy the config values.
4. Copy `.env.example` to `.env` and fill in:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=https://xxxx-default-rtdb.europe-west1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

5. Rebuild / restart the dev server.

### Pairing

1. Install the PWA → Settings → **Crear casa compartida** → share the code.
2. Partner installs → Settings → enter the code → **Unirme**.
3. Set names in Settings. Changes sync in real time.

Deep link: `?casa=<roomCode>` joins after confirmation (local tasks are replaced).

## Notifications

Settings → “Avisarme de tareas nuevas”. Works while the app is open or recently in the background. True closed-app push needs Cloud Functions (not included).

## Architecture

```
src/
  domain/           entities, value objects, ports
  application/      queries/ and mutations/
  infrastructure/   localStorage, Firebase sync, notifications
  presentation/     React UI, SCSS BEM, Zustand bridge
  composition/      wiring (createApp)
```

Session state is persisted under the legacy key `casa-tareas-v1` so existing installs keep their data.

## Notes

- Offline: local CRUD always works; cloud sync resumes when online.
- Anyone with the room code can read/write tasks — do not publish codes.
