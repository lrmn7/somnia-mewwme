import { Wallet, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { truncateAddress } from "@/lib/web3";

interface WalletConnectProps {
  compact?: boolean;
}

export default function WalletConnect({ compact = false }: WalletConnectProps) {
  const {
    address,
    isConnected,
    isBound,
    boundAddress,
    isCorrectChain,
    connectWallet,
    switchToSomnia,
  } = useWallet();

  // Show bound address if available (even if browser wallet not connected)
  if (isBound && boundAddress && !isConnected) {
    return (
      <Button
        onClick={connectWallet}
        variant="outline"
        size={compact ? "sm" : "default"}
        className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
      >
        <Wallet className="h-4 w-4" />
        <span className="font-mono text-xs">{truncateAddress(boundAddress)}</span>
      </Button>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <Button
        onClick={connectWallet}
        variant="outline"
        size={compact ? "sm" : "default"}
        className="gap-2 border-pink-500/30 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300"
      >
        <Wallet className="h-4 w-4" />
        {compact ? "Connect" : "Connect Wallet"}
      </Button>
    );
  }

  // Wrong chain state
  if (!isCorrectChain) {
    return (
      <Button
        onClick={switchToSomnia}
        variant="outline"
        size={compact ? "sm" : "default"}
        className="gap-2 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
      >
        <AlertTriangle className="h-4 w-4" />
        {compact ? "Switch" : "Switch to Somnia"}
      </Button>
    );
  }

  // Connected state — just show address
  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-default"
    >
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="font-mono text-xs">{truncateAddress(address || "")}</span>
    </Button>
  );
}
