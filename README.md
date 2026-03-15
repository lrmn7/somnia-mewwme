# Mewwme Discord Music Bot with On-Chain Tipping & Premium via Somnia Reactivity

> A Discord music bot integrated with Somnia Network smart contracts. Servers can receive real-time tips in native STT tokens, and users can subscribe to premium plans all powered by **Somnia Reactivity** for instant on-chain event processing.

## What is Mewwme?

Mewwme is a full-featured Discord music bot that goes beyond audio playback. It brings Web3 functionality to Discord communities through the Somnia Network:

- **On-Chain Tipping** Each server deploys its own tip contract. Anyone can send STT tokens to support a community, with tips recorded transparently on-chain.
- **Premium Subscriptions** Users subscribe with native STT (no ERC-20 approval needed). Premium unlocks enhanced audio quality, 24/7 mode, audio filters, and more.
- **Somnia Reactivity** Real-time WebSocket-based event listener that processes `TipReceived` and `SubscriptionCreated` events the instant they are confirmed on-chain. No polling. No delays.

---

## How Somnia Reactivity Works in This Project

### The Problem

Traditional dApps rely on polling `eth_getLogs` or waiting for backend webhook calls to detect on-chain events. This creates delays, wasted RPC calls, and poor user experience especially for real-time use cases like tipping and subscription activation.

### The Solution: Somnia Reactivity

Somnia Reactivity is a native pub/sub system built into the Somnia blockchain. Instead of polling, our backend **subscribes** to contract events via WebSocket and receives them instantly when they occur on-chain.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│                                                                 │
│  User clicks "Tip 1 STT"  ──►  ethers.js sends tx to chain      │
│                                                                 │
│  Socket.IO listener  ◄──  receives real-time tip notification   │
│  UI updates instantly      (no page refresh needed)             │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                          Socket.IO
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                     BACKEND (Node.js + Fastify)                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              ReactivityService.ts                       │    │
│  │                                                         │    │
│  │  @somnia-chain/reactivity SDK                           │    │
│  │       │                                                 │    │
│  │       ▼                                                 │    │
│  │  WebSocket connection to:                               │    │
│  │  ws://api.infra.testnet.somnia.network/ws               │    │
│  │       │                                                 │    │
│  │       ▼                                                 │    │
│  │  sdk.subscribe({                                        │    │
│  │    eventContractSources: [                              │    │
│  │      "0x1e0E...29B9",  // PremiumSubscription           │    │
│  │      "0xABC...1234",   // GuildTip (per server)         │    │
│  │    ],                                                   │    │
│  │    onData: handleEvent  // fires instantly on-chain     │    │
│  │  })                                                     │    │
│  │       │                                                 │    │
│  │       ├── TipReceived event                             │    │
│  │       │     └── Push to frontend via Socket.IO          │    │
│  │       │         (tip appears in UI in real-time)        │    │
│  │       │                                                 │    │
│  │       └── SubscriptionCreated event                     │    │
│  │             └── Save to DB + activate premium instantly │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                     Somnia Network (Chain ID: 50312)
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                      SMART CONTRACTS                            │
│                                                                 │
│  PremiumSubscription ── subscribe(tierId) payable               │
│    └── emits SubscriptionCreated(wallet, tierId, amount, ...)   │
│                                                                 │
│  TipFactory ── createGuildTip(guildId, owner) → deploys:        │
│    └── GuildTip ── tip(message) payable                         │
│          ├── 1.5% fee → PlatformTreasury                        │
│          ├── 98.5% → server owner (claimable)                   │
│          └── emits TipReceived(guildId, sender, amount, ...)    │
└─────────────────────────────────────────────────────────────────┘
```

### ReactivityService — Core Implementation

The `ReactivityService` is a backend service that starts when the bot boots:

```typescript
import { SDK } from "@somnia-chain/reactivity";
import { createPublicClient, webSocket, defineChain, decodeEventLog } from "viem";

// 1. Define Somnia chain with WebSocket transport
const somniaTestnet = defineChain({
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: { decimals: 18, name: "STT", symbol: "STT" },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
      webSocket: ["ws://api.infra.testnet.somnia.network/ws"],
    },
  },
});

// 2. Create viem public client with WebSocket
const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: webSocket("ws://api.infra.testnet.somnia.network/ws", {
    reconnect: { delay: 2000, maxAttempts: 50 },
  }),
});

// 3. Initialize Somnia Reactivity SDK
const sdk = new SDK({ public: publicClient });

