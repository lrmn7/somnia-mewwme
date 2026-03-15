import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { PRIVY_APP_ID, SOMNIA_CHAIN_ID } from "@/lib/config";
import type { ReactNode } from "react";

const somniaChain = {
  id: SOMNIA_CHAIN_ID,
  name: "Somnia Network",
  network: "somnia",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
  },
} as any;

export function PrivyWalletProvider({ children }: { children: ReactNode }) {
  // If no Privy App ID is configured, render children without Privy
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <BasePrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#a855f7", // purple-500 to match Web3 theme
        },
        loginMethods: ["discord"],
        embeddedWallets: {
          createOnLogin: "all-users",
          showWalletUIs: true,
        },
        defaultChain: somniaChain,
        supportedChains: [somniaChain],
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
