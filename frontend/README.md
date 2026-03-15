> **Stack:** Vite + React + TypeScript + Tailwind CSS + Framer Motion
> **Backend:** Fastify + Socket.io + Discord.js (Lavalink-based music bot)
> **Auth:** Discord OAuth2 (session-based, httpOnly cookies)

---

## Table of Contents

1. [Pages & Routes](#1-pages--routes)
2. [Player Dashboard Features](#2-player-dashboard-features)
3. [Global Components](#3-global-components)
4. [Responsive Behavior](#4-responsive-behavior)
5. [Architecture & State Management](#5-architecture--state-management)
6. [Data Flow Diagram](#6-data-flow-diagram)
7. [Realtime Event Flow](#7-realtime-event-flow)
8. [usePlayer Reducer Actions](#8-useplayer-reducer-actions)
9. [Multi-tab Sync](#9-multi-tab-sync)
10. [Resilience & Fallbacks](#10-resilience--fallbacks)
11. [API Endpoint Reference](#11-api-endpoint-reference)
12. [Socket.io Events](#12-socketio-events)
13. [Integration Blueprint for New Frontends](#13-integration-blueprint-for-new-frontends)
14. [Environment Variables](#14-environment-variables)

---

## 1. Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Index` | Landing page: Hero, TrustedBy (live API), Features, MusicSources, FAQ, CTA |
| `/commands` | `Commands` | Dynamic bot commands from `GET /api/commands` |
| `/premium` | `Premium` | Premium plan page |
| `/login` | `Login` | Discord OAuth entry point |
| `/servers` | `Dashboard` | Guild list — servers with bot (→ Setup) / without bot (→ Invite with redirect) |
| `/player/:guildId` | `PlayerPage` | **Main dashboard** — all player features |
| `/profile` | `Profile` | User stats, Last.fm/Spotify connections with per-feature access gating |
| `/global-stats` | `GlobalStats` | Global listening stats, top guilds/tracks/artists |
| `/invite-callback` | `InviteCallback` | Post-invite redirect handler `?guild_id=` → `/servers?invited=` |
| `/privacy` | `PrivacyPolicy` | Static legal page |
| `/termsofservice` | `TermsOfService` | Static legal page |
| `/refundpolicy` | `RefundPolicy` | Static legal page |

---

## 2. Player Dashboard Features

All features below live inside `/player/:guildId` (the `PlayerPage` component).

| Feature | Component | Description |
|---------|-----------|-------------|
| **Now Playing** | `NowPlaying` | Album art (animated entry), title (linkable), author, requester |
| **Progress Bar** | `ProgressBar` | `requestAnimationFrame` interpolation, seek, live stream detection (red pulse), compact mobile mode |
| **Playback Controls** | `Controls` | Shuffle, Previous, Play/Pause, Next/Skip, Loop (none→song→queue), Autoplay toggle with access lock |
| **Bottom Player** | `BottomPlayer` | Fixed bar — mobile: thumbnail+title+like+play/pause+filter+compact progress. Desktop: 3-column (info / controls+progress / filter+volume). Voice guard overlay |
| **Queue** | `Queue` | Numbered list, "Now Playing" row with equalizer bars, per-item Play Now / Remove, mobile 3-dot dropdown via `createPortal` |
| **Search** | `SearchBar` | 400ms debounced, `GET /api/search?source=spsearch`, top 5 unique results, backdrop-blur dropdown. Disabled when not in VC / no player / different VC |
| **Filters** | `FiltersPanel` | 24 presets in 5 categories (Speed, Vocal, Effects, Equalizer, Character). Premium/voter/maintenance access gating |
| **Lyrics** | `LyricsView` | Full-screen overlay, synced LRC parsing, rAF position interpolation, mini-player left panel, auto-scroll |
| **Liked Songs** | `LikedSongsPanel` | Slide-in right panel, Play All, per-track play, unlike. Optimistic toggle via `useLikedSongs` |
| **Like Button** | `LikeButton` | Heart icon toggle on tracks (used in BottomPlayer, Queue, LikedSongsPanel) |
| **Volume** | `VolumeControl` | Slider + mute toggle with previous volume memory |
| **Top Daily Charts** | `RecommendedSection` | Horizontal scroll, `GET /api/top-chart?country=`, rank badges, hover zoom on covers |
| **Custom Playlists** | `PlaylistsView` | CRUD playlists, add Spotify tracks, play all / play single, private/public. Premium access gating |
| **Spotify Playlists** | `SpotifyPlaylists` | OAuth status, user's Spotify playlists grid, play entire playlist or individual tracks |
| **Radio** | `RadioView` | Country grid (flags, search, station counts) → Station list (play/stop, codec/bitrate info) |
| **Guild Stats** | `GuildStatsView` | Tracks played, listen time, top 10 tracks, top 10 artists |
| **Guild Settings** | `GuildSettingsView` | Prefix, Language, Voice Status, Control Buttons, DJ Role, 24/7 Mode, Autoplay, Setup Channel. Per-setting access gating |
| **Sidebar** | `PlayerSidebar` | Navigation: Main (Home, Profile, Servers, Global Stats), Music (Guild Stats, Liked Songs, Player, Radio), Playlist (Spotify, Custom), Settings. Mobile hamburger, tablet compact mode |

---

## 3. Global Components

| Component | Description |
|-----------|-------------|
| `BackgroundMusicPlayer` | Floating mini-player on non-player pages. Polls `GET /api/player/active` for active guild. Expandable FAB → card with controls, queue preview, disconnect |
| `Navbar` | Glass-card nav — links, Add to Discord, user dropdown (Profile, Servers, Global Stats, Logout). Mobile hamburger |
| `Footer` | Brand + social links, Quick Links, Support, Legal columns. Status indicator |
| `SmoothScroll` | Lenis-based smooth scroll wrapper (disabled on `/player/*` routes) |
| `TrustedBy` | Live marquee of top 12 servers from `GET /api/top-servers` |
| `BackgroundGlow` | Decorative gradient glow background |

---

## 4. Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| **Desktop** (lg+) | Full sidebar expanded, 3-column BottomPlayer, inline Queue actions |
| **Tablet** (md) | Compact sidebar (icons only), responsive grids |
| **Mobile** (sm) | Hamburger sidebar overlay, compact BottomPlayer (thumbnail+title+play+filter), Queue 3-dot dropdown via portal, compact ProgressBar |

---

## 5. Architecture & State Management

Frontend2 uses a **hook-based architecture** with no external state library (no Redux/Zustand).

```
AuthProvider (React Context)
  └── useAuth() → { user, status, login, logout }

PlayerPage
  ├── useSocket(guildId) → { socket, connected }
  ├── usePlayer(guildId, socket, userId) → { state, controls, refetch }
  ├── useLikedSongs() → { liked, likedUris, toggle, refetch }
  └── Local state: activeView, likedPanelOpen, filtersPanelOpen,
      lyricsOpen, inVoice, guildInfo, spotifyConnected
```

### Hooks Summary

| Hook | Purpose |
|------|---------|
| `useAuth` | React Context — session check (`GET /auth/me`), login redirect, logout |
| `useSocket` | Socket.io connection per `guildId`, subscribe/unsubscribe lifecycle |
| `usePlayer` | Core player state via `useReducer` — REST fetch + socket events + BroadcastChannel. Returns `{ state, controls, refetch }` |
| `useLikedSongs` | Liked songs list with optimistic toggle (`GET/POST /api/liked`) |
| `useIsMobile` | Media query hook for responsive breakpoints |

---

## 6. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND2 (Vite + React)                 │
│                                                                 │
│  useSocket ──socket.io──┐                                       │
│                         ▼                                       │
│  usePlayer ←── Socket events (trackStart, playerUpdate, etc.)   │
│      │                                                          │
│      ├── REST: GET /api/player/:guildId  (initial + refetch)    │
│      ├── REST: PATCH /api/player/:guildId (controls)            │
│      ├── REST: DELETE /api/player/:guildId (stop)               │
│      ├── REST: POST /api/player (create)                        │
│      └── BroadcastChannel (multi-tab sync)                      │
│                                                                 │
│  useAuth ←── GET /auth/me (session check)                       │
│      ├── login: redirect → /auth/discord                        │
│      └── logout: POST /auth/logout                              │
│                                                                 │
│  useLikedSongs ←── GET /api/liked                               │
│      └── toggle: POST /api/liked (optimistic)                   │
└─────────────────────────────────────────────────────────────────┘
            │ HTTP (axios, withCredentials)
            │ Socket.io (withCredentials)
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Fastify + Socket.io)                │
│                                                                 │
│  DashboardPlugin                                                │
│    ├── /auth/* (Discord OAuth, Spotify OAuth, session mgmt)     │
│    ├── /api/*  (proxy to /v1/* with session → user-id header)   │
│    └── Socket.io ← SocketBridge ← BotWsService ← ws://v1/ws   │
│                                                                 │
│  RestAPI                                                        │
│    └── /v1/*  (internal routes with auth token)                 │
│         ├── Player CRUD + controls                              │
│         ├── Search, Queue, Filters                              │
│         ├── Playlists CRUD                                      │
│         ├── Guild settings                                      │
│         ├── Stats (user, guild, global)                         │
│         └── External services (Last.fm, Spotify, Radio)         │
│                                                                 │
│  Bot (Discord.js + Lavalink)                                    │
│    ├── emitPlayerState() → ws → SocketBridge → socket.io → FE  │
│    └── dashboardEmit() → socket.io → FE (voice state changes)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Realtime Event Flow

```
Bot event (track starts, member joins, etc.)
  │
  ▼
emitPlayerState() / voiceStateUpdate
  │
  ├──[websocket]──► BotWsService (raw WS /v1/websocket)
  │                     │
  │                     ▼
  │                 SocketBridge.handleMessage()
  │                     │
  │                     ▼
  │                 io.to("guild:{id}").emit(event, data)
  │
  └──[direct]───► client.dashboardEmit() (memberJoin/Leave only)
                      │
                      ▼
                  io.to("guild:{id}").emit(event, data)
                      │
                      ▼
                  Frontend socket.on(event)
                      │
                      ▼
                  usePlayer dispatch(action)
                      │
                      ▼
                  React re-render
```

---

## 8. usePlayer Reducer Actions

| Action | Trigger | Effect |
|--------|---------|--------|
| `SET_STATE` | REST fetch, BroadcastChannel | Full state replace (smart merge preserves `member` + premium fields) |
| `TRACK_START` | Socket `trackStart` | Set current track, reset position, unpause |
| `PLAYER_UPDATE` | Socket `playerUpdate` | Update position |
| `PLAYER_PAUSE` | Socket `playerPause` | Set `pause: true` |
| `PLAYER_RESUME` | Socket `playerResume` | Set `pause: false` |
| `PLAYER_END` | Socket `playerEnd` | Clear current track, reset position |
| `PLAYER_DESTROY` | Socket `playerDestroy` | Set state to `null` |
| `PLAYER_STATE_UPDATE` | Socket `playerState` | Partial merge (loop, volume, queue, filter, etc.) |
| `MEMBER_UPDATE` | Socket `memberJoin`/`memberLeave` | Update `member` field |
| `SKIP_OPTIMISTIC` | Before skip/previous/skipToIndex | Reset position to 0, unpause |

---

## 9. Multi-tab Sync

Uses `BroadcastChannel("mewwme-player:{guildId}")`:

- On every `SET_STATE` or `PLAYER_STATE_UPDATE`, broadcasts state to other tabs
- On `PLAYER_DESTROY`, broadcasts destroy event
- Uses `updatedAt` timestamps to prevent stale overwrites

---

## 10. Resilience & Fallbacks

| Mechanism | Description |
|-----------|-------------|
| **Adaptive polling** | 5s interval when socket disconnects; stops when socket reconnects |
| **Visibility refetch** | Re-fetches state when tab becomes visible |
| **Socket reconnect** | Triggers full state refetch on `connect` |
| **Optimistic updates** | Skip, previous, seek, skipToIndex update UI immediately before API call |
| **Liked songs rollback** | Re-fetches on failed toggle |

---

## 11. API Endpoint Reference

### 11.1 Authentication

| Frontend Action | HTTP | Endpoint | Notes |
|----------------|------|----------|-------|
| Login | Redirect | `GET /auth/discord` | Opens Discord OAuth |
| OAuth Callback | — | `GET /auth/discord/callback` | Backend handles, redirects to `/servers` |
| Check Session | GET | `/auth/me` | Returns `DiscordUser` or 401 |
| Logout | POST | `/auth/logout` | Destroys session |
| Spotify OAuth | Redirect | `GET /auth/spotify` | Opens Spotify OAuth |

### 11.2 Player Controls

| Frontend Action | HTTP | Endpoint | Body |
|----------------|------|----------|------|
| Get state | GET | `/api/player/:guildId` | — |
| Create player | POST | `/api/player` | `{ guildId }` |
| Stop / destroy | DELETE | `/api/player/:guildId` | — |
| Skip | PATCH | `/api/player/:guildId` | `{ skipMode: "skip" }` |
| Previous | PATCH | `/api/player/:guildId` | `{ skipMode: "previous" }` |
| Pause / Resume | PATCH | `/api/player/:guildId` | `{ pause: true/false }` |
| Seek | PATCH | `/api/player/:guildId` | `{ position: ms }` |
| Volume | PATCH | `/api/player/:guildId` | `{ volume: 0-100 }` |
| Loop | PATCH | `/api/player/:guildId` | `{ loop: "none"/"song"/"queue" }` |
| Shuffle | PATCH | `/api/player/:guildId` | `{ shuffle: true }` |
| Autoplay | PATCH | `/api/player/:guildId` | `{ autoplay: true/false }` |
| Add to queue | PATCH | `/api/player/:guildId` | `{ add: ["uri1", ...] }` |
| Remove from queue | PATCH | `/api/player/:guildId` | `{ removeFromQueue: index }` |
| Skip to index | PATCH | `/api/player/:guildId` | `{ skipToIndex: index }` |
| Set filter | PATCH | `/api/player/:guildId` | `{ filter: { preset: "nightcore" } }` |
| Clear filter | PATCH | `/api/player/:guildId` | `{ filter: { clear: true } }` |
| Get lyrics | GET | `/api/player/:guildId/lyrics` | — |
| Find active | GET | `/api/player/active` | Returns `{ guildId }` |

### 11.3 Search & Charts

| Action | HTTP | Endpoint | Params |
|--------|------|----------|--------|
| Search tracks | GET | `/api/search` | `?identifier=...&source=spsearch` |
| Top charts | GET | `/api/top-chart` | `?country=US` (auto-detected) |

### 11.4 Playlists

| Action | HTTP | Endpoint | Body |
|--------|------|----------|------|
| Check access | GET | `/api/playlists/access` | — |
| List playlists | GET | `/api/playlists` | — |
| Create | POST | `/api/playlists` | `{ name, description, private }` |
| Delete | DELETE | `/api/playlists/:id` | — |
| Add track | POST | `/api/playlists/:id/tracks` | `{ uri }` (Spotify URL) |
| Remove track | DELETE | `/api/playlists/:id/tracks/:index` | — |
| Play all | POST | `/api/playlists/:id/play` | `{ guildId }` |
| Play single | POST | `/api/playlists/:id/play/:index` | `{ guildId }` |

### 11.5 Radio

| Action | HTTP | Endpoint | Params / Body |
|--------|------|----------|---------------|
| Countries | GET | `/api/radio/countries` | — |
| Stations | GET | `/api/radio/stations` | `?country=...` |
| Play | POST | `/api/radio/play` | `{ guildId, stationUrl, stationName }` |
| Stop | POST | `/api/radio/stop` | `{ guildId }` |

### 11.6 Guild

| Action | HTTP | Endpoint |
|--------|------|----------|
| List guilds | GET | `/api/guilds` |
| Voice check | GET | `/api/guilds/:guildId/voice` |
| Guild stats | GET | `/api/guild/:guildId/stats` |
| Get settings | GET | `/api/guild/:guildId/settings` |
| Update settings | PATCH | `/api/guild/:guildId/settings` |
| Locales | GET | `/api/guild/:guildId/settings/locales` |

### 11.7 User / Stats / Connections

| Action | HTTP | Endpoint |
|--------|------|----------|
| User stats | GET | `/api/stats` |
| Global stats | GET | `/api/global-stats` |
| Premium check | GET | `/api/user/premium?guildId=` |
| Liked songs | GET | `/api/liked` |
| Toggle like | POST | `/api/liked` |
| Last.fm status | GET | `/api/user/lastfm` |
| Last.fm login URL | GET | `/api/user/lastfm/login-url` |
| Last.fm disconnect | DELETE | `/api/user/lastfm` |
| Spotify status (legacy) | GET | `/api/user/spotify` |
| Spotify connect (legacy) | POST | `/api/user/spotify` |
| Spotify OAuth status | GET | `/api/spotify/status` |
| Spotify playlists | GET | `/api/spotify/playlists` |
| Top servers | GET | `/api/top-servers` |
| Bot commands | GET | `/api/commands` |

---

## 12. Socket.io Events

### Client Emits

| Event | Payload |
|-------|---------|
| `subscribe` | `guildId` (string) |
| `requestState` | — |
| `unsubscribe` | — |

### Server Emits

| Event | Payload | usePlayer Action |
|-------|---------|-----------------|
| `playerCreate` | Full state | `SET_STATE` or refetch |
| `trackStart` | `{ data: Track }` | `TRACK_START` |
| `playerUpdate` | `{ position }` | `PLAYER_UPDATE` |
| `playerPause` | `{}` | `PLAYER_PAUSE` |
| `playerResume` | `{}` | `PLAYER_RESUME` |
| `playerEnd` | `{}` | `PLAYER_END` |
| `playerDestroy` | `{}` | `PLAYER_DESTROY` |
| `playerState` | Full / partial state | `PLAYER_STATE_UPDATE` |
| `memberJoin` | `{ userId }` | `MEMBER_UPDATE(true)` |
| `memberLeave` | `{ userId }` | `MEMBER_UPDATE(false)` |

---

## 13. Integration Blueprint for New Frontends

### 13.1 Authentication Pattern

```
1. Create axios instance: baseURL = BACKEND_URL, withCredentials = true
2. On mount: GET /auth/me → authenticated or 401
3. Login: redirect to BACKEND_URL/auth/discord
4. Backend redirects back to /servers after OAuth
5. Logout: POST /auth/logout → clear state → redirect /
```

### 13.2 Player Integration Checklist

```
1. Connect socket.io to BACKEND_URL (withCredentials: true)
2. On connect → emit "subscribe" with guildId
3. Fetch initial state: GET /api/player/:guildId
4. Listen for socket events → dispatch to state reducer
5. Send controls via PATCH /api/player/:guildId
6. Check voice status: GET /api/guilds/:guildId/voice (poll when no player)
7. Guard all controls: user must be in same VC as bot (state.member !== false)
8. Create player: POST /api/player { guildId }
9. Destroy player: DELETE /api/player/:guildId
```

### 13.3 Access Gating Rules

```
Premium features (filters, autoplay, playlists, 24/7, etc.):
  - Check state.hasFilterAccess / state.hasAutoplayAccess
  - Check state.isPremium / state.isOwner / state.isAdmin
  - Use state.filterRequirement / state.autoplayRequirement for lock message
  - Three tiers:
      "Under Maintenance" → admin / owner only
      "Vote Required"     → must vote on top.gg
      "Premium Required"  → paid plan
  - Vote URL: state.voteUrl
```

### 13.4 Component → Endpoint Mapping

```
NowPlaying          ← state.current (from usePlayer)
ProgressBar         ← state.position + rAF interpolation
Controls            ← PATCH /api/player/:guildId
Queue               ← state.queue (from usePlayer)
SearchBar           ← GET /api/search?identifier=...&source=spsearch
FiltersPanel        ← PATCH { filter: { preset } } or { filter: { clear: true } }
LyricsView          ← GET /api/player/:guildId/lyrics
LikedSongsPanel     ← GET /api/liked + POST /api/liked (toggle)
PlaylistsView       ← GET/POST/DELETE /api/playlists/*
SpotifyPlaylists    ← GET /api/spotify/playlists + /playlists/:id/tracks
RadioView           ← GET /api/radio/countries + /stations, POST /radio/play + /stop
GuildStatsView      ← GET /api/guild/:guildId/stats
GuildSettingsView   ← GET + PATCH /api/guild/:guildId/settings
RecommendedSection  ← GET /api/top-chart?country=
TrustedBy           ← GET /api/top-servers
BackgroundMusicPlayer ← GET /api/player/active (polling)
```

### 13.5 Best Practices

| Rule | Detail |
|------|--------|
| **Always `withCredentials: true`** | Both axios and socket.io — session cookies are essential |
| **Timestamps for state freshness** | Use `updatedAt` to prevent stale overwrites in reducer |
| **Optimistic UI** | Skip, previous, seek, skipToIndex — update UI before API responds |
| **Guard voice membership** | Check `state.member` before any control action |
| **Adaptive fallback** | Poll every 5s when socket disconnects |
| **Visibility refetch** | Re-fetch on `document.visibilityState === "visible"` |
| **Multi-tab sync** | Use `BroadcastChannel` to keep multiple open tabs in sync |
| **Smart merge on SET_STATE** | Preserve `member` and premium fields when server payload lacks them |
| **Debounce search** | 400ms delay + AbortController for cancellation |
| **rAF for progress** | Use `requestAnimationFrame` for smooth progress bar interpolation |
| **Public endpoints** | `/api/commands`, `/api/top-servers`, `/api/global-stats` — no auth needed |
| **Invite flow** | Use `redirect_uri` to `/invite-callback` → `/servers?invited={guildId}` for same-tab redirect |
| **Filters disabled check** | No track playing → disable filter button |
| **SearchBar disabled** | `!inVoice \|\| !state \|\| state.member === false` |

---

## 14. Environment Variables

```bash
# Required
VITE_BACKEND_URL=http://localhost:3002
VITE_DISCORD_CLIENT_ID=your_discord_client_id

# Optional — Microsoft Clarity analytics (production only)
# Get from https://clarity.microsoft.com/
VITE_CLARITY_ID=your_clarity_id

# Note: Set Discord OAuth2 Redirect URI to:
# http://localhost:5173/invite-callback  (development)
# https://yourdomain.com/invite-callback (production)
```
