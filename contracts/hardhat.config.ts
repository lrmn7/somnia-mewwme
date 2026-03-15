import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    "somnia-testnet": {
      url: process.env.RPC_URL || "https://dream-rpc.somnia.network",
      chainId: Number(process.env.CHAIN_ID) || 50312,
      accounts:
        process.env.PRIVATE_KEY &&
        (process.env.PRIVATE_KEY.length === 64 ||
          (process.env.PRIVATE_KEY.startsWith("0x") &&
            process.env.PRIVATE_KEY.length === 66))
          ? [process.env.PRIVATE_KEY]
          : [],
    },
  },
  etherscan: {
    apiKey: {
      "somnia-testnet": "empty",
    },
    customChains: [
      {
        network: "somnia-testnet",
        chainId: 50312,
        urls: {
          apiURL: "https://somnia.w3us.site/api",
          browserURL: "https://somnia.w3us.site",
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};

export default config;
