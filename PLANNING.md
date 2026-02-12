# Excalibur — Discovery & Planning

## Overview

**Excalibur** — a web application to assist players of **The Resistance: Avalon** (and potentially The Resistance).

---

## Game Summary

_To be refined during discovery._

The Resistance: Avalon is a party game for 5–10 players. Players are secretly assigned roles on one of two teams:

- **Good (Loyal Servants of Arthur)** — trying to successfully complete quests
- **Evil (Minions of Mordred)** — trying to sabotage quests without being discovered

The game plays over a series of up to 5 quests (missions). Good wins if 3 quests succeed; Evil wins if 3 quests fail (or via Assassin mechanic).

### Key Concepts

- **Roles**: Merlin, Percival, Assassin, Morgana, Mordred, Oberon, generic Loyal Servants, generic Minions
- **Quest phases**: Team proposal → Vote → Quest resolution
- **Vote track**: 5 consecutive rejected proposals = Evil wins
- **Assassin**: After Good wins 3 quests, the Assassin gets one chance to identify Merlin — if correct, Evil wins instead

---

## Requirements

### Must-Have (MVP)

1. **Authentication** — Google OAuth login; after first login, player is prompted to set/edit a display name
2. **Game room management**
   - A host can create a game room
   - Players join via a **room code** or by browsing a **room list** (all rooms visible, no private room option for MVP)
   - Rooms are **persistent** — survive refreshes/disconnections; cleared after 30 days of inactivity
   - Player count enforced: **5–10 players** per room (standard Avalon range)
3. **Host controls**
   - Kick/remove players from the room
   - Restart the game (re-deal roles)
   - Adjust game settings (role composition, team sizes) **between games**, not during a game
4. **Role assignment**
   - Host triggers role assignment once all players are in the room
   - Roles are randomly distributed; each player sees their own role privately on their device
   - Role reveal uses **tap-to-reveal** interaction (prevent shoulder-surfing)
   - Role composition is **fully manual** — host picks each role slot one by one (target audience is veteran players)
   - Night-phase information is **not** shown in the app (players handle that in person or via video call)
5. **Post-game review** — After a game ends, all players can see everyone's roles revealed (review stage before returning to lobby)
6. **Real-time updates** — All room events (player joins/leaves, game start, role assignment, review) update in real time via Firestore listeners
7. **Mobile-first** — Each player uses their own device (primarily smartphones)
8. **Visual design** — Player names and role names displayed in **distinct fonts** for clarity

### Terminology

- **Game** = one role-assignment cycle (deal roles → play through → end). Settings can be changed between games.
- **Round** = reserved for future use (rounds of quests/tasks within a game)

### Room State Machine

```
waiting (lobby) → in_game (roles dealt) → review (all roles revealed) → waiting (lobby)
```

### Nice-to-Have (Future Stages)

- Game state tracking (quests, votes, outcomes) — round-level tracking
- Vote/proposal tracking and history
- Strategy aids and deduction tools
- Timer features
- Expanded player counts (possibly using "The Resistance" rules instead of Avalon)
- Private rooms (hidden from list, join by code only)

### Out of Scope (for MVP)

- Physical component replacement beyond role cards (tokens, quest cards, etc.)
- Special roles or house rules beyond the standard Avalon set
- Desktop-optimized layouts (mobile-first, but should still be usable)

---

## Design Decisions to Finalize

The following decisions have alternatives. Each needs a resolution before or during implementation.

### D1. Player data in rooms: subcollection vs. array field

- **Option A — Subcollection** (`rooms/{roomId}/players/{uid}`): One doc per player. Fine-grained security rules (each player writes own doc). More Firestore reads.
- **Option B — Array field** on room doc (`players: [{uid, displayName, joinedAt}, ...]`): Fewer reads, simpler queries, one listener. But any player mutation rewrites the whole array, harder to secure per-player writes.
- **Recommendation**: Option B — for 5–10 players the array is simple and performant. Host is the one making most mutations anyway.
- **Decision**: _TBD_

### D2. Role data storage & access

- **Option A — Subcollection + rules** (`rooms/{roomId}/roles/{uid}`): Each player reads their own doc via VueFire real-time binding. Clean, standard Firestore pattern.
- **Option B — Callable Cloud Function** (`getMyRole()`): Player calls a function, gets role back. No role data in Firestore for clients to see at all. Simpler security, but no real-time binding — call once and cache.
- **Recommendation**: Option A — fits naturally with VueFire and real-time listeners.
- **Decision**: _TBD_

### D3. Review phase: how to reveal all roles

