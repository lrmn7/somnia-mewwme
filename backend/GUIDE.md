# Mewwme — Complete Setup & Developer Guide

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Structure](#2-project-structure)
3. [Installation Guide](#3-installation-guide)
4. [Configuration Guide](#4-configuration-guide)
5. [Database Setup](#5-database-setup)
6. [Running the Bot](#6-running-the-bot)
7. [Web Dashboard](#7-web-dashboard)
8. [Security Notes](#8-security-notes)
   - [8.1 Dashboard Access Control (DASHBOARD_ACCESS)](#81-dashboard-access-control-dashboard_access)
   - [8.2 Premium System on Frontend](#82-premium-system-on-frontend)
9. [Troubleshooting](#9-troubleshooting)
10. [AI Music Chat](#10-ai-music-chat)

---

## 1. Project Overview

### What Is Mewwme?

Mewwme is a feature-rich Discord music bot built with **TypeScript**, **discord.js v14**, and **Lavalink v4**. It supports music playback from multiple sources, playlist management, audio filters, game commands, moderation logging, YouTube/Twitch notifications, a premium system, and a full web dashboard with a music player.

### Main Features

- **Music Playback** — Play from YouTube, YouTube Music, Spotify, SoundCloud, Deezer, Apple Music, Tidal, and direct HTTP streams via Lavalink v4.
- **Audio Filters** — 26 built-in filters: Nightcore, Bass, Bassboost, Vaporwave, Earrape, 3D, Karaoke, Equalizer, and more.
- **Playlists** — Create, import, edit, and play custom playlists. Import from Spotify.
- **Games** — 12 interactive games: 2048, Connect4, Hangman, Minesweeper, Trivia, Wordle, TicTacToe, and more.
- **Moderation Logging** — Tracks 100+ Discord events (bans, role changes, channel updates, voice state, etc.) with per-event toggle.
- **YouTube & Twitch Notifications** — Scheduled checks for new videos and live streams, posted to configured channels.
- **Last.fm Scrobbling** — Automatic scrobbling of played tracks to Last.fm accounts.
- **Spotify Integration** — OAuth2-based Spotify connection for importing playlists and viewing stats.
- **Premium System** — Tiered premium via redeemable codes, Patreon, and Ko-fi with per-user and per-guild quotas.
- **Welcomer** — Canvas-based welcome/leave images with customizable backgrounds.
- **Ticket System** — Create support tickets with transcript export.
- **Temporary Voice Channels** — Auto-created voice channels that expire.
- **DJ Role** — Restrict music commands to a specific role.
- **Sharding** — Built-in cluster manager for scaling across multiple shards.
- **Web Dashboard** — Next.js frontend with Discord OAuth2, music player, guild settings, liked songs, and Spotify stats.
- **REST API** — Fastify-based API for the dashboard, bot control, and external integrations.

### Supported Databases

| Driver     | Library                                    | Config Key |
|------------|--------------------------------------------|------------|
| JSON       | `mewwme.quick.db/JSONDriver`               | `json`     |
| MongoDB    | `mewwme.quick.db/MongoDriver` + `mongoose` | `mongodb`  |
| MySQL      | `mewwme.quick.db/MySQLDriver` + `mysql2`   | `mysql`    |
| PostgreSQL | `mewwme.quick.db/PostgresDriver` + `pg`    | `postgres` |

The database driver is selected in `config.yml` under `features.DATABASE.driver`. If an invalid driver is specified, the bot defaults to JSON.

### Dashboard & Web Player

The project includes a **Next.js** web frontend (`frontend/`) and a **Fastify** REST API (`src/web/`) that communicate via HTTP and Socket.IO. The dashboard provides:

- Discord OAuth2 login
- Music player with real-time playback via WebSocket
- Liked songs management
- Spotify playlist viewing
- Guild settings editor
- User profile and statistics
- Server list and global stats

---

## 2. Project Structure

### Root Directory

```
backup-new-bot/
├── config.example.yml       # Template configuration (copy to config.yml)
├── config.yml               # Active bot configuration (DO NOT COMMIT)
├── package.json             # Node.js dependencies and scripts
├── tsconfig.json            # TypeScript compiler configuration
├── Dockerfile               # Docker image definition
├── .env                     # Environment variable overrides (TOKEN, etc.)
├── .gitignore               # Git ignore rules
├── mewwme.database.json     # JSON database file (when using json driver)
├── patreon_cache.json        # Cached Patreon data
├── prisma/                  # Prisma schema (PostgreSQL modeling)
│   └── schema.prisma
├── docker/                  # Docker-related configs
│   ├── s31_mewwme.sql       # MySQL database dump
│   └── 2026/
│       ├── application.yml  # Lavalink server configuration
│       ├── lavalinkIPV6.yml # Lavalink IPv6 configuration
│       └── petitsorbet.yml  # Alternative Lavalink config
├── scripts/                 # Build and maintenance scripts
│   ├── build.js             # Build/zip/clean script
│   ├── clearSlash.js        # Remove all slash commands
│   ├── copyData.js          # Post-build data copy (languages, etc.)
│   ├── ecosystem.config.js  # PM2 configuration
│   └── getCampignId.js      # Patreon campaign ID fetcher
├── logs/                    # Log output directory
├── frontend/                # Next.js web dashboard
└── src/                     # Bot source code (TypeScript)
```

### `src/` Directory

```
src/
├── index.ts                 # Main entry point — creates Manager and starts bot
├── manager.ts               # Manager class — extends discord.js Client, initializes everything
├── @types/                  # TypeScript type definitions
│   ├── Config.ts            # Config interface (maps config.yml)
│   ├── Button.ts            # Player button types
│   ├── Cluster.ts           # Cluster/shard types
│   ├── Emoji.ts             # Emoji configuration types
│   ├── Interaction.ts       # Interaction types
│   ├── Lavalink.ts          # Lavalink connection types
│   └── ...
├── @guild-helpers/          # Guild-level helper systems
│   ├── AssistanceHandler.ts # Helpdesk/ticket assistance automation
│   ├── ModLogHandler.ts     # Moderation log event dispatcher
│   ├── StatisticsHandler.ts # User/guild statistics tracking
│   └── Modlog/              # Individual modlog event handlers
├── autofix/                 # Lavalink auto-recovery
│   ├── AutoFixLavalink.ts   # Automatic Lavalink failover
│   ├── CheckLavalinkServer.ts
│   └── GetLavalinkServer.ts
├── buttons/                 # Player button interactions
│   ├── Autoplay.ts, Loop.ts, Pause.ts, Skip.ts, Stop.ts, etc.
├── commands/                # Slash command categories
│   ├── Admin/               # Blacklist, Helpdesk, Maintenance, Premium, Tickets
│   ├── Filter/              # 26 audio filter commands
│   ├── Games/               # 12 game commands
│   ├── Info/                # About, Help, Stats, Privacy, Terms
│   ├── Music/               # 26 music commands (Play, Queue, Skip, Loop, etc.)
│   ├── Playlist/            # Playlist CRUD + Import + SaveQueue
│   └── Settings/            # 24/7, DJ Role, Language, Prefix, Setup, etc.
├── database/                # Database abstraction layer
│   ├── index.ts             # DatabaseService — selects driver based on config
│   ├── @types.ts            # DatabaseTable type (all table references)
│   ├── handler.ts           # Post-connection handler (cleanup, migrations)
│   ├── keyChecker.ts        # Validates database config keys at startup
│   ├── driver/              # Database driver implementations
│   │   ├── json.ts          # JSON file driver
│   │   ├── mongodb.ts       # MongoDB driver
│   │   ├── mysql.ts         # MySQL driver
│   │   └── postgres.ts      # PostgreSQL driver
│   ├── schema/              # 46 TypeScript interfaces defining data models
│   │   ├── AutoReconnect.ts, Playlist.ts, Premium.ts, Setup.ts, ...
│   └── setup/               # Database initialization
│       ├── table.ts         # Registers all 46 database tables
│       ├── setup.ts         # Initial setup routines
│       ├── premium.ts       # Premium expiry cleanup
│       └── lavalink.ts      # Lavalink node persistence
├── events/                  # Discord.js event handlers
│   ├── client/              # Client events (ready, error, etc.)
│   ├── guild/               # Guild events (join, leave, update)
│   ├── node/                # Lavalink node events (connect, disconnect, error)
│   ├── player/              # Music player events (trackStart, trackEnd, etc.)
│   ├── shard/               # Shard events (ready, disconnect, resume)
│   ├── track/               # Track events (resolve, error)
│   └── websocket/           # WebSocket events
├── gamecord/                # Game engine type declarations
├── handlers/                # Module loaders
│   ├── index.ts             # Master handler — loads all sub-handlers
│   ├── loadCheck.ts         # Lavalink autofix checker
│   ├── loadCommand.ts       # Command and button loader
│   ├── loadEvents.ts        # Event listener loader
│   ├── loadPlayer.ts        # Player event loader
│   ├── Commands/            # Command-specific middleware
│   └── Player/              # Player-specific middleware
├── languages/               # Localization files
│   └── en/                  # English translations
├── mewslink/                # Custom Lavalink client (Mewslink)
│   ├── Mewslink.ts          # Main Mewslink class
│   ├── main.ts              # MewslinkPlayer class
│   ├── Manager/             # Node and player management
│   ├── Node/                # Node connection handling
│   ├── Player/              # Player state management
│   ├── Plugin/              # Lavalink plugins
│   ├── Drivers/             # Lavalink protocol drivers
│   ├── Library/             # Discord.js library adapter
│   └── Utilities/           # Mewslink utilities
├── patreon/                 # Patreon webhook event handler
├── services/                # Business logic services
│   ├── ConfigDataService.ts # Parses config.yml into typed config object
│   ├── DeployService.ts     # Slash command deployment
│   ├── LoggerService.ts     # Winston-based logging with daily rotation
│   ├── ManifestService.ts   # Reads package.json metadata
│   ├── NotifyTwitch.ts      # Twitch live notification scheduler
│   ├── NotifyYoutube.ts     # YouTube upload notification scheduler
│   ├── PatreonService.ts    # Patreon pledge management
│   ├── KofiService.ts       # Ko-fi donation management
│   ├── TopggService.ts      # Top.gg vote tracking
│   ├── MysqlBackup.ts       # Scheduled MySQL database backups
│   ├── TempVoiceService.ts  # Temporary voice channel management
│   ├── FilterMenuService.ts # Audio filter select menu builder
│   └── ...
├── shard/                   # Sharding system
│   ├── index.ts             # Shard entry point
│   ├── ClusterManager.ts    # Cluster orchestration
│   ├── bootloader.ts        # Worker bootstrap
│   └── worker.ts            # Worker process
├── structures/              # Core abstractions
│   ├── Command.ts           # Base command class
│   ├── CommandHandler.ts    # Command execution router
│   ├── Collection.ts        # Extended Collection
│   ├── Localization.ts      # i18n wrapper
│   ├── Mewslink.ts          # Mewslink initializer
│   ├── Page.ts              # Embed pagination
│   ├── PageQueue.ts         # Queue pagination
│   └── QuickDatabasePlus.ts # Enhanced QuickDB wrapper with cache
├── utilities/               # Shared utility functions
│   ├── ConvertTime.ts       # Time conversion helpers
│   ├── FormatDuration.ts    # Duration formatting
│   ├── ProgressBar.ts       # Track progress bar renderer
│   ├── RadioStations.ts     # Radio station list
│   ├── ScrobbleToLastFM.ts  # Last.fm scrobble utility
│   ├── SpotifygetAccessToken.ts # Spotify token refresh
│   ├── TopArtist.ts / TopTrack.ts # Listening stats aggregation
│   └── ...
└── web/                     # Web server layer
    ├── RestAPI.ts            # Fastify REST API server (port from config)
    ├── WebServer.ts          # Express server for webhooks (Top.gg, Ko-fi, Last.fm)
    ├── player.ts             # Player REST routes (create, control, status)
    ├── websocket.ts          # WebSocket route for real-time player state
    ├── dashboard/            # Dashboard backend
    │   ├── DashboardPlugin.ts    # Fastify plugin — OAuth2, sessions, CORS, Socket.IO, all /api/* routes
    │   ├── DiscordOAuth.ts       # Discord OAuth2 helper
    │   ├── SpotifyOAuthService.ts # Spotify OAuth2 flow
    │   ├── UserProfileService.ts  # User profile CRUD
    │   ├── LikedSongsService.ts   # Liked songs CRUD
    │   ├── BotWsService.ts        # Bot-to-dashboard WebSocket bridge
    │   └── SocketBridge.ts        # Socket.IO bridge for real-time events
    └── route/                # Individual REST route handlers
        ├── getCommands.ts, getTopServers.ts, getGlobalStats.ts
        ├── getUserStats.ts, getGuildStats.ts, getUserPlaylists.ts
        ├── postCreatePlaylist.ts, deletePlaylist.ts, postPlayPlaylist.ts
        ├── guildSettings.ts, externalServices.ts
        └── ...
```

### How Everything Connects

```
                     ┌──────────────┐
                     │  config.yml  │
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │   index.ts   │  Entry point
                     └──────┬───────┘
                            │
                     ┌──────▼───────┐
                     │  manager.ts  │  Extends discord.js Client
                     └──────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │  handlers/  │  │  database/  │  │    web/     │
   │ loadCommand │  │   driver/   │  │  RestAPI.ts │
   │ loadEvents  │  │   schema/   │  │ WebServer   │
   │ loadPlayer  │  │   setup/    │  │ Dashboard   │
   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘
          │                │                 │
   ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
   │  commands/  │  │ MongoDB     │  │  frontend/  │
   │  events/    │  │ MySQL       │  │  (Next.js)  │
   │  buttons/   │  │ PostgreSQL  │  │  Socket.IO  │
   │  mewslink/  │  │ JSON        │  └─────────────┘
   └─────────────┘  └─────────────┘
```

1. **`index.ts`** reads `config.yml` via `ConfigDataService` and creates a `Manager` instance.
2. **`Manager`** (extends `Client`) initializes the Mewslink audio engine, collections, and calls `start()`.
3. **`start()`** boots: handlers (commands, events, player), database service, REST API, WebServer, notification services, and premium services.
4. **`DatabaseService`** picks the driver from config, connects, and registers all 46 tables.
5. **`RestAPI`** (Fastify) serves the `/v1/*` bot API and the `/api/*` dashboard proxy. The DashboardPlugin handles OAuth2, sessions, CORS, and Socket.IO.
6. **`WebServer`** (Express) handles webhooks from Top.gg, Ko-fi, and Last.fm callbacks.
7. **`frontend/`** is a standalone Next.js app that connects to the REST API.

---

## 3. Installation Guide

### Prerequisites

| Requirement      | Minimum Version | Notes                                |
|------------------|-----------------|--------------------------------------|
| **Node.js**      | 16.x+           | v18 or v20 LTS recommended           |
| **npm**          | 8.x+            | Comes with Node.js                   |
| **Java**         | 17+             | Required for Lavalink server         |
| **Lavalink**     | v4              | Music audio server                   |
| **Database**     | Any supported   | MongoDB, MySQL, PostgreSQL, or JSON  |
| **Git**          | Any             | For cloning the repository           |

### Step 1 — Clone the Repository

```bash
git clone https://github.com/lrmn7/mewwme.git
cd mewwme
```

### Step 2 — Install Dependencies (Bot)

```bash
npm install
```

### Step 3 — Install Dependencies (Frontend)

```bash
cd frontend
npm install
# or: pnpm install
cd ..
```

### Step 4 — Configure the Bot

```bash
cp config.example.yml config.yml
```

Edit `config.yml` with your settings. See [Section 4](#4-configuration-guide) for details.

### Step 5 — Create `.env` File (Optional)

```dotenv
TOKEN=your_discord_bot_token_here
SESSION_SECRET=random_64_char_hex_string
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=http://localhost:2555/auth/discord/callback
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

Values in `.env` override the corresponding values in `config.yml`.

### Step 6 — Build the Project

```bash
npm run build
```

This compiles TypeScript from `src/` to `dist/` and copies language/data files.

For a full build (format + compile + data copy):

```bash
npm run build:full
```

### Step 7 — Start the Bot

```bash
# Production
npm start

# Development (with hot reload via nodemon + tsx)
npm run dev
```

---

## 4. Configuration Guide

### 4.1 — Creating a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **"New Application"** → enter a name → click **"Create"**.
3. Go to the **"Bot"** tab on the left sidebar.
4. Click **"Add Bot"** → confirm.
5. Under the bot username, click **"Reset Token"** → confirm → **copy the token immediately**. You will not see it again.

### 4.2 — Enabling Privileged Intents

In the **"Bot"** tab of your Discord application:

1. Scroll down to **"Privileged Gateway Intents"**.
2. Enable all three:
   - **Presence Intent** — Required for presence/activity tracking.
   - **Server Members Intent** — Required for member events and statistics.
   - **Message Content Intent** — Required for prefix commands.
3. Click **"Save Changes"**.

### 4.3 — Generating an OAuth2 Invite URL

1. Go to the **"OAuth2"** tab → **"URL Generator"**.
2. Under **"Scopes"**, select:
   - `bot`
   - `applications.commands`
3. Under **"Bot Permissions"**, select at minimum:
   - `Administrator` (recommended for full functionality)
   - Or individually: Send Messages, Embed Links, Attach Files, Read Message History, Add Reactions, Use External Emojis, Connect, Speak, Manage Channels, Manage Roles, Manage Messages, View Channel
4. Copy the generated URL at the bottom.
5. Open the URL in your browser → select your server → click **"Authorize"**.

### 4.4 — Bot Configuration (`config.yml`)

#### `bot` Section

```yaml
bot:
  TOKEN: ${TOKEN}                    # Bot token (use .env override)
  EMBED_COLOR_MAIN: "#F4E0C7"       # Primary embed color (hex)
  EMBED_COLOR_SECOND: "#2F3136"     # Secondary embed color
  OWNER_ID: "YOUR_DISCORD_USER_ID"  # Bot owner's Discord user ID
  ADMIN: ["YOUR_DISCORD_USER_ID"]   # Admin user IDs (array)
  DEFAULT_VOLUME: 80                # Default playback volume (1–100)
  LANGUAGE: "en"                    # Default language
  DEBUG_MODE: false                 # Enable debug logging
  SHARDING_SYSTEM:
    shardsPerClusters: 1            # Shards per cluster
    totalClusters: 1                # Total clusters (increase for large bots)
  BOT_ACTIVITY1: "your heart 💖"    # Status rotation text
  BOT_ACTIVITY2: "your dream 🌙"
  BOT_ACTIVITY3: "your life 🍀"
  BOT_ACTIVITY_TYPE: 2             # 0=Playing, 1=Streaming, 2=Listening, 3=Watching, 4=Custom, 5=Competing
  BOT_STATUS: "idle"               # online, idle, dnd, invisible
```

**Where to get the token:**
- Discord Developer Portal → Your Application → Bot → Reset Token → Copy it.
- Place it in `.env` as `TOKEN=your_token_here` or directly in `config.yml` (not recommended).

#### `lavalink` Section

```yaml
lavalink:
  SPOTIFY:
    enable: true
    id: "your_spotify_client_id"         # From https://developer.spotify.com/dashboard
    secret: "your_spotify_client_secret"
    redirectUri: "https://your-domain.com/auth/spotify/callback"

  NODES:
    - host: "localhost"        # Lavalink server hostname
      port: 2333               # Lavalink server port
      name: "Main"             # Node display name
      auth: "youshallnotpass"  # Lavalink server password (must match application.yml)
      secure: false            # true if using SSL/TLS
      driver: "lavalink/v4"   # Must be lavalink/v4
```

**Spotify API Keys:**
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. Create an app → note the **Client ID** and **Client Secret**.
3. Add your redirect URI under "Redirect URIs" in the Spotify app settings.

You can add multiple Lavalink nodes for redundancy. The bot will distribute players across available nodes.

#### `features.DATABASE` Section

```yaml
features:
  DATABASE:
    ClearCache: "*/60 * * * * *"   # Cache clear schedule (cron)
    driver: "mongodb"               # mongodb, mysql, json, postgres
    config:
      # --- MongoDB ---
      uri: "mongodb://127.0.0.1:27017/mewwme"

      # --- MySQL ---
      # host: "localhost"
      # user: "root"
      # password: "password"
      # database: "mewwme"
      # port: 3306

      # --- PostgreSQL ---
      # host: "localhost"
      # user: "postgres"
      # password: "password"
      # database: "mewwme"

      # --- JSON ---
      # path: "./mewwme.database.json"
```

#### `features.RestAPI` Section

```yaml
features:
  RestAPI:
    auth: "your_secret_token"        # Internal API auth token (WebSocket + API)
    enable: true                     # Enable/disable the REST API
    port: 2555                       # API server port
    whitelist: ["meww.me"]           # Allowed domains (empty = allow all)
    SessionSecret: "random_hex..."   # Session encryption key (override with .env SESSION_SECRET)
    DiscordClientId: "..."           # Override with .env DISCORD_CLIENT_ID
    DiscordClientSecret: "..."       # Override with .env DISCORD_CLIENT_SECRET
    DiscordRedirectUri: "..."        # Override with .env DISCORD_REDIRECT_URI
    DashboardUrl: "http://localhost:3000"  # Override with .env FRONTEND_URL
```

#### `features.WebServer` Section

```yaml
features:
  WebServer:
    enable: true
    Port: 2444                       # Express webhook server port
    BaseUrl: "https://ws.example.com"
    TOPGG_VOTELOGS:
      Enable: true
      TopGgWebhookSecret: "..."
      LogVoteChannelID: "..."
    LAST_FM_SCROBBLED:
      Enable: true
      ApiKey: "..."                  # From https://www.last.fm/api/account/create
      Secret: "..."
      Callback: "https://ws.example.com/lastfm"
      scheduleScrobble: 60000
```

#### Other Config Sections

| Section | Purpose |
|---------|---------|
| `PremiumRole` | Premium role detection via guild role |
| `Patreon` | Patreon integration (access token, campaign ID, tier pricing) |
| `KoFi` | Ko-fi webhook integration (verification token, tier pricing) |
| `utilities.NotifyYoutube` | YouTube notification scheduling and API keys |
| `utilities.NotifyTwitch` | Twitch notification scheduling and API keys |
| `logchannel` | Channel IDs for various bot log outputs |
| `features.PLAY_COMMAND_ENGINE` | Default music search engines |
| `features.AUTOFIX_LAVALINK` | Automatic Lavalink failover settings |
| `features.MESSAGE_CONTENT` | Prefix command support |
| `COMMANDS_ACCESS` | Permission levels per command (Owner, Admin, Manager, Member, Voter, Premium) |
| `DASHBOARD_ACCESS` | Permission levels per dashboard feature (Member, Voter, Premium) |
| `emojis` | Custom emoji configuration for player buttons and menus |
| `WELCOMER_EVENTS` | Welcome/leave message configuration |

---

## 5. Database Setup

### JSON (Default / Development)

No setup required. The bot creates `mewwme.database.json` in the project root automatically.

```yaml
features:
  DATABASE:
    driver: "json"
    config:
      path: "./mewwme.database.json"
```

### MongoDB

1. **Install MongoDB** — [MongoDB Installation Guide](https://www.mongodb.com/docs/manual/installation/).
2. **Start MongoDB:**
   ```bash
   mongod --dbpath /data/db
   ```
3. **Configure:**
   ```yaml
   features:
     DATABASE:
       driver: "mongodb"
       config:
         uri: "mongodb://127.0.0.1:27017/mewwme"
   ```

   For MongoDB Atlas (cloud):
   ```yaml
   config:
     uri: "mongodb+srv://username:password@cluster.mongodb.net/mewwme?retryWrites=true&w=majority"
   ```

### MySQL

1. **Install MySQL** — [MySQL Installation Guide](https://dev.mysql.com/doc/refman/8.0/en/installing.html).
2. **Create database:**
   ```sql
   CREATE DATABASE mewwme;
   CREATE USER 'mewwme'@'localhost' IDENTIFIED BY 'your_password';
   GRANT ALL PRIVILEGES ON mewwme.* TO 'mewwme'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. **Configure:**
   ```yaml
   features:
     DATABASE:
       driver: "mysql"
       config:
         host: "localhost"
         user: "mewwme"
         password: "your_password"
         database: "mewwme"
         port: 3306
   ```
4. **Optional — Import schema:**
   ```bash
   mysql -u mewwme -p mewwme < docker/s31_mewwme.sql
   ```
5. **Optional — Enable automated backups:**
   ```yaml
   features:
     DATABASE:
       MYSQLBACKUP:
         Enable: true
         Schedule: "0 0 * * *"        # Daily at midnight
         Timezone: "Asia/Jakarta"
         ChannelId: "channel_id_here"  # Backup notification channel
   ```

### PostgreSQL

1. **Install PostgreSQL** — [PostgreSQL Installation Guide](https://www.postgresql.org/download/).
2. **Create database:**
   ```sql
   CREATE DATABASE mewwme;
   CREATE USER mewwme WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE mewwme TO mewwme;
   ```
3. **Configure:**
   ```yaml
   features:
     DATABASE:
       driver: "postgres"
       config:
         host: "localhost"
         user: "mewwme"
         password: "your_password"
         database: "mewwme"
   ```

### Prisma Schema (Reference)

A `prisma/schema.prisma` file is included for PostgreSQL reference modeling. It maps all 46 database tables to Prisma models. To use it:

```bash
npm install prisma @prisma/client
npx prisma generate
npx prisma db push    # Push schema to database
```

> **Note:** The bot currently uses `mewwme.quick.db` as its ORM, not Prisma. The Prisma schema serves as documentation and for future migration.

---

## 6. Running the Bot

### Development Mode

```bash
npm run dev
```

Uses `nodemon` + `tsx` for hot reload. Restarts automatically on file changes.

### Production Mode

**Option A — Build and start:**

```bash
npm run start:prod
```

This runs `build` → `build:data` → `start` in sequence.

**Option B — Manual steps:**

```bash
npm run build         # Compile TypeScript
npm run build:data    # Copy language/data files
npm start             # Start from dist/index.js
```

**Option C — With sharding:**

```bash
npm run start:shards
```

Starts the cluster manager (`dist/shard/index.js`) which spawns worker processes based on `SHARDING_SYSTEM` config.

**Option D — With PM2:**

```bash
npm install -g pm2
npm run build:full
pm2 start scripts/ecosystem.config.js --env production
```

**Option E — With Docker:**

```bash
docker build -t mewwme .
docker run -d --name mewwme \
  -e TOKEN=your_token \
  -p 2555:2555 \
  -p 2444:2444 \
  mewwme
```

### Starting the Lavalink Server

Download Lavalink from [GitHub](https://github.com/lavalink-devs/Lavalink/releases). A sample `application.yml` is in `docker/2026/`.

```bash
java -jar Lavalink.jar
```

Ensure the `host`, `port`, and `auth` in `config.yml` match your Lavalink `application.yml`.

### Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `TOKEN_INVALID` | Invalid or expired bot token | Regenerate token in Discord Developer Portal |
| `DISALLOWED_INTENTS` | Privileged intents not enabled | Enable all 3 intents in Developer Portal → Bot tab |
| `ECONNREFUSED` on database | Database server not running | Start your database server |
| `No Lavalink nodes available` | Lavalink not running or misconfigured | Start Lavalink; verify host/port/auth in config |
| `Port already in use` | Another process using the same port | Change port in config or stop the conflicting process |
| `Cannot find module` | Build not run after code changes | Run `npm run build` |
| `EINVAL` or `YAML parse error` | Malformed config.yml | Validate YAML syntax (check indentation) |

---

## 7. Web Dashboard

### Architecture

```
 Browser                     Fastify (port 2555)                     Bot
┌──────────┐   HTTP/WS     ┌─────────────────────┐                ┌─────┐
│ Next.js   │ ──────────▶  │  DashboardPlugin    │   Internal WS  │     │
│ Frontend  │ ◀──────────  │  /api/*  /auth/*     │ ◀────────────▶ │ Bot │
│ port 3000 │   Socket.IO  │  Socket.IO server    │                │     │
└──────────┘               └─────────────────────┘                └─────┘
                                    │
                            Express (port 2444)
                           ┌─────────────────────┐
                           │  WebServer           │
                           │  /vote  /kofi        │
                           │  /lastfm callback    │
                           └─────────────────────┘
```

### Running the Frontend

```bash
cd frontend
npm install   # or: pnpm install
npm run dev   # Development server on port 3000
```

For production:

```bash
cd frontend
npm run build
npm start
```

### Backend Configuration

The frontend communicates with the bot's Fastify REST API. Configure the connection:

**Frontend side** — set the backend URL in the frontend environment or in `frontend/lib/player-config.ts`:

```
BACKEND_URL=http://localhost:2555
```

**Backend side** — configure in `config.yml`:

```yaml
features:
  RestAPI:
    enable: true
    port: 2555
    DashboardUrl: "http://localhost:3000"   # Frontend URL for CORS
    DiscordRedirectUri: "http://localhost:2555/auth/discord/callback"
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/commands` | Public | List all bot commands |
| GET | `/api/top-servers` | Public | Top 12 servers by member count |
| GET | `/api/global-stats` | Public | Global bot statistics |
| GET | `/api/me` | Session | Current logged-in user |
| GET | `/api/guilds` | Session | User's mutual guilds with bot |
| GET | `/api/guild/:id/stats` | Session | Guild statistics |
| GET | `/api/guild/:id/settings` | Session | Guild settings |
| PATCH | `/api/guild/:id/settings` | Session | Update guild settings |
| GET | `/api/user/premium` | Session | User premium status + per-feature access flags |
| GET | `/api/playlists/access` | Session | Playlist feature access check |
| GET | `/api/playlists` | Session | User's playlists |
| POST | `/api/playlists` | Session | Create playlist |
| GET | `/auth/discord` | — | Start Discord OAuth2 flow |
| GET | `/auth/discord/callback` | — | OAuth2 callback |
| GET | `/auth/logout` | Session | Logout |

---

## 8. Security Notes

### Never Commit Secrets

- **Never commit** `config.yml`, `.env`, or any file containing tokens/secrets.
- Use `.env` for all sensitive values and ensure `.env` is in `.gitignore` (it already is).
- The `config.example.yml` uses `${TOKEN}` as a placeholder — it reads from the environment variable.

### Environment Variables

For production, prefer `.env` overrides over hardcoding in `config.yml`:

```dotenv
TOKEN=your_bot_token
SESSION_SECRET=your_64_char_random_hex
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://api.yourdomain.com/auth/discord/callback
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production
```

### Production Deployment Tips

1. **Use HTTPS** — Place the bot API behind a reverse proxy (nginx, Caddy) with SSL/TLS.
2. **Set `NODE_ENV=production`** — Enables secure cookies and trust proxy in Fastify.
3. **Use strong `SESSION_SECRET`** — Generate with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
4. **Restrict API whitelist** — Set `RestAPI.whitelist` to your domain(s).
5. **Use a process manager** — PM2 with `ecosystem.config.js` for auto-restart and log management.
6. **Database security** — Use strong passwords, restrict network access, enable SSL if supported.
7. **Regular backups** — For MySQL, enable `MYSQLBACKUP` in config. For others, set up external backup scripts.
8. **Rotate tokens periodically** — Regenerate bot token and API keys if compromised.

---

## 8.1. Dashboard Access Control (DASHBOARD_ACCESS)

### Overview

The `DASHBOARD_ACCESS` system controls which dashboard features require premium, voting, or are open to everyone. It works identically to `COMMANDS_ACCESS` but applies to the **web dashboard frontend** instead of bot commands.

This is a **config-driven** system — the owner can change access requirements from `config.yml` without modifying any code.

### Configuration

In `config.yml`:

```yaml
# Permission levels (from most to least restrictive):
# ["Premium"]  — Only premium users (or owner/admin) can access.
# ["Voter"]    — Must have voted on Top.gg. Premium users always bypass.
# ["Member"]   — Everyone can access (no restriction).
DASHBOARD_ACCESS:
  Filters: ["Voter"]
  TwentyFourSeven: ["Voter"]
  Autoplay: ["Voter"]
  LastFm: ["Voter"]
  Spotify: ["Voter"]
  SongRequest: ["Voter"]
  Language: ["Voter"]
  StatusVoiceChannel: ["Voter"]
  Prefix: ["Voter"]
  DjRole: ["Voter"]
  ControlButton: ["Voter"]
  Playlist: ["Voter"]
```

### Feature Keys

| Key | Dashboard Feature | Description |
|-----|-------------------|-------------|
| `Filters` | Audio Filters panel | Bass, Nightcore, Vaporwave, etc. |
| `TwentyFourSeven` | 24/7 Mode toggle | Keep bot in voice channel indefinitely |
| `Autoplay` | Autoplay toggle | Auto-queue related tracks when queue ends |
| `LastFm` | Last.fm connection | Connect/disconnect Last.fm account |
| `Spotify` | Spotify connection | Connect Spotify and import playlists |
| `SongRequest` | Song Request channel | Set up a dedicated song request channel |
| `Language` | Language selector | Change bot language per guild |
| `StatusVoiceChannel` | Voice status channel | Set a voice channel for status display |
| `Prefix` | Prefix setting | Change the bot's prefix per guild |
| `DjRole` | DJ Role selector | Restrict music commands to a specific role |
| `ControlButton` | Player controls | Configure which buttons appear on the player |
| `Playlist` | Custom Playlists | Create, edit, delete, and play custom playlists |

### Access Levels Explained

| Level | Who Can Access | Behavior |
|-------|---------------|----------|
| `Member` | Everyone | No overlay, no restriction |
| `Voter` | Users who voted on Top.gg | Shows "Vote Required" overlay with vote link. Premium users bypass automatically |
| `Premium` | Premium users/guild only | Shows "Premium Required" overlay. Owner/Admin bypass automatically |

### How It Works (Architecture)

```
  config.yml            Backend                         Frontend
┌────────────┐    ┌──────────────────┐    ┌──────────────────────────────┐
│ DASHBOARD_  │    │ resolveDashboard │    │ GuildSettingsView.tsx         │
│ ACCESS:     │───▶│ Access.ts        │───▶│ PlaylistsView.tsx             │
│   Filters:  │    │                  │    │ FiltersPanel.tsx              │
│   ["Voter"] │    │ getUserPremium   │    │                              │
│   ...       │    │ .ts              │    │ Shows overlay if no access:  │
└────────────┘    │                  │    │ • Blurred background         │
                  │ Returns per-     │    │ • Lock icon                  │
                  │ feature access   │    │ • "Vote/Premium Required"    │
                  │ flags + require- │    │ • Action button (Vote/Info)  │
                  │ ment levels      │    └──────────────────────────────┘
                  └──────────────────┘
```

1. **Backend** (`resolveDashboardAccess.ts`) reads `DASHBOARD_ACCESS` from config and evaluates the user's permission level (`buildDashboardUserPerm`).
2. **API** (`getUserPremium.ts` → `/v1/user/:userId/premium`) returns per-feature `access` (boolean) and `requirements` (string) objects.
3. **Frontend proxy** (`DashboardPlugin.ts` → `/api/user/premium`) forwards the data to the frontend.
4. **Frontend components** check `access.<feature>` and render a semi-transparent overlay with blur if access is denied, showing the requirement level and an action button.

### Frontend Overlay Behavior

When a user lacks access to a feature, the dashboard renders:

- A **blurred overlay** (`bg-black/40 backdrop-blur-[1px]`) over the feature section
- A **lock icon** (padlock SVG)
- A **title** indicating the requirement (e.g., "Vote Required" or "Premium Required")
- An **action button**:
  - For `Voter` requirement: "Vote on Top.gg" button linking to the vote URL
  - For `Premium` requirement: "Learn More" button (customizable)

Premium users, bot owners, and admins always bypass all overlays.

---

## 8.2. Premium System on Frontend

### Overview

The dashboard displays premium status in multiple locations so users always know their subscription state:

1. **Profile Page** (`/profile`) — Premium badge next to the username
2. **Player Sidebar** — Premium status below the server name
3. **Guild Settings** — Feature-gated overlays based on premium/voter status

### Profile Page Premium Badge

On the `/profile` page, a pill-shaped badge appears next to the user's display name:

| State | Badge | Style |
|-------|-------|-------|
| Premium active | ★ Premium | Green (`emerald-400`), filled star icon, green border |
| Not premium | ☆ Not Premium | Muted (`white/40`), outline star icon, subtle border |

**Data source:** The profile page fetches `/api/user/premium` (without `guildId`) alongside the existing stats, playlists, and liked songs requests. This checks **user-level** premium only.

```
GET /api/user/premium
→ { isPremium: boolean, isOwner: boolean, isAdmin: boolean, hasAccess: boolean, ... }
```

### Player Sidebar Premium Status

When a user visits a server's dashboard (e.g., `/player/[guildId]`), the sidebar shows premium status below the server name:

| State | Display | Style |
|-------|---------|-------|
| Premium active | `Premium: Activated` | Green (`#34d399`) |
| Not premium | `Premium: Not Activated` | Muted (`rgba(255,255,255,0.35)`) |

This appears in both **desktop** (lg:) and **mobile** sidebar header views.

**Data source:** The `PlayerState` from `usePlayer()` hook includes `isPremium?: boolean`, which is passed to `<PlayerSidebar>` as a prop. The player status endpoint (`/api/player/:guildId/status`) always includes the `guildId`, so both **user-level** and **guild-level** premium are checked.

### Guild-Level Premium

When a user visits a guild dashboard (e.g., `/player/[guildId]`), premium is resolved from **both** user-level and guild-level sources:

- **User-level:** Patreon/Ko-fi pledges tied to the user's Discord ID, redeem codes, Owner/Admin, PremiumRole
- **Guild-level:** Guilds redeemed with a Patreon or Ko-fi subscription (`redeemedGuilds` array in the pledge/subscription data)

Endpoints that operate in a guild context accept an optional `?guildId=` query parameter to enable guild-level checks:

```
GET /api/user/premium?guildId=123456789       ← checks both user + guild premium
GET /api/playlists/access                     ← user-only premium (playlists belong to user)
GET /api/player/:guildId/status               ← always guild-aware (guildId in path)
GET /api/guild/:guildId/settings              ← always guild-aware (guildId in path)
```

Without the `?guildId=` parameter, only user-level premium is checked (used on `/profile` page and `/api/playlists/access`).

### Premium Data Flow

```
  Backend                    Dashboard Proxy              Frontend
┌────────────────┐    ┌───────────────────────┐    ┌──────────────────────┐
│ Premium Sources │    │ DashboardPlugin.ts    │    │                      │
│ • Redeem codes  │    │                       │    │ /profile             │
│ • Patreon       │───▶│ GET /api/user/premium │───▶│   → isPremium badge  │
│ • Ko-fi         │    │ GET /api/player/:gid  │    │                      │
│ • PremiumRole   │    │                       │    │ /player/[guildId]    │
│ • Owner/Admin   │    │                       │    │   → sidebar status   │
└────────────────┘    └───────────────────────┘    │   → feature overlays │
                                                   └──────────────────────┘
```

Premium status is resolved from multiple sources (in order of priority):

1. **Bot Owner** (`OWNER_ID` in config) — always premium
2. **Admin** (`ADMIN` array in config) — always premium
3. **Redeemable codes** — `premium` table in database
4. **Patreon** — Active pledges above the minimum tier
5. **Ko-fi** — Active subscriptions
6. **PremiumRole** — Guild members with the configured premium role

### API Endpoints for Premium

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/user/premium` | Session | User premium status + per-feature access flags |
| GET | `/api/user/premium?guildId=ID` | Session | User + guild premium status (guild-context pages) |
| GET | `/api/playlists/access` | Session | Playlist feature access (user-only, playlists belong to user) |
| GET | `/api/player/:guildId/status` | Session | Player state including `isPremium` (always guild-aware) |

#### Response: `GET /api/user/premium`

```json
{
  "isPremium": false,
  "isOwner": false,
  "isAdmin": false,
  "hasAccess": false,
  "voteUrl": "https://top.gg/bot/your-bot-id/vote",
  "access": {
    "filters": true,
    "twentyFourSeven": true,
    "autoplay": true,
    "lastfm": true,
    "spotify": true,
    "songRequest": true,
    "language": true,
    "statusVoiceChannel": true,
    "prefix": true,
    "djRole": true,
    "controlButton": true,
    "playlist": true
  },
  "requirements": {
    "filters": "Voter",
    "twentyFourSeven": "Voter",
    "autoplay": "Voter",
    "lastfm": "Voter",
    "spotify": "Voter",
    "songRequest": "Voter",
    "language": "Voter",
    "statusVoiceChannel": "Voter",
    "prefix": "Voter",
    "djRole": "Voter",
    "controlButton": "Voter",
    "playlist": "Voter"
  }
}
```

### Files Involved

| File | Purpose |
|------|---------|
| `BACKEND/config.yml` → `DASHBOARD_ACCESS` | Access level config per feature |
| `BACKEND/src/web/route/resolveDashboardAccess.ts` | `buildDashboardUserPerm()`, `hasFeatureAccess()`, `getDashboardAccessConfig()` |
| `BACKEND/src/web/route/getUserPremium.ts` | `/v1/user/:userId/premium` endpoint — accepts optional `?guildId=` for guild-level checks |
| `BACKEND/src/web/dashboard/DashboardPlugin.ts` | Proxy routes: `/api/user/premium` (forwards optional `guildId`), `/api/playlists/access` (user-only) |
| `FRONTEND/app/profile/page.tsx` | Profile page with premium badge (user-only, no guildId) |
| `FRONTEND/components/player/PlayerSidebar.tsx` | Sidebar with premium status below server name |
| `FRONTEND/components/player/GuildSettingsView.tsx` | Guild settings with per-feature overlay gates |
| `FRONTEND/components/player/PlaylistsView.tsx` | Custom playlists — user-only premium check (playlists belong to user) |
| `FRONTEND/components/player/PlaylistsView.tsx` | Playlist view with access overlay |
| `FRONTEND/components/player/FiltersPanel.tsx` | Filters panel with access overlay |
| `FRONTEND/types/player.ts` | `PlayerState.isPremium`, `BotGuild` types |

---

## 9. Troubleshooting

### Bot Won't Start

1. **Check Node.js version:**
   ```bash
   node -v
   ```
   Must be 16.x or higher. Recommended: 18.x or 20.x LTS.

2. **Verify config.yml syntax:**
   ```bash
   node -e "const y = require('js-yaml'); const fs = require('fs'); y.load(fs.readFileSync('config.yml', 'utf8')); console.log('Valid YAML')"
   ```

3. **Ensure dependencies are installed:**
   ```bash
   rm -rf node_modules
   npm install
   ```

4. **Rebuild after changes:**
   ```bash
   npm run build
   ```

### No Music Playback

1. **Is Lavalink running?** Check that your Lavalink server is accessible:
   ```bash
   curl http://localhost:2333/version
   ```
2. **Do credentials match?** The `auth` in `config.yml` must match the `password` in Lavalink's `application.yml`.
3. **Is the bot in a voice channel?** The bot needs `Connect` and `Speak` permissions.
4. **Check Lavalink plugins.** YouTube may require the [youtube-plugin](https://github.com/lavalink-devs/youtube-source) with valid `poToken` configuration.

### Database Connection Fails

1. **Is the database server running?**
   ```bash
   # MongoDB
   mongosh --eval "db.runCommand({ ping: 1 })"

   # MySQL
   mysql -u root -p -e "SELECT 1"

   # PostgreSQL
   psql -U postgres -c "SELECT 1"
   ```
2. **Check config.yml credentials** — host, port, user, password, database name.
3. **Check firewall rules** — Ensure the database port is accessible from the bot server.

### Dashboard Not Loading

1. **Is the REST API running?** Check for log output: `Server running at port 2555`.
2. **Is the frontend running?** `cd frontend && npm run dev`.
3. **CORS issues?** Ensure `DashboardUrl` / `FRONTEND_URL` matches the actual frontend URL.
4. **OAuth2 not working?** Verify:
   - `DiscordClientId` matches your application's Client ID.
   - `DiscordClientSecret` matches your application's Client Secret.
   - `DiscordRedirectUri` matches the redirect URI registered in the Discord Developer Portal → OAuth2 → Redirects.

### Slash Commands Not Appearing

1. Commands deploy automatically on bot start via `DeployService`.
2. If commands are stale, wait up to 1 hour for Discord's cache to update (global commands).
3. To force-remove all commands:
   ```bash
   node scripts/clearSlash.js
   ```
   Then restart the bot.

### Sharding Issues

1. Ensure `SHARDING_SYSTEM` config matches your server capacity.
2. For small bots (< 2,500 guilds), use single shard:
   ```yaml
   SHARDING_SYSTEM:
     shardsPerClusters: 1
     totalClusters: 1
   ```
3. Start with shard entry point for multi-shard:
   ```bash
   npm run start:shards
   ```

### Premium / Patreon / Ko-fi Issues

1. Ensure `Patreon.Enable` or `KoFi.Enable` is set to `true` in config.
2. Verify webhook URLs are correctly pointed to your WebServer port.
3. Check log channels for error messages.
4. Ko-fi webhook URL format: `https://your-webserver-domain:2444/kofi`

### Log Files

Logs are written to the `logs/` directory with daily rotation via Winston. Check recent logs:

```bash
# View latest log
Get-Content logs/*.log -Tail 100          # PowerShell
tail -100 logs/*.log                       # Linux/Mac
```

Debug mode can be enabled in config for verbose output:

```yaml
bot:
  DEBUG_MODE: true
```

lyrics from https://lrclib.net/docs

---

## 10. AI Music Chat

The dashboard includes an AI-powered music chat assistant. It lives in the player sidebar under "AI Chat" and allows users to have natural conversations about music, get song recommendations, and play songs directly from the chat.

### 10.1 Architecture

```
┌──────────────────┐      HTTP       ┌──────────────────────┐
│   Frontend       │  ──────────────► │   Backend (Fastify)   │
│   (React/Vite)   │  ◄────────────  │                      │
└──────────────────┘                 └──────────┬───────────┘
                                                │
                              ┌─────────────────┼─────────────────┐
                              ▼                 ▼                 ▼
                     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                     │ Google       │  │ Artwork APIs │  │ mewwme.      │
                     │ Gemini AI    │  │ (Deezer,     │  │ quick.db     │
                     │              │  │  iTunes,     │  │ (Chat        │
                     │              │  │  Spotify)    │  │  History)    │
                     └──────────────┘  └──────────────┘  └──────────────┘
```

### 10.2 Configuration

Add the following to your `config.yml`:

```yaml
GeminiAiChat:
  Enable: true
  ApiKeys:
    - "YOUR_GEMINI_API_KEY_1"
    - "YOUR_GEMINI_API_KEY_2"
    - "YOUR_GEMINI_API_KEY_3"
  Models:
    - "gemini-2.5-flash"
    - "gemini-2.0-flash"
```

| Field | Type | Description |
|-------|------|-------------|
| `Enable` | boolean | Enable or disable the AI Chat feature |
| `ApiKeys` | string[] | One or more Google Gemini API keys. Keys rotate automatically on quota errors |
| `Models` | string[] | Ordered list of Gemini models. Falls back to next model on failure |

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

#### Dashboard Access

Control who can access AI Chat by setting the access level in `DASHBOARD_ACCESS`:

```yaml
DASHBOARD_ACCESS:
  AiChat: ["Member"]   # Options: Owner, Admin, Premium, Voter, Manager, Member
```

### 10.3 API Key & Model Fallback

The system supports multiple API keys and multiple models with automatic fallback.

**Fallback order:**
```
Key[0] → Model[0] → Model[1] → Model[2] → Model[3]
   ↓ (all models failed)
Key[1] → Model[0] → Model[1] → Model[2] → Model[3]
   ↓ (all models failed)
Key[2] → Model[0] → Model[1] → Model[2] → Model[3]
```

**Retryable errors** (triggers fallback):
- `429` — Rate limit
- `RESOURCE_EXHAUSTED` — Quota exceeded
- `503` — Service unavailable
- `404` — Model not found

Non-retryable errors stop immediately without further attempts.

### 10.4 API Endpoints

All endpoints require session authentication.

#### `POST /api/ai-chat`

Send a message to the AI and receive a response.

**Request:**
```json
{
  "message": "recommend some chill songs",
  "guildId": "1234567890"
}
```

**Response:**
```json
{
  "text": "here are some perfect tracks for chilling 🎵",
  "songs": [
    {
      "title": "Sunset Lover",
      "artist": "Petit Biscuit",
      "query": "Sunset Lover Petit Biscuit",
      "thumbnail": "https://e-cdns-images.dzcdn.net/images/cover/..."
    }
  ]
}
```

#### `GET /api/ai-chat/history`

Returns the latest 20 messages for the authenticated user.

**Response:**
```json
{
  "messages": [
    {
      "id": 0,
      "role": "user",
      "content": "hello",
      "songs": [],
      "createdAt": "2026-03-13T09:00:00.000Z"
    },
    {
      "id": 1,
      "role": "assistant",
      "content": "hey! what vibe are you going for today? 🎵",
      "songs": [],
      "createdAt": "2026-03-13T09:00:01.000Z"
    }
  ]
}
```

#### `POST /api/ai-chat/clear`

Clears all chat history for the authenticated user.

**Response:**
```json
{ "success": true }
```

### 10.5 Chat History & Database

Chat history is stored using `mewwme.quick.db` — the same database system the bot already uses. No additional database setup is required.

- **Table name:** `AiChatHistory`
- **Key:** User ID
- **Value:** Object containing the user's message array
- **Limit:** 50 messages per user (older messages are automatically pruned)
- **AI context:** Last 12 messages are sent to Gemini as conversation memory
- **UI display:** Last 20 messages are loaded when the user opens AI Chat

Since it uses the same QuickDB driver, the chat history automatically follows your database configuration:
- Using `json` driver → stored in `mewwme.database.json`
- Using `mysql` driver → stored in MySQL
- Using `postgres` driver → stored in PostgreSQL
- Using `mongodb` driver → stored in MongoDB

### 10.6 Song Artwork Fallback

When the AI recommends songs, the backend fetches album artwork using a 3-step fallback chain:

| Priority | Source | API Key Required | Notes |
|----------|--------|-----------------|-------|
| 1 | Deezer | No | Free, no rate limits. Returns `cover_big` (500x500) |
| 2 | iTunes / Apple Music | No | Free, no rate limits. Artwork resized to 600x600 |
| 3 | Spotify (via bot search API) | No (uses Lavalink) | May have rate limits |

If all sources fail, the frontend displays a gradient placeholder with a music icon.

All artwork lookups run in parallel for fast response times.

### 10.7 Smart Play Button

Each recommended song has a single play button (▶️) with smart behavior:

| Condition | Action | Toast Message |
|-----------|--------|---------------|
| No song currently playing | Play immediately | "Now playing: Song Title" |
| Song is currently playing | Add to queue | "Added to queue: Song Title" |
| User not in voice channel | Block action | "Join a voice channel first" |

### 10.8 AI Personality

MEWWME behaves as a friendly music companion, not a robotic assistant.

**Core rules:**
1. Be natural first — react like a human, don't jump to music recommendations
2. Short messages (< 3 words) are treated as casual chat — no song recommendations
3. Only recommend music when explicitly asked or when the conversation naturally leads there
4. When users share feelings — be supportive first, then gently offer music if appropriate
5. Capabilities are limited to music — politely decline coding, homework, or unrelated tasks

**Language adaptation:** The AI matches the user's language (English, Indonesian, casual slang).

**Song limit:** Maximum 10 songs per recommendation. Default is 2–4 songs.

**Generation config:**
```
temperature: 0.9    (creative, varied responses)
topK: 40
topP: 0.95
maxOutputTokens: 2048
```

### 10.9 File Reference

| File | Location | Purpose |
|------|----------|---------|
| `AiChatService.ts` | `src/web/dashboard/` | Core AI service — Gemini integration, prompt, song parsing, artwork enrichment |
| `AiChatHistoryDb.ts` | `src/web/dashboard/` | Chat history service — save, load, clear, prune via QuickDB |
| `AiChatHistory.ts` | `src/database/schema/` | Database schema for chat history |
| `DashboardPlugin.ts` | `src/web/dashboard/` | Route handler — 3 API endpoints for AI chat |
| `AiChatView.tsx` | `frontend/src/components/dashboard/` | Chat UI — message bubbles, song cards, play button |
| `Config.ts` | `src/@types/` | TypeScript interface for `GeminiAiChat` config |

### 10.10 Troubleshooting AI Chat

| Problem | Solution |
|---------|----------|
| "AI Chat isn't set up yet" | Add valid API key(s) to `GeminiAiChat.ApiKeys` in config.yml |
| All models return 404 | Some models may be retired. Check [Google AI models](https://ai.google.dev/models) for available models and update your `Models` list |
| "Error fetching" on all models | Check if your server can reach `generativelanguage.googleapis.com`. Verify API key is valid at [Google AI Studio](https://aistudio.google.com/apikey) |
| Quota exceeded (429) | Add more API keys to `ApiKeys` array for automatic rotation |
| Songs have no artwork | Verify your server has internet access to `api.deezer.com` and `itunes.apple.com` |
| Chat history lost | History is stored in the same database as the bot. Check your database driver is working |
| AI too robotic | The system prompt handles personality. Ensure you're using the latest `AiChatService.ts` |
| AI recommends songs for every message | This was fixed in the natural conversation update. The AI should only recommend songs when contextually appropriate |