const { execSync } = require("child_process");
require("dotenv").config();

const TREASURY = process.env.TREASURY_ADDRESS;
const PREMIUM = process.env.PREMIUM_SUBSCRIPTION_ADDRESS;
const FACTORY = process.env.TIP_FACTORY_ADDRESS;
const PRICE = process.env.PRICE_PER_MONTH || "1000000000000000000"; // 1 STT
const BPS = process.env.DONATION_BPS || "150";

function verify(name, address, args) {
  if (!address) {
    console.log(`⏭ Skipping ${name} — address not set in .env`);
    return;
  }
  const argsStr = args.map((a) => `"${a}"`).join(" ");
  const cmd = `npx hardhat verify --network somnia-testnet ${address} ${argsStr}`;
  console.log(`\n🔍 Verifying ${name} at ${address}...`);
  console.log(`   ${cmd}\n`);
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log(`✅ ${name} verified!`);
  } catch (e) {
    console.log(`⚠️  ${name} verification failed (may already be verified)`);
  }
}

console.log("=== Mewwme Contract Verification ===\n");

verify("PlatformTreasury", TREASURY, []);
verify("PremiumSubscription", PREMIUM, [PRICE]);
verify("TipFactory", FACTORY, [TREASURY, BPS]);

console.log("\n=== Done ===");
console.log("Note: GuildTip contracts must be verified individually.");
console.log("See README.md for GuildTip verification instructions.");