- **Option A — Status-based security rules**: Firestore rules check `if room.status == 'review'` then allow reads on all role docs. No data copying, no extra Cloud Function — just a status change by host.
- **Option B — Copy to public subcollection**: `rooms/{roomId}/review/{uid}`. Duplicates data but cleanly separates secret from public.
- **Option C — Cloud Function returns all roles**: Client calls `getReviewData()`, function returns the full list. No Firestore reads for review.
- **Recommendation**: Option A — simplest, no duplication, leverages Firestore rules + VueFire naturally.
- **Decision**: _TBD_

### D4. Room creation: client-side vs. Cloud Function

- **Option A — Client-side**: Host writes room doc directly to Firestore. Simple, but room code uniqueness is harder to guarantee (race conditions).
- **Option B — Cloud Function `createRoom`**: Generates unique room code server-side, guarantees no collisions. Slightly more overhead.
- **Recommendation**: Option B — room code collisions would be a bad UX. One extra function is worth it.
- **Decision**: _TBD_

### D5. Room code format

- **Option A — Short alphanumeric** (e.g., `AB3X`): 4–6 chars, easy to read aloud. Excludes ambiguous chars (0/O, 1/I/L).
- **Option B — Numeric only** (e.g., `7294`): Easier to type on phone keyboard (no alpha/numeric switching).
- **Option C — Word-based** (e.g., `brave-falcon`): Memorable but longer to type.
- **Recommendation**: Option B — phone keyboards default to numeric being easier; 4–6 digits gives plenty of room.
- **Decision**: _TBD_

### D6. User profiles: Firestore collection vs. Firebase Auth displayName

- **Option A — Firestore `users/{uid}`** collection: Flexible, can add fields later (avatar, stats). Queryable in security rules. Extra collection to maintain.
- **Option B — Firebase Auth `displayName` only**: Simpler, no extra collection. But less flexible, not easily queryable, and other players can't look up display names.
- **Recommendation**: Option A — we need other players to see display names (in room list, review), which requires the data to be in Firestore.
- **Decision**: _TBD_

### D7. Do we need Pinia?

- **Option A — Include Pinia**: Standard Vue practice, useful for local UI state (current room context, UI toggles).
- **Option B — Skip Pinia**: VueFire provides reactive Firestore data, Auth state comes from VueFire. For this MVP, there may be nothing meaningful to store locally. Can add later if needed.
- **Recommendation**: Option B — start without it, add if we find a need. Keeps dependencies minimal.
- **Decision**: _TBD_

### D8. State transitions: who writes room status?

- **Option A — Host writes directly**: Host client updates `room.status` in Firestore. Simpler, but security rules must validate transitions (only host, only valid transitions).
- **Option B — Cloud Functions for all transitions**: Every state change goes through a function. Most secure, centralized validation. More functions to maintain.
- **Option C — Hybrid**: Cloud Functions for sensitive operations (role assignment), direct writes for simpler ones (return to lobby).
- **Recommendation**: Option C — `assignRoles` must be a function (it shuffles). Simpler transitions like "return to lobby" can be direct writes with rules validation.
- **Decision**: _TBD_

### D9. Host leaves: what happens?

- **Option A — Auto-transfer host** to the next player who joined.
- **Option B — Room closes**, all players kicked.
- **Option C — Room persists**, host can reclaim on reconnect. No host actions available until they return.
- **Recommendation**: Option C for MVP — simplest to implement. Can add host transfer later.
- **Decision**: _TBD_

### D10. Can players join during the review state?

- **Option A — Block joins** during both `in_game` and `review`.
- **Option B — Allow joins during review** — new player sees review, participates in next game.
- **Recommendation**: Option A — simpler, avoids confusion.
- **Decision**: _TBD_

### D11. Room cleanup strategy

- **Option A — Scheduled Cloud Function** (cron): Runs daily, deletes stale rooms. Requires Cloud Scheduler.
- **Option B — Lazy cleanup**: Check room age on read, delete if stale. No scheduled function needed but stale rooms linger until accessed.
- **Option C — Firestore TTL policy**: Set an `expireAt` field, Firestore auto-deletes. Simplest, no function needed.
- **Recommendation**: Option C — Firestore TTL is built-in and requires zero code. Just update `expireAt` on every activity.
- **Decision**: _TBD_

### D12. Cloud Functions: separate vs. single state machine

- **Option A — Separate functions** (`assignRoles`, `endGame`, `createRoom`): Clear purpose, easy to understand. More deploy targets.
- **Option B — Single `transitionRoom(action)` function**: One function handles all transitions with a switch/case. Fewer deploys, centralized logic. More complex internally.
- **Recommendation**: Option A — clarity over cleverness for a small project.
- **Decision**: _TBD_

