const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
  if (!TREASURY_ADDRESS) throw new Error("Set TREASURY_ADDRESS in .env (deploy PlatformTreasury first)");

  const DONATION_BPS = process.env.DONATION_BPS || "150";

  console.log("Deploying TipFactory...");
  console.log("  Treasury:", TREASURY_ADDRESS);
  console.log("  Platform fee:", DONATION_BPS, "bps");

  const TipFactory = await ethers.getContractFactory("TipFactory");
  const factory = await TipFactory.deploy(TREASURY_ADDRESS, DONATION_BPS);
  await factory.waitForDeployment();

  const addr = await factory.getAddress();
  console.log("TipFactory deployed to:", addr);

  fs.writeFileSync(path.join(__dirname, "..", "TipFactory.txt"), addr);
  console.log("Saved to TipFactory.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