// 4. Subscribe to contract events
await sdk.subscribe({
  ethCalls: [],
  eventContractSources: [
    PREMIUM_SUBSCRIPTION_ADDRESS,
    ...guildTipContractAddresses,
  ],
  onData: (data) => {
    const decoded = decodeEventLog({
      abi,
      data: data.result.data,
      topics: data.result.topics,
    });

    if (decoded.eventName === "TipReceived") {
      // Push to frontend via Socket.IO — tip appears instantly in the UI
      socketIO.to(`guild:${guildId}`).emit("tipReceived", {
        sender, amount, message, txHash, timestamp,
      });
    }

    if (decoded.eventName === "SubscriptionCreated") {
      // Save to database + activate premium immediately
      db.premium.set(userId, {
        isPremium: true,
        expiresAt: Date.now() + 30_DAYS,
      });
    }
  },
});
```

### Why Reactivity Matters Here

| Without Reactivity | With Reactivity |
|---|---|
| Poll `eth_getLogs` every N seconds | Events arrive via WebSocket instantly |
| User tips → waits → refreshes page → sees result | User tips → tip appears in real-time |
| Premium subscription → manual verify → wait | Subscription → auto-activated in seconds |
| High RPC usage from constant polling | Zero polling, only event-driven |
| Delayed, bad UX | Instant, smooth UX |

---

## Smart Contracts

All contracts are deployed on **Somnia Testnet (Chain ID: 50312)** and use **native STT tokens** (no ERC-20).

| Contract | Address | Purpose |
|---|---|---|
| **PlatformTreasury** | `0xAC0d28A412de9574EF75D9da7a5047833d637E48` | Collects 1.5% platform fees from tips |
| **PremiumSubscription** | `0x1e0E25c7712D2a5ca4CD7DF5E0b9D0c3330F29B9` | Premium subscription (3 tiers, native STT) |
| **TipFactory** | `0xA3973faFDbCB67881e04D6008d5D8bC25AA0bF70` | Deploys per-server GuildTip contracts |
| **GuildTip** | _(per server)_ | Tip jar for each Discord server |

### Tip Flow

```
User sends 10 STT tip
       │
       ▼
  GuildTip.tip("Great server!")
       │
       ├── 0.15 STT (1.5%) ──► PlatformTreasury
       │
       └── 9.85 STT ──► stays in contract (claimable by server owner)
       │
       └── emits TipReceived ──► Somnia Reactivity ──► Backend ──► Socket.IO ──► Frontend
```

### Premium Tiers

| Tier | Price | Server Quota |
|---|---|---|
| Guild Basic | 2 STT/month | 1 server |
| Guild Plus | 3 STT/month | 3 servers |
| Guild Pro | 5 STT/month | 5 servers |

Quota stacking: purchasing multiple plans increases your total server slots.

---

## Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript (ESM)
- **API:** Fastify
- **Bot:** discord.js v14
- **Real-time:** Socket.IO
- **Blockchain:** `@somnia-chain/reactivity`, `viem`
- **Database:** Multi-driver (JSON/MySQL/MongoDB/PostgreSQL)

### Frontend
- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Styling:** TailwindCSS
- **Wallet:** Privy (`@privy-io/react-auth`)
- **Blockchain:** ethers.js v6
- **Real-time:** socket.io-client

### Smart Contracts
- **Language:** Solidity ^0.8.20
- **Framework:** Hardhat
- **Libraries:** OpenZeppelin (ReentrancyGuard)
- **Network:** Somnia Testnet (Chain ID: 50312)

---

## Features

### Music Bot
- High-quality audio playback from Spotify, YouTube, SoundCloud, Apple Music, Deezer, and more
- Queue management, audio filters, loop modes, autoplay
- 24/7 mode (premium)
- Web dashboard with real-time player controls

### Web3 Integration
- **Privy Wallet** Login with Discord, wallet auto-created (no MetaMask needed)
- **On-Chain Tips** Deploy a tip contract per server, anyone can tip with STT
- **Premium Subscriptions** Pay with native STT, auto-activated via Reactivity
- **Real-time Events** Tips and subscriptions processed instantly via Somnia Reactivity WebSocket
- **Community Page** Discover servers, view tip history (read from on-chain), tip servers directly
- **On-Chain History** All tip history read directly from blockchain (not stored in DB)

### Dashboard
- Server management with guild stats
- Tip history with on-chain verification (links to Somnia block explorer)
- Premium activation/deactivation per server
- Admin panel with platform-wide statistics

---

## Data Philosophy

- **Tips are NOT stored in the database.** Tip history is read directly from on-chain+save db with localStorage caching for performance.
- **Database is only for essential data:** user wallets, premium subscriptions, guild settings.
- **New events arrive via Somnia Reactivity** and are pushed to the frontend in real-time via Socket.IO.

---

## Getting Started

### Prerequisites
- Node.js >= 16
- Discord Bot Token
- Somnia Testnet STT (for transactions)

### Setup

```bash
# Backend
cd backend
npm install
cp config.example.yml config.yml  # Configure bot token, Web3 settings, etc.
npm run build
npm start

# Frontend
cd frontend
npm install
cp .env.example .env  # Configure VITE_BACKEND_URL, VITE_PRIVY_APP_ID, etc.
npm run dev

# Contracts (if deploying new)
cd contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network somnia-testnet
```

### Environment Variables (Frontend)

```env
VITE_BACKEND_URL=http://localhost:3002
VITE_PRIVY_APP_ID=your-privy-app-id
VITE_SOMNIA_CHAIN_ID=50312
VITE_PREMIUM_SUBSCRIPTION_CONTRACT=0x1e0E25c7712D2a5ca4CD7DF5E0b9D0c3330F29B9
VITE_TIP_FACTORY_CONTRACT=0xA3973faFDbCB67881e04D6008d5D8bC25AA0bF70
```

---

## Somnia Network Details

| Property | Value |
|---|---|
| Network | Somnia Testnet |
| Chain ID | 50312 |
| RPC URL | `https://dream-rpc.somnia.network` |
| WebSocket | `ws://api.infra.testnet.somnia.network/ws` |
| Block Explorer | `https://shannon-explorer.somnia.network` |
| Native Token | STT (18 decimals) |

---

## License

This project is built for the Somnia Network Reactivity Hackathon on DoraHacks.
