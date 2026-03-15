
<div align="center">
  <img src="https://media.discordapp.net/attachments/123456789/logo.png" width="200" height="200" alt="Mewwme Logo">
  
  # 🎵 Mewwme - Advanced Music Bot
  
  [![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
  [![Discord.js](https://img.shields.io/badge/Library-Discord.js-green.svg)](https://discord.js.org/)
  [![Lavalink](https://img.shields.io/badge/Lavalink-Supported-orange.svg)](https://github.com/lavalink-devs/lavalink)
  
  *A robust, feature-rich, and fully customizable Discord Music Bot written in TypeScript.*
</div>

---

## ✨ Key Features

- **🛡️ 100% TypeScript:** Built for stability and ease of maintenance.
- **🎵 Advanced Music System:** Control buttons, filters, autoplay, and 24/7 mode.
- **🎨 Customizable UI:** Beautiful music cards with 19+ themes (`Mewcard`).
- **💰 Hybrid Premium System:** Integrated Patreon, Ko-fi, and Legacy database support.
- **🌍 Multi-Language:** Supports multiple languages for global communities.
- **💾 Flexible Database:** Supports MongoDB, MySQL, PostgreSQL, and JSON.
- **📻 Radio & Lofi:** Built-in support for Radio FM and Lofi modes.
- **⚡ Sharding & Auto-Reconnect:** Optimized for stability and scale.
- **🔌 Multi-Lavalink V4:** Supports multiple nodes with auto-fix capabilities.

---

## 🚀 Supported Music Sources

| Source | Default | With Lavalink Plugin |
| :--- | :---: | :---: |
| **YouTube** | ✅ | ✅ |
| **SoundCloud** | ✅ | ✅ |
| **Spotify** | ⚠️ | ✅ (LavaSrc) |
| **Deezer** | ⚠️ | ✅ (LavaSrc) |
| **Apple Music** | ⚠️ | ✅ (LavaSrc) |
| **Twitch** | ✅ | ✅ |
| **HTTP / File** | ✅ | ✅ |
| **Tiktok** | ❌ | ✅ (DuncteBot) |
| **PornHub** | ❌ | ✅ (DuncteBot) |

> **Legend:** ✅ Supported | ⚠️ Resolves via YouTube/SC | ❌ Unsupported without plugin


## 📜 Command Categories

| Category   | Commands                                                                                           |
|------------|----------------------------------------------------------------------------------------------------|
| DEV      | animated-avatar, animated-banner, announcement, blacklist-guild, blacklist-user, premium-code, helpdesk, helper, premium-remove, restart, bot-status, update                                       |
| INFO       | about, allcommands, dev, disclaimers, help, invite, ping, info, premium-check, lavalink, privacy-policy, rating, report, suggestions, terms-of-services |
| MUSIC      | autoplay, clearqueue, forward, join, lofi, loop, lyrics, pause, nowplaying, play, previous, queue, radio, remove, replay, resume, rewind, seek, shuffle, skip, stop, volume |
| PLAYLIST   | pl-add, pl-all, pl-create, pl-delete, pl-detail, pl-info, pl-editor, pl-play, pl-remove, pl-savequeue |
| FILTER     | 3d, bass, bassboost, chipmunk, china, daycore, doubletime, darthvader, equalizer, earrape, karaoke, nightcore, pitch, pop, rate, reset, slowmotion, soft, speed, superbass, television, treblebass, tremolo, vaporwave, vibrate, vibrato |
| SETTINGS   | 247, control, language, minecraft-setup, redeem, reset-guild, setup                                   |

## 📺 tutorials & guides

### 🎵 how to get lavalink server credentials (mewwme music app)

if you're confused about how to get a **free lavalink server** or how to set it up properly, you can follow this tutorial video:

* **youtube tutorial:** [click here to watch](https://www.youtube.com/watch?v=oQW6Z1UEcJg)

---

# 🎧 DJ Role System

Mewwme supports an optional **DJ Role System** to prevent abuse and keep music sessions controlled.

When **DJ Role is enabled**, only members with the configured DJ role (or administrators) can use specific high-impact music commands.

---

## ⚙️ How It Works

If DJ Mode is active:

* ✅ Users with the DJ Role can control playback & filters.
* ✅ Administrators bypass the DJ restriction.
* ❌ Regular members cannot use restricted commands.
* 🎵 Regular members can still use basic commands like `/play`, `/queue`, `/nowplaying`, etc.

---

## 🔐 Commands Restricted When DJ Role Is Enabled

The following commands require DJ Role:

```
/bass
/3d
/china
/bassboost
/chipmunk
/darthvader
/daycore
/doubletime
/earrape
/equalizer
/karaoke
/pop
/pitch
/nightcore
/rate
/slowmotion
/speed
/soft
/treblebass
/superbass
/television
/vaporwave
/tremolo
/vibrato
/vibrate
/autoplay
/clearqueue
/forward
/loop
/pause
/playnext
/previous
/remove
/replay
/rewind
/resume
/seek
/skip
/skipto
/stop
/volume
```

---

## 🛠️ Recommended Setup

1. Create a role in your Discord server (e.g., `DJ`).
2. Assign the role to trusted members.
3. Enable DJ Mode via your bot settings system.

---

### 🌐 use a public lavalink node (recommended for beginners)

if you don't want to host your own lavalink server, you can use this public lavalink node instead:

```yaml
# you can add more lavalink nodes here
NODES:
  - host: "lavalink.jirayu.net"
    port: 13592
    name: "NY"
    auth: "youshallnotpass"
    secure: false
    driver: "lavalink/v4"
```

⚠️ **note:** public nodes may sometimes be unstable or rate-limited.

---

## 🛠️ Installation Guide

### Option 1: Local / VPS
1.  **Clone/Download** the repository.
2.  Rename `config.example.yml` to `config.yml` and fill in your details.
3.  Install dependencies:
    ```bash
    yarn install
    # OR
    npm install
    ```
4.  Run the bot:
    * **Production:** `yarn start:prod`
    * **Development:** `yarn start:dev`

### Option 2: Pterodactyl Panel
1.  Download the **[Node.js Egg Template](https://github.com/mewwme/mewwme.github.io/blob/main/cdn/egg-node-j-s--universal.json)**.
2.  Upload files and rename `config.example.yml` to `config.yml`.
3.  Set **Startup Command**:
    * CMD 1: `npm install`
    * CMD 2: `npm run start:prod`

---

## ⚙️ Configuration

### Database Setup
Configure your database driver in `config.yml`. Supported drivers: `mongodb`, `mysql`, `postgres`, `json`.

```yaml
  DATABASE:
    driver: "postgres" # Note: mongodb, mysql, json, postgres
    config:
      host: "localhost"
      user: "me"
      password: "secret"
      database: "my_db"


  DATABASE:
    driver: "mysql" # Note: mongodb, mysql, json, postgres
    config:
      host: "localhost"
      port: port
      user: "me"
      password: "secret"
      database: "my_db"


  DATABASE:
    driver: "mongodb"  # Note: mongodb, mysql, json, postgres
    config:
      uri: "mongodb://127.0.0.1:27017/mewwme"  # mongodb uri



  DATABASE:
    driver: "json" # mongodb, mysql, json, postgres
    config: { path: "./mewwme.database.json" }
```

### Environment Variables (.env)

You can reference `.env` variables in your `config.yml` using `${VAR_NAME}` syntax.

---

# 💎 Premium & Permissions System Guide

This bot features a **"Unified Premium Check"** system. It automatically checks multiple sources (Patreon, Ko-fi, Roles, Legacy DB) to determine if a user or server has Premium access.

### 1. How it Works

A user/server is considered **Premium** if they meet **ANY** of the following criteria:

* ✅ **Patreon:** Active subscription in database.
* ✅ **Ko-fi:** One-time payment/subscription in database.
* ✅ **Role:** Has a specific role in your Support Server.
* ✅ **Legacy:** Manually added via code/database.
* ✅ **Store:** Discord App Directory entitlements.

### 2. Configuration (`config.yml`)

Fill in your Patreon and Ko-fi details to enable automatic processing.

```yaml
# System premium by patreon
Patreon:
  Enable: false #false or true
  GuildID: "GuildID your server official bot"
  RoleID: "RoleID your server official bot" # for reward role after paid premium
  PatreonAccessToken: "get from https://www.patreon.com/portal/registration/register-clients"
  PatreonCampignId: "Your campign id"
  PatreonLogChannelID: "Your channel id"
  PatreonClaimLogChannelID: "Your channel id"
  PatreonUnClaimLogChannelID: "Your channel id"
  PatreonExpiredLogChannelID: "Your channel id"
  PatreonPriceUser: 2 # $2.00
  PatreonServerTiers:
    - price: 3  # $3.00
      quota: 1  # Get 1 Server premium
    - price: 7  # $5.00
      quota: 3  # Get 3 Server
    - price: 10 # $7.00
      quota: 5 # Get 5 Server

# System premium by kofi
KoFi:
  Enable: false #false or true
  VerificationToken: "get from https://ko-fi.com/manage/webhooks?src=sidemenu"
  GuildID: "GuildID your server official bot"
  RoleID: "RoleID your server official bot" # for reward role after paid premium
  KofiLogChannelID: "Your channel id"
  KofiExpiredLogChannelID: "Your channel id"
  KofiDonationChannelID: "Your channel id"
  KofiClaimLogChannelID: "Your channel id"
  KofiUnClaimLogChannelID: "Your channel id"
  KofiPriceUser: 2
  KofiServerTiers:
    - price: 3
      quota: 1 
    - price: 7
      quota: 3 
    - price: 10
      quota: 5
```

### 3. Permission Codes (`Accessableby`)

Use these codes when developing new commands to restrict access.

| Permission Code | Description | Logic |
| --- | --- | --- |
| **`Premium`** | **(RECOMMENDED)** Grants access if User OR Guild has *any* premium source. | `OR` Condition (All Sources) |
| `PremiumRole` | Requires a specific Role in the Support Server. | Check Role ID |
| `Voter` | Free access but requires voting on Top.gg. | Check Vote API |
| `PatreonUser` | Specific to Patreon Donors. | Check Patreon DB |
| `PatreonGuild` | Specific to Servers claimed via Patreon. | Check Patreon DB |
| `KofiUser` | Specific to Ko-fi Donors. | Check Ko-fi DB |
| `KofiGuild` | Specific to Servers claimed via Ko-fi. | Check Ko-fi DB |
| `UserPremiumCode` | Legacy User Premium (Manual DB). | Check `premium` DB |
| `GuildPremiumCode` | Legacy Guild Premium (Manual DB). | Check `preGuild` DB |

**Example Usage in Command:**

```typescript
export default class implements Command {
  public accessableby = Accessableby.Premium; // Supports all premium types
  // ...
}

```

### 4. Setup Ko-fi Webhook

To enable automatic premium activation for Ko-fi:

1. Go to **Ko-fi** -> **API / Webhooks**.
2. Set Webhook URL: `https://your-bot-domain.com/kofi`.
3. Copy the **Verification Token** to `config.yml`.

> **Note:**
> * **Auto Claim:** If the Ko-fi email matches the Discord email (or Discord ID is provided), it activates automatically.
> * **Manual Claim:** If paid as a "Guest", the user gets a `Transaction ID`. They must run the command below to link it.
> 
> 

---

## 💻 Premium Commands

The bot uses a **Unified Command** structure for ease of use.

### ✅ Activate Premium

Activate premium on the current server.

> **Command:** `/premium claim`
> **Options:**
> * `platform`: Choose **Patreon** or **Ko-fi**.
> * `transaction_id` *(Optional)*: Required only for Ko-fi manual linking.
> 
> 

### ❌ Deactivate Premium

Remove premium from the current server and restore the user's quota.

> **Command:** `/premium unclaim`
> **Options:**
> * `platform`: Choose **Patreon** or **Ko-fi**.
> 
> 

---

## 👨‍💻 Developer Notes

* **Extensibility:** To add new payment gateways (e.g., Trakteer, Saweria), modify `PlayerControlService.ts` and the `Unified Premium Check` logic in `interactionCreate.ts` and `messageCreate.ts`.
* **Database:** Ensure your database schema matches the provided services structure for `Kofi` and `Patreon` tables.

---

## Dashboard WebSocket Events & `updatedAt` Field

All authoritative player state payloads now include an `updatedAt` field (epoch ms) for frontend reconciliation:

### REST endpoint

`GET /v1/players/:guildId` — returns full player state including `updatedAt: number` (server timestamp). Proxied by the dashboard as `GET /api/player/:guildId`.

### WebSocket events (via `client.wsl`)

| Event | Payload highlights | When emitted |
|---|---|---|
| `playerState` | Full state (loop, pause, volume, current, queue, **updatedAt**) | trackStart, trackEnd, player create, dashboard mutations, autoplay, shuffle |
| `trackStart` | `{ op, guild, data: TrackData }` | New track begins playing |
| `playerUpdate` | `{ op, guild, position }` | Position tick (~2–5 s) |
| `playerPause` / `playerResume` | `{ op, guild }` | Pause/resume toggle |
| `playerDestroy` | `{ op, guild }` | Player stopped/disconnected |
| `memberJoin` / `memberLeave` | `{ op, guild, userId }` | User joins/leaves bot's VC |

### Socket.io (SocketBridge)

- `subscribe(guildId)` — joins room, pushes immediate state snapshot
- `requestState` — client can request on-demand state push (emits `playerState` back)
- All `client.wsl` events are forwarded to the Socket.io room `guild:<guildId>`

---

<div align="center">
© 2026 Mewwme. All rights reserved.
</div>

```