## Technical Decisions

### Confirmed

- **Database / Backend**: Firebase (Firestore for data, Firebase Auth for Google OAuth, Firebase Hosting for deployment)
- **Real-time**: Firestore real-time listeners via **VueFire**
- **Frontend**: **Vue 3** (Composition API with `<script setup>`) + **VueFire** for Firebase bindings
- **Styling**: **Tailwind CSS** + **DaisyUI** (minimal, clean component classes)
- **Server-side logic**: **Firebase Cloud Functions** for:
  - Secure role assignment (shuffle + write roles so no single client sees all roles)
  - Scheduled room cleanup (delete rooms inactive for 30 days)
- **Project structure**: Single repo with:
  - Root-level Vue app (frontend)
  - `functions/` directory (Firebase Cloud Functions)
- **Build tooling**: Vite
- **Routing**: Vue Router
- **Hosting**: Firebase Hosting (CDN, SSL, deploys with Functions/rules)
- **Source control**: GitHub (personal account)
- **CI/CD**: GitHub Actions
  - Push to `main` → auto-deploy to production
  - PR → deploy to Firebase preview channel (temporary URL for review)

> **Note**: This is a personal project. No work-related infrastructure, accounts, or tools (e.g., work GitLab, work credentials) should be used.

---

## High-Level Todos

Strategic items to guide direction. Complete or update these as we go.

- [ ] **Collect Avalon rules context** — Gather official or reference Avalon rules (roles, night phase, win conditions, quest sizes, etc.) into a doc (e.g. `docs/avalon-rules.md` or a section in PLANNING.md) and commit. Ensures the app and future features stay aligned with the game.
- [ ] **Finalize design decisions** — Resolve D1–D12 in "Design Decisions to Finalize"; update task breakdown to match.
- [ ] **Complete Phase 0** — Infrastructure and project setup (Firebase, Vue, Functions, emulators, app shell, CI/CD).
- [ ] **Reach MVP** — Phases 1–4 done: auth, rooms, role assignment, post-game review.
- [ ] **Polish and ship** — Phase 5; README for players; deploy and use with a real game.

---

## Task Breakdown

### Phase 0: Infrastructure & Project Setup

#### 0.1 — Firebase Project

- [ ] Create a Firebase project (via Firebase Console)
- [ ] Enable **Firebase Authentication** with Google sign-in provider
- [ ] Create a **Firestore** database (start in test mode, lock down with rules later)
- [ ] Enable **Firebase Hosting**
- [ ] Enable **Cloud Functions** (requires Blaze / pay-as-you-go plan for Cloud Functions)
- [ ] Note down Firebase config values (apiKey, authDomain, projectId, etc.)

#### 0.2 — Repo & Vue Project Initialization

- [ ] Initialize Vue 3 project with Vite (`npm create vue@latest`)
  - TypeScript: yes
  - Vue Router: yes
  - Pinia (state management): yes (useful for local UI state)
  - ESLint + Prettier: yes
- [ ] Install and configure **Tailwind CSS** + **DaisyUI**
- [ ] Install and configure **VueFire** + **Firebase JS SDK**
- [ ] Set up Firebase initialization (`src/firebase.ts`) with config from `.env`
- [ ] Set up VueFire plugin in Vue app entry point
- [ ] Configure `.env` / `.env.local` for Firebase config values (keep out of git)
- [x] Update `.gitignore` (node_modules, dist, .env.local, Firebase cache, etc.)

#### 0.3 — Firebase Cloud Functions Setup

- [ ] Initialize Cloud Functions in `functions/` directory (`firebase init functions`)
  - Language: TypeScript
- [ ] Set up `functions/package.json` with dependencies
- [ ] Create a simple health-check function to verify deployment works
- [ ] Configure `firebase.json` to wire up Hosting + Functions

#### 0.4 — Local Development Environment

- [ ] Set up **Firebase Emulators** (Auth, Firestore, Functions, Hosting)
  - Allows full offline/local development without hitting production Firebase
- [ ] Configure `firebase.json` emulator ports
- [ ] Add npm scripts:
  - `dev` — start Vite dev server
  - `dev:emulators` — start Firebase emulators
  - `dev:all` — start both Vite + emulators concurrently
  - `build` — production build
  - `deploy` — build + `firebase deploy`
- [ ] Wire Vue app to connect to emulators in development mode

#### 0.5 — Firestore Security Rules (Initial)

- [ ] Write initial `firestore.rules`:
  - Authenticated users can read/write their own user profile
  - Room data: read for authenticated users, write restricted (details TBD per feature)
  - Role data: each player can only read their own role
