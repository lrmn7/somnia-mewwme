import { http, createConfig } from "wagmi";
import type { Chain } from "viem";
import { injected } from "wagmi/connectors";

// Somnia Testnet Chain Definition
export const somniaTestnet: Chain = {
  id: 50312,
  name: "Somnia Testnet",
  nativeCurrency: {
    name: "Somnia Test Token",
    symbol: "STT",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://dream-rpc.somnia.network"],
    },
  },
  blockExplorers: {
    default: {
      name: "Somnia Explorer",
      url: "https://shannon-explorer.somnia.network",
    },
  },
  testnet: true,
};

// Wagmi config with injected connector (MetaMask, OKX, etc.)
export const wagmiConfig = createConfig({
  chains: [somniaTestnet],
  connectors: [injected()],
  transports: {
    [somniaTestnet.id]: http("https://dream-rpc.somnia.network"),
  },
});

// ════════════════════════════════════════════════════════════
//  Contract Addresses — loaded from frontend .env
// ════════════════════════════════════════════════════════════

export const PREMIUM_CONTRACT_ADDRESS = import.meta.env.VITE_PREMIUM_CONTRACT_ADDRESS || "";
export const TIPJAR_FACTORY_ADDRESS = import.meta.env.VITE_TIPJAR_FACTORY_ADDRESS || "";
export const TREASURY_CONTRACT_ADDRESS = import.meta.env.VITE_TREASURY_ADDRESS || "";

// ════════════════════════════════════════════════════════════
//  ABIs — separate per contract
// ════════════════════════════════════════════════════════════

// MewwmePremium ABI (for premium subscription on /premium page)
export const PREMIUM_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_discordUserId", type: "string" },
      { internalType: "string", name: "_plan", type: "string" },
    ],
    name: "purchasePremium",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_plan", type: "string" }],
    name: "getPlanPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_wallet", type: "address" }],
    name: "isPremiumActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "premiumGuildBasicPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "premiumGuildPlusPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "premiumGuildProPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: false, internalType: "string", name: "discordUserId", type: "string" },
      { indexed: false, internalType: "string", name: "plan", type: "string" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "quota", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "expiresAt", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "PremiumPurchased",
    type: "event",
  },
] as const;

// MewwmeFactory ABI (for creating guild contracts in dashboard)
export const FACTORY_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_guildId", type: "string" },
      { internalType: "address", name: "_owner", type: "address" },
    ],
    name: "createGuild",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_guildId", type: "string" }],
    name: "getGuild",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalGuilds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "string", name: "guildId", type: "string" },
      { indexed: false, internalType: "address", name: "guildAddress", type: "address" },
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "GuildCreated",
    type: "event",
  },
] as const;

// MewwmeGuildTip ABI (for donating and claiming in guild pages)
export const GUILD_TIP_ABI = [
  {
    inputs: [{ internalType: "string", name: "message", type: "string" }],
    name: "donate",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "claim",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getBalance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDonations",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "sender", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "fee", type: "uint256" },
      { indexed: false, internalType: "string", name: "message", type: "string" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "Donated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "owner", type: "address" },
      { indexed: false, internalType: "uint256", name: "amount", type: "uint256" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "Claimed",
    type: "event",
  },
] as const;

// ════════════════════════════════════════════════════════════
//  Admin ABIs — for contract owner/deployer management
// ════════════════════════════════════════════════════════════

// MewwmePremium Admin ABI (set prices, duration, treasury, admin)
export const PREMIUM_ADMIN_ABI = [
  {
    inputs: [
      { internalType: "string", name: "_plan", type: "string" },
      { internalType: "uint256", name: "_price", type: "uint256" },
    ],
    name: "setPremiumPrice",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_duration", type: "uint256" }],
    name: "setPremiumDuration",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_newTreasury", type: "address" }],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_newAdmin", type: "address" }],
    name: "transferAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "premiumDuration",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "premiumGuildBasicPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "premiumGuildPlusPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "premiumGuildProPrice",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// MewwmeTreasury Admin ABI (withdraw, balance, admin transfer)
export const TREASURY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" },
    ],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_to", type: "address" }],
    name: "withdrawAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_newAdmin", type: "address" }],
    name: "transferAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "balance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// MewwmeFactory Admin ABI (set treasury, transfer admin)
export const FACTORY_ADMIN_ABI = [
  {
    inputs: [{ internalType: "address", name: "_newTreasury", type: "address" }],
    name: "setTreasury",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_newAdmin", type: "address" }],
    name: "transferAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "treasury",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalGuilds",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Premium plan pricing (in STT, matching contract defaults)
export const PREMIUM_PLANS = {
  guild_basic: { name: "Guild Basic", price: "3", priceWei: "3000000000000000000" },
  guild_plus: { name: "Guild Plus", price: "7", priceWei: "7000000000000000000" },
  guild_pro: { name: "Guild Pro", price: "10", priceWei: "10000000000000000000" },
} as const;

// Helper to get explorer tx URL
export function getExplorerTxUrl(txHash: string): string {
  return `${somniaTestnet.blockExplorers.default.url}/tx/${txHash}`;
}

// Helper to get explorer address URL
export function getExplorerAddressUrl(address: string): string {
  return `${somniaTestnet.blockExplorers.default.url}/address/${address}`;
}

// Helper to truncate address
export function truncateAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
