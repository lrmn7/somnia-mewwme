import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useWallet } from "@/hooks/useWallet";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { premiumTiers, contracts, shortenAddress, PREMIUM_SUBSCRIPTION_ABI } from "@/lib/web3";
import { PRIVY_APP_ID } from "@/lib/config";
import { api } from "@/lib/api";

export function Web3PremiumCard() {
  const { wallet } = useWallet();
  const { hasWallet, getProviderAndSigner } = useEmbeddedWallet();
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [premiumActivated, setPremiumActivated] = useState(false);
  const [premiumExpiry, setPremiumExpiry] = useState<number | null>(null);

  const privyAvailable = !!PRIVY_APP_ID;
  const contractAvailable = !!contracts.premiumSubscription;

  const handleSubscribe = useCallback(async () => {
    if (!wallet.connected || !wallet.walletAddress) {
      toast.error("Please connect your wallet first from your Profile page");
      return;
    }

    if (!hasWallet) {
      toast.error("Privy embedded wallet not found. Please reconnect from Profile page.");
      return;
    }

    if (!contractAvailable) {
      toast.error("Subscription contract not deployed yet");
      return;
    }

    setProcessing(true);
    setTxHash(null);

    try {
      const { Contract, formatEther } = await import("ethers");
      const { signer, provider, address: userAddress } = await getProviderAndSigner();

      const tier = premiumTiers[selectedPlan];

      // Read tier price from contract
      const subContract = new Contract(contracts.premiumSubscription, PREMIUM_SUBSCRIPTION_ABI, signer);
      const [tierPrice]: [bigint] = await subContract.getTier(tier.tierId);

      console.log("[Web3] Tier:", tier.label, "tierId:", tier.tierId);
      console.log("[Web3] Price from contract:", formatEther(tierPrice), "STT");

      // Check user's STT balance
      const balance: bigint = await provider.getBalance(userAddress);
      console.log("[Web3] User STT balance:", formatEther(balance));
      if (balance < tierPrice) {
        toast.error(`Insufficient STT balance. You have ${formatEther(balance)} but need ${formatEther(tierPrice)} STT`);
        setProcessing(false);
        return;
      }

      // Single step: subscribe with native STT (no approve needed)
      toast.info("Processing subscription...");
      const subTx = await subContract.subscribe(tier.tierId, { value: tierPrice });
      const receipt = await subTx.wait();

      setTxHash(receipt.hash);

      // Verify on backend & activate premium
      toast.info("Verifying transaction & activating premium...");
      try {
        const { data } = await api.post("/api/web3/verify-subscription", {
          txHash: receipt.hash,
          tier: tier.id,
        });
        if (data.success) {
          setPremiumActivated(true);
          setPremiumExpiry(data.expiresAt);
          toast.success(`${tier.label} activated! You now have ${tier.quota} server quota${tier.quota > 1 ? "s" : ""}.`);
        }
      } catch (verifyErr: any) {
        console.error("[Web3] Verify error:", verifyErr);
        const msg = verifyErr?.response?.data?.error || "Could not auto-activate. Use 'Activate Premium' button below.";
        toast.warning(msg);
      }
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        toast.error("Transaction rejected by user");
      } else {
        console.error("[Web3] Subscribe error:", err);
        toast.error(err?.message?.slice(0, 100) ?? "Transaction failed");
      }
    } finally {
      setProcessing(false);
    }
  }, [wallet, selectedPlan, contractAvailable, hasWallet, getProviderAndSigner]);

  const handleManualVerify = useCallback(async () => {
    if (!txHash) return;
    setProcessing(true);
    try {
      const tier = premiumTiers[selectedPlan];
      const { data } = await api.post("/api/web3/verify-subscription", {
        txHash,
        tier: tier.id,
      });
      if (data.success) {
        setPremiumActivated(true);
        setPremiumExpiry(data.expiresAt);
        toast.success(`${tier.label} activated! You now have ${tier.quota} server quota${tier.quota > 1 ? "s" : ""}.`);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Verification failed. Please try again.";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  }, [txHash, selectedPlan]);

  return (
    <div id="subscribe" className="glass-card rounded-2xl p-6 sm:p-8 relative flex flex-col border-purple-500/30">
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-xs font-bold text-white flex items-center gap-1">
        Web3
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003zM12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z" />
        </svg>
      </div>

      <h3 className="text-xl font-bold text-center mb-4 text-purple-400">Pay with STT</h3>

      <div className="text-center mb-1">
        <span className="text-5xl font-extrabold text-foreground">
          {premiumTiers[selectedPlan].price}
        </span>
        <span className="text-lg text-muted-foreground ml-1">STT</span>
      </div>
      <p className="text-center text-sm text-muted-foreground mb-6">
        {premiumTiers[selectedPlan].label} ({premiumTiers[selectedPlan].quota} server{premiumTiers[selectedPlan].quota > 1 ? "s" : ""})
      </p>

      {/* Tier selector */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {premiumTiers.map((tier, i) => (
          <button
            key={tier.id}
            onClick={() => setSelectedPlan(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedPlan === i
                ? "bg-purple-500/20 border border-purple-500/40 text-purple-400"
                : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
            }`}
          >
            {tier.id === "basic" ? "Basic" : tier.id === "plus" ? "Plus" : "Pro"} {tier.price} STT
          </button>
        ))}
      </div>

      {/* Wallet status */}
      {wallet.connected && wallet.walletAddress && (
        <div className="text-center mb-4">
          <span className="text-xs text-muted-foreground">Paying from: </span>
          <span className="text-xs font-mono text-purple-400">{shortenAddress(wallet.walletAddress)}</span>
        </div>
      )}

      {/* Subscribe button */}
      <button
        onClick={handleSubscribe}
        disabled={processing || !wallet.connected || !privyAvailable || !contractAvailable}
        className="relative overflow-hidden w-full py-3 rounded-xl text-center font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-500 hover:opacity-90 transition-all duration-300 block mb-6 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {processing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : !wallet.connected ? (
          "Connect Wallet First"
        ) : !contractAvailable ? (
          "Coming Soon"
        ) : (
          `Pay ${premiumTiers[selectedPlan].price} STT`
        )}
      </button>

      {txHash && (
        <div className="text-center mb-4 space-y-2">
          <a
            href={`https://somnia.w3us.site/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 underline"
          >
            View transaction on explorer
          </a>
          {premiumActivated ? (
            <div className="mt-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <p className="text-sm font-semibold text-green-400">Premium Activated!</p>
              {premiumExpiry && (
                <p className="text-xs text-muted-foreground mt-1">
                  Expires: {new Date(premiumExpiry).toLocaleDateString()}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Go to your <a href="/profile" className="text-purple-400 underline hover:text-purple-300">Profile &rarr; Activated</a> tab to apply premium on a server.
              </p>
            </div>
          ) : (
            <button
              onClick={handleManualVerify}
              disabled={processing}
              className="mt-2 w-full py-2 rounded-lg text-sm font-medium text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all disabled:opacity-40"
            >
              {processing ? "Verifying..." : "Activate Premium"}
            </button>
          )}
        </div>
      )}

      <ul className="space-y-3 flex-1">
        {[
          "Pay with native STT token",
          "Somnia Network (low fees)",
          "Instant blockchain confirmation",
          "No credit card needed",
          "Quota stacking supported",
        ].map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