- [ ] Deploy rules to Firebase (or test via emulator)

#### 0.6 — Base App Shell

- [ ] Set up Vue Router with placeholder routes:
  - `/login` — login page
  - `/` — home / room list (requires auth)
  - `/room/:id` — room view (requires auth)
- [ ] Set up a basic layout component (mobile-friendly shell, header/nav)
- [ ] Set up an auth guard (redirect to `/login` if not authenticated)
- [ ] Verify end-to-end: login via emulator → see home page → navigate to a room route

#### 0.7 — GitHub Repo & CI/CD

- [x] Create a GitHub repo (personal account) — https://github.com/aenon/excalibur
- [x] Push initial codebase
- [ ] Set up **GitHub Actions** workflow:
  - On push to `main`: build Vue app → `firebase deploy` (Hosting + Functions + Firestore rules)
  - On PR: build Vue app → deploy to Firebase **preview channel** (temporary URL)
- [ ] Store Firebase service account key as a GitHub Actions secret
- [ ] Verify: push a commit → confirm auto-deploy to Firebase Hosting

---

### Phase 1: Authentication

- [ ] Set up Google OAuth sign-in page (`/login`)
  - "Sign in with Google" button
  - Clean, mobile-friendly layout with Excalibur branding
- [ ] Handle Firebase Auth state with VueFire
- [ ] After first login, prompt user to set a **display name**
  - Store user profile in Firestore (`users/{uid}`: displayName, email, photoURL, createdAt, lastSeenAt)
- [ ] Allow editing display name from a profile/settings area
- [ ] Auth guard: redirect unauthenticated users to `/login`
- [ ] Sign-out functionality

### Phase 2: Game Room Management

- [ ] **Firestore data model** for rooms:
  - `rooms/{roomId}`: hostId, roomCode, status (waiting/in_game/review), settings, createdAt, lastActivityAt
  - `rooms/{roomId}/players/{uid}`: displayName, joinedAt
- [ ] **Create room** — host creates a room, gets a short room code
- [ ] **Room list** (`/` home page) — list all active rooms with room code, host name, player count, status
- [ ] **Join room** — join by entering a room code, or tapping from the list
- [ ] **Room lobby view** (`/room/:id`) — show list of joined players, real-time updates via VueFire
- [ ] **Host controls in lobby**:
  - Kick/remove a player
  - Configure role composition (fully manual — pick each role slot)
  - "Start Game" button (enabled only when player count is 5–10 and roles are configured correctly)
- [ ] **Leave room** — player can leave voluntarily
- [ ] **Validation**:
  - Total roles must equal number of players
  - Player count must be 5–10
  - Cannot join a room that is `in_game`

### Phase 3: Role Assignment

- [ ] **Cloud Function: `assignRoles`**
  - Triggered by host (callable function)
  - Validates: correct number of roles, room is in `waiting` state, caller is host
  - Shuffles roles randomly
  - Writes each player's role to a **private subcollection**: `rooms/{roomId}/roles/{uid}`
  - Updates room status to `in_game`
- [ ] **Firestore security rules** for roles:
  - Each player can only read `rooms/{roomId}/roles/{uid}` where `uid` matches their own
  - Only the Cloud Function (admin SDK) can write roles
- [ ] **In-game view** — player sees:
  - "Tap to reveal your role" (hidden by default)
  - On tap: role name + team (Good/Evil) displayed with distinct styling
  - Tap again or timer to re-hide (optional)
- [ ] **Host: end game** — host can trigger transition to review state

### Phase 4: Post-Game Review

- [ ] **Cloud Function: `endGame`**
  - Triggered by host
  - Copies role assignments to a **public** location (or updates room status so rules allow read)
  - Updates room status to `review`
- [ ] **Review view** — all players see a list of every player + their role
  - Player names in one font, role names in a distinct font
  - Roles styled by team (Good vs Evil color coding)
- [ ] **Host: return to lobby** — resets room to `waiting`, clears role data
  - Host can then adjust settings and start a new game

### Phase 5: Polish & Hardening

- [ ] Handle edge cases:
  - Player disconnects/reconnects mid-game
  - Host leaves (transfer host? close room?)
  - Browser back/forward navigation
- [ ] Loading states and error handling throughout
- [ ] 30-day room cleanup — scheduled Cloud Function
- [ ] Mobile UX polish:
  - Touch-friendly tap targets
  - Responsive layout tested on various screen sizes
  - Smooth transitions between states
- [ ] Update `README.md` with project description, setup instructions, and usage
