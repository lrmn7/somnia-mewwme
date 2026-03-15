# Mewwme Smart Contracts Deployment Guide

All contracts use **native STT** (Somnia's native token, 18 decimals). No ERC20 tokens needed.

## Contracts Overview

| Contract | Purpose |
|---|---|
| **PlatformTreasury** | Collects 1.5% platform fees (STT) from tips. Owner can claim. |
| **PremiumSubscription** | Users pay STT to subscribe. Tiers: Basic (2 STT), Plus (3 STT), Pro (5 STT). |
| **TipFactory** | Creates GuildTip contracts per server. Points fees to PlatformTreasury. |
| **GuildTip** | Per-server tip jar. Deployed by TipFactory (not manually). |

## Prerequisites

1. **Node.js** >= 18
2. **STT tokens** in deployer wallet (for gas + contract deployment)

## Setup

```bash
cd contracts
npm install
cp .env.example .env
```

Edit `.env` and fill in your `PRIVATE_KEY`.

## Compile

```bash
npm run compile
```

## Deployment Order

**IMPORTANT**: Deploy in this exact order.

---

### Step 1: Deploy PlatformTreasury

```bash
npm run deploy:treasury
```

**Constructor:** no parameters (owner = deployer)

**Output:** Treasury address → copy to `.env` as `TREASURY_ADDRESS`

---

### Step 2: Deploy PremiumSubscription

```bash
npm run deploy:premium
```

**Constructor:**
- `_pricePerMonth`: `1000000000000000000` (1 STT in 18 decimals)

**How tiers work on-chain:**
- `subscribe(2)` + send 2 STT → **Guild Basic** (1 server quota)
- `subscribe(3)` + send 3 STT → **Guild Plus** (3 server quota)
- `subscribe(5)` + send 5 STT → **Guild Pro** (5 server quota)

---

### Step 3: Deploy TipFactory

First add `TREASURY_ADDRESS` from Step 1 to your `.env`, then:

```bash
npm run deploy:factory
```

**Constructor:**
- `_treasury`: PlatformTreasury address from Step 1
- `_defaultDeveloperDonationBps`: `150` (1.5% fee)

---

### Deploy All (sequential)

```bash
npm run deploy:all
```

---

## After Deployment — Frontend .env

```env
VITE_PREMIUM_SUBSCRIPTION_CONTRACT=<PremiumSubscription address>
VITE_TIP_FACTORY_CONTRACT=<TipFactory address>
VITE_SOMNIA_CHAIN_ID=50312
```

## After Deployment — Backend .env

```env
PREMIUM_SUBSCRIPTION_CONTRACT=<PremiumSubscription address>
TIP_FACTORY_CONTRACT=<TipFactory address>
```

## Admin Operations

### PremiumSubscription

| Function | Description |
|---|---|
| `setPricePerMonth(uint256)` | Change price per month (in wei, 18 decimals) |
| `setAllowedMonths(uint256, bool)` | Enable/disable a month duration |
| `withdraw()` | Withdraw all subscription STT to admin |

### TipFactory

| Function | Description |
|---|---|
| `setTreasury(address)` | Change the treasury address |
| `setDefaultDonationBps(uint256)` | Change platform fee (bps, max 1000 = 10%) |

### PlatformTreasury

| Function | Description |
|---|---|
| `claim()` | Withdraw all accumulated fee STT to owner |
| `claimAmount(uint256)` | Withdraw specific amount |
| `getBalance()` | View current STT balance |
| `transferOwnership(address)` | Transfer ownership |

### GuildTip (per-server, deployed by TipFactory)

| Function | Description |
|---|---|
| `claim()` | Server owner claims all tips |
| `getBalance()` | View current tip balance |
| `tip(string)` | Send STT tip with optional message (payable) |

## Fee Flow

```
User tips 10 STT → GuildTip contract
  ├── 0.15 STT (1.5%) → PlatformTreasury
  └── 9.85 STT → stays in GuildTip (claimable by server owner)
```

## Contract Verification

### Verify All at Once

```bash
npm run verify:all
```

Make sure `.env` has all contract addresses filled in first.

### Verify Individually

#### 1. PlatformTreasury

```bash
npx hardhat verify --network somnia-testnet <TREASURY_ADDRESS>
```

No constructor args.

#### 2. PremiumSubscription

```bash
npx hardhat verify --network somnia-testnet <PREMIUM_SUBSCRIPTION_ADDRESS> \
  "1000000000000000000"
```

Constructor args: `_pricePerMonth`

#### 3. TipFactory

```bash
npx hardhat verify --network somnia-testnet <TIP_FACTORY_ADDRESS> \
  "<TREASURY_ADDRESS>" \
  "150"
```

Constructor args: `_treasury`, `_defaultDeveloperDonationBps`

#### 4. GuildTip (per-server)

```bash
npx hardhat verify --network somnia-testnet <GUILD_TIP_ADDRESS> \
  "<guildId>" \
  "<guildOwnerAddress>" \
  "<TREASURY_ADDRESS>" \
  "150"
```

Constructor args: `_guildId`, `_owner`, `_developerWallet`, `_developerDonationBps`

---

## Network Info

- **Network**: Somnia (hardhat config name: `somnia-testnet`)
- **Chain ID**: 50312
- **RPC**: https://dream-rpc.somnia.network
- **Explorer**: https://somnia.w3us.site
- **Native Token**: STT (18 decimals)
