const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PlatformTreasury...");
  const PlatformTreasury = await ethers.getContractFactory("PlatformTreasury");
  const treasury = await PlatformTreasury.deploy();
  await treasury.waitForDeployment();

  const addr = await treasury.getAddress();
  console.log("PlatformTreasury deployed to:", addr);

  fs.writeFileSync(path.join(__dirname, "..", "PlatformTreasury.txt"), addr);
  console.log("Saved to PlatformTreasury.txt");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
