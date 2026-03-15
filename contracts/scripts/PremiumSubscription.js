const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PremiumSubscription...");
  console.log("  Default tiers:");
  console.log("    Tier 1 (Basic): 2 STT, 1 server");
  console.log("    Tier 2 (Plus):  3 STT, 3 servers");
  console.log("    Tier 3 (Pro):   5 STT, 5 servers");

  const PremiumSubscription = await ethers.getContractFactory("PremiumSubscription");
  const premium = await PremiumSubscription.deploy();
  await premium.waitForDeployment();

  const addr = await premium.getAddress();
  console.log("PremiumSubscription deployed to:", addr);

  fs.writeFileSync(path.join(__dirname, "..", "PremiumSubscription.txt"), addr);
  console.log("Saved to PremiumSubscription.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
