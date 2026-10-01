# Homia · memoria del proyecto

Memoria viva para agentes. Mantenerla corta, factual y actualizada. Si algo cambia en el código, actualizar aquí.

## Qué es

PWA de tareas del hogar con UI estilo chat (WhatsApp). Pensada para dos personas. Funciona offline en un dispositivo; sync opcional vía Firebase Realtime Database entre dos móviles.

Nombre npm / legacy: `casa-app`. Persistencia local: clave `casa-tareas-v1` (no renombrar).

## Stack

- React 19 + TypeScript + Vite
- SCSS BEM + tokens en `src/presentation/styles/_tokens.scss`
- Zustand como bridge de estado de UI
- Firebase RTDB (modular) opcional
- PWA: `vite-plugin-pwa` + `sw.js`
- Lint: `oxlint` (`npm run lint`)

## Arquitectura (DDD por capas)

```
src/
  domain/           entidades, VOs, ports (sin deps de infra/UI)
  application/      queries/ + mutations/ + SessionUnitOfWork
  infrastructure/   localStorage, Firebase sync, notificaciones
  presentation/     React, SCSS BEM, Zustand
  composition/      createApp() — wiring
```

- Regla: dominio no importa presentación ni Firebase.
- Casos de uso se registran en `createApp()` y se inyectan vía `AppContainerContext`.
- `SessionUnitOfWork.commit()`: actualiza store → guarda local → push remoto (si procede).

## Modelo de dominio

- Personas: `a` | `b` (`PersonId`).
- `AppSession`: `me`, `names`, `filter`, `tasks`, `room`, `onboardingDone`, `auth`, `memberships[]`.
- `Task`: texto, autor, timestamp, done/doneBy, reactions[], checklist[].
- Filtros: ver `TaskFilters`.
- Room code: alfanumérico 8–32 chars (`RoomCode`); deep link `?casa=<code>`.
- Auth opcional: `AuthUser` (Google) + `GroupMembership` (room, person, label, joinedAt).

## Sync Firebase

- Sin `.env` Firebase → app 100% local.
- Rooms en RTDB; quien conoce el código lee/escribe (no listar rooms).
- Memberships en `users/{uid}/memberships` (requiere Auth).
- Join deep link sustituye tareas locales tras confirmación.
- Offline: CRUD local siempre; sync retoma al volver online.

## UI / UX

- Idioma UI: español (`src/presentation/i18n/es.ts`).
- Look WhatsApp: verdes header/accent, burbujas out/in; dark mode por `prefers-color-scheme`.
- Componentes clave: `Chat`, `Composer`, `Header`, `SettingsSheet`, `GroupSwitcherSheet`, `OnboardingFlow`, `FilterBar`.
- Notificaciones browser solo con app abierta / reciente background (sin push remoto).

## Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Decisiones a respetar

1. No romper la clave `casa-tareas-v1` ni la forma mínima de sesión (`tasks` array).
2. Preferir mutations/queries nuevas frente a lógica en componentes.
3. SCSS BEM; tokens CSS en `_tokens.scss`, no hardcodear colores en componentes.
4. Alias `@/` → `src/` (ver `tsconfig` / Vite).
5. No publicar room codes; son el único “secreto” de acceso.

## Pendiente / notas abiertas

- Google login opcional (Firebase Auth). Al iniciar sesión se hace unión de casas: la local + las de `users/{uid}/memberships`.
- UI de login: Ajustes + onboarding (welcome/choice). `ApplyAuthUser` completa el onboarding y abre la casa si la cuenta ya tiene memberships (popup, redirect o cold start).
- Un usuario puede tener varias casas; UI de cambio en header/ajustes si `memberships.length > 1`.
- Rooms RTDB siguen abiertos por código; solo la ruta `users/{uid}` exige auth.
- **Config crítica:** en RTDB hay que publicar reglas con nodo `users/$uid` (auth.uid == $uid). Auth puede funcionar y las memberships fallar si falta ese nodo.
- Activar Google provider + reglas `users` en Firebase Console (ver README).
- Siguiente: endurecer reglas de rooms por membresía si hace falta.
