import { SOMNIA_CHAIN_ID, PREMIUM_SUBSCRIPTION_CONTRACT, TIP_FACTORY_CONTRACT } from "@/lib/config";

// Native token decimals (STT = 18 decimals)
const STT_DECIMALS = 18;

// Somnia network definition for Privy/wallet
export const somniaChain = {
  id: SOMNIA_CHAIN_ID,
  name: "Somnia Network",
  network: "somnia",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
    public: { http: ["https://dream-rpc.somnia.network"] },
  },
  blockExplorers: {
    default: { name: "Somnia Explorer", url: "https://somnia.w3us.site" },
  },
};

// PremiumSubscription contract ABI (per-tier pricing, payable with native STT)
export const PREMIUM_SUBSCRIPTION_ABI = [
  "function subscribe(uint256 tierId) external payable",
  "function tiers(uint256) external view returns (uint256 price, uint256 quota, bool active)",
  "function getTier(uint256 tierId) external view returns (uint256 price, uint256 quota, bool active)",
  "function tierCount() external view returns (uint256)",
  "function setTier(uint256 tierId, uint256 price, uint256 quota, bool active) external",
  "function admin() external view returns (address)",
];

// TipFactory contract ABI
export const TIP_FACTORY_ABI = [
  "function createGuildTip(string calldata guildId, address guildOwner) external returns (address)",
  "function getGuildContract(string calldata guildId) external view returns (address)",
  "function guildContracts(string) external view returns (address)",
];

// GuildTip contract ABI (payable with native STT)
export const GUILD_TIP_ABI = [
  "function tip(string calldata message) external payable",
  "function totalTips() external view returns (uint256)",
  "function getBalance() external view returns (uint256)",
  "function guildId() external view returns (string)",
  "function owner() external view returns (address)",
  "function claim() external",
  "event TipReceived(string indexed guildId, address indexed sender, uint256 amount, string message, uint256 timestamp)",
];

// Helper: format STT amount from wei to display
export function formatSTT(amount: string | bigint | number | undefined | null): string {
  if (amount === undefined || amount === null || amount === "") return "0";
  let value: bigint;
  if (typeof amount === "bigint") {
    value = amount;
  } else if (typeof amount === "number") {
    value = BigInt(Math.floor(amount));
  } else {
    value = BigInt(amount);
  }
  const divisor = BigInt(10) ** BigInt(STT_DECIMALS);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(STT_DECIMALS, "0").slice(0, 4);
  // Remove trailing zeros: 1.0000 → 1, 1.5000 → 1.5, 1.2500 → 1.25
  const trimmed = fractionStr.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : `${whole}`;
}

// Helper: parse STT display amount to wei
export function parseSTT(amount: number | string): bigint {
  const str = typeof amount === "number" ? amount.toString() : amount;
  const [whole, frac = ""] = str.split(".");
  const paddedFrac = frac.padEnd(STT_DECIMALS, "0").slice(0, STT_DECIMALS);
  return BigInt(whole + paddedFrac);
}

// Contract addresses
export const contracts = {
  premiumSubscription: PREMIUM_SUBSCRIPTION_CONTRACT,
  tipFactory: TIP_FACTORY_CONTRACT,
};

// Premium tiers (Web3 only — price in STT, tierId matches contract)
export const premiumTiers = [
  { id: "basic" as const, tierId: 1, label: "Guild Basic", price: 2, quota: 1 },
  { id: "plus" as const, tierId: 2, label: "Guild Plus", price: 3, quota: 3 },
  { id: "pro" as const, tierId: 3, label: "Guild Pro", price: 5, quota: 5 },
];

// Helper: shorten wallet address
export function shortenAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
