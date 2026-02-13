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
- **Decision**: B. The number of players per room is capped at 10. Even with future customized rules, this is not going to exceed 12. This is really small.

### D2. Role data storage & access

**Goal:** Even though the game is intended for local play, we must prevent cheating via JavaScript (DevTools, console, network inspection, or modified client code). No client should ever receive another player’s role in any form the browser can read. Security is enforced server-side (Firestore rules or Cloud Functions); we do not rely on “we just don’t render it.”

**Invariant:** Role assignment is always done in a **Cloud Function** (admin SDK): the function shuffles roles and writes each player’s role. No client ever receives the full mapping. The only decision is how a client obtains **their own** role.

- **Option A — Subcollection + Firestore rules** (`rooms/{roomId}/roles/{uid}`):
  - The Cloud Function writes one doc per player: `roles/{uid}` with that player’s role.
  - **Security rules** allow read only when `request.auth.uid == uid` (and optionally when `resource.data` is the role doc under that path). So a client can read at most `rooms/{roomId}/roles/{currentUserUid}`. Any attempt to read another path (e.g. another player’s `uid`) is rejected by Firestore **server-side**; the SDK never returns that data. With correct rules, the client never receives other players’ roles.
  - Pros: VueFire real-time binding; one listener for “my role”; simple UX. Cons: Role data exists in Firestore, so rules must be correct and narrow (no `get()` on the whole collection).
  - **Anti-cheat:** Rules must forbid list/collection reads on `roles` (e.g. allow only single-document read where document id equals `request.auth.uid`). Then even a modified client cannot request another player’s doc successfully.

- **Option B — Callable Cloud Function** (`getMyRole(roomId)`):
  - The Cloud Function that assigns roles writes to a server-only store (e.g. Firestore with rules that block all client reads on the role collection), or the same subcollection but with **no read rules for clients**. The client never reads role data from Firestore; it calls a callable function with `roomId`, the function (using admin SDK) looks up only `rooms/{roomId}/roles/{request.auth.uid}` and returns that single role to the caller.
  - Pros: No role data is ever exposed to the client via Firestore; the client only ever sees the one role string in the function response. Cons: No real-time binding (call once after game start and cache in memory); slightly more code.

- **If roles can change during a game:** Option A supports this naturally: the backend updates the role doc and the client’s real-time listener receives the new value. Option B can support it too, but the client would need a way to know when to refetch (e.g. listen to a neutral “game state version” on the room and call `getMyRole` again when it changes, or poll). Both are viable; Option A is a better fit if we expect changeable roles.

- **Recommendation**: Option A — with strict rules (single-doc read, document id == auth uid), the client never receives other roles; VueFire fits well; real-time updates are free if roles ever change. Option B is equally safe and simpler from a “no data in client-visible store” perspective if we prefer that.
- **Decision**: A

### D3. Review phase: how to reveal all roles

- **Option A — Status-based security rules**: Firestore rules check `if room.status == 'review'` then allow reads on all role docs. No data copying, no extra Cloud Function — just a status change by host.
- **Option B — Copy to public subcollection**: `rooms/{roomId}/review/{uid}`. Duplicates data but cleanly separates secret from public.
- **Option C — Cloud Function returns all roles**: Client calls `getReviewData()`, function returns the full list. No Firestore reads for review.
- **Recommendation**: Option A — simplest, no duplication, leverages Firestore rules + VueFire naturally.
- **Decision**: _TBD_

**Storing and reviewing past games (after room is reset or dismissed)**
Right now we don’t persist past games: “return to lobby” clears role data, and when a room is deleted or expires, everything is gone. To support “review past games even after the room has changed or been dismissed”:

- **Option 1 — Room-scoped history:** When leaving review (return to lobby), before clearing current roles, write a snapshot to e.g. `rooms/{roomId}/pastGames/{gameId}` (timestamp, player list, role list). The room’s “past games” list is visible to anyone who can read the room. History is tied to the room: when the room is deleted or expires, that history is gone. Simple, no new top-level collection; good if we only care about history while the room still exists.
- **Option 2 — Standalone game history:** When a game enters review (or when leaving review), write a snapshot to a top-level collection e.g. `games` or `gameResults`: `gameId`, `roomId`, `timestamp`, `hostId`, `playerIds`, `roleAssignments` (or refs). Security rules: only participants (or users who were in that room) can read. Then “past games” can be queried by room or by “games I was in”; history survives the room being dismissed or expiring. Requires retention policy (e.g. same 30 days as rooms, or longer) and a small “past games” UI (list per room or per user).
- **Option 3 — No persistence (current):** Review is only for the current game; return to lobby clears everything. No “past games” feature. Easiest for MVP; we can add Option 1 or 2 later.

For MVP we can keep Option 3 and leave “past games” as a future enhancement; if we want it in scope, Option 1 is simpler, Option 2 is better for “review games after the room is gone.”

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

- [x] **Collect Avalon rules context** — Gather official or reference Avalon rules (roles, night phase, win conditions, quest sizes, etc.) into a doc (e.g. `docs/avalon-rules.md` or a section in PLANNING.md) and commit. Ensures the app and future features stay aligned with the game.
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
