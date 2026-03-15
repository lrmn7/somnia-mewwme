import { Check } from "lucide-react";
import { useState, useCallback, Fragment } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import BackgroundGlow from "@/components/BackgroundGlow";
import Footer from "@/components/Footer";
import { useWallet } from "@/hooks/useWallet";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { premiumTiers, contracts, shortenAddress, PREMIUM_SUBSCRIPTION_ABI } from "@/lib/web3";
import { PRIVY_APP_ID } from "@/lib/config";
import { api } from "@/lib/api";

const plans = [
  {
    name: "Guild Basic",
    price: "2 STT",
    color: "text-yellow-500",
    borderColor: "border-yellow-500/30",
    btnGradient: "bg-gradient-to-r from-yellow-600 to-yellow-500",
    servers: 1,
    tierIndex: 0,
    features: [
      "Better audio quality",
      "24/7 Mode",
      "Autoplay Mode",
      "Audio filters",
      "Change volume",
      "350 Songs in Queue",
      "Activate premium on 1 server",
      "Premium Role",
      "Bypass vote locks",
      "Default Volume",
      "Premium support",
    ],
    popular: false,
  },
  {
    name: "Guild Plus",
    price: "3 STT",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    btnGradient: "bg-gradient-to-r from-purple-600 to-purple-500",
    servers: 3,
    tierIndex: 1,
    features: [
      "Better audio quality",
      "Unlimited YouTube Links",
      "24/7 Mode",
      "Autoplay Mode",
      "Audio filters",
      "Change volume",
      "550 Songs in Queue",
      "Activate premium on 3 servers",
      "Premium Role",
      "Bypass vote locks",
      "Default Volume",
      "Control Buttons",
      "Premium support",
    ],
    popular: true,
  },
  {
    name: "Guild Pro",
    price: "5 STT",
    color: "text-pink-400",
    borderColor: "border-emerald-500/30",
    btnGradient: "bg-gradient-to-r from-pink-500 to-emerald-500",
    servers: 5,
    tierIndex: 2,
    features: [
      "Premium audio quality",
      "Unlimited YouTube Links",
      "24/7 Mode",
      "Autoplay Mode",
      "Audio filters",
      "Change volume",
      "Unlimited Songs in Queue",
      "Activate premium on 5 servers",
      "Premium Role",
      "Bypass vote locks",
      "Default Volume",
      "Control Buttons",
      "Premium support",
    ],
    popular: false,
  },
];

type TierKey = "Free" | "Guild Basic" | "Guild Plus" | "Guild Pro";

const comparisonData: { category: string; features: { name: string; values: Record<TierKey, string> }[] }[] = [
  {
    category: "General",
    features: [
      { name: "Premium Support", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "Discord Access", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
    ],
  },
  {
    category: "Music",
    features: [
      { name: "High Quality Music", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "Unlimited YouTube Links", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "Audio Filters", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "Bypass Vote Locks", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "Default Volume", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "Control Buttons", values: { Free: "\u2716", "Guild Basic": "\u2714", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "Songs In Queue", values: { Free: "150", "Guild Basic": "350", "Guild Plus": "550", "Guild Pro": "\u221e" } },
    ],
  },
  {
    category: "Customization",
    features: [
      { name: "Custom Playlist", values: { Free: "\u2716", "Guild Basic": "\u2716", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "AI Chat", values: { Free: "\u2716", "Guild Basic": "\u2716", "Guild Plus": "\u2714", "Guild Pro": "\u2714" } },
      { name: "20+ Languages", values: { Free: "\u2716", "Guild Basic": "\u2716", "Guild Plus": "\u2716", "Guild Pro": "\u2714" } },
    ],
  },
];

const tiers: TierKey[] = ["Free", "Guild Basic", "Guild Plus", "Guild Pro"];

const Premium = () => {
  const [selectedTier, setSelectedTier] = useState<TierKey>("Guild Plus");
  const [payingTier, setPayingTier] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [premiumActivated, setPremiumActivated] = useState(false);
  const [premiumExpiry, setPremiumExpiry] = useState<number | null>(null);

  const { wallet } = useWallet();
  const { hasWallet, getProviderAndSigner } = useEmbeddedWallet();
  const privyAvailable = !!PRIVY_APP_ID;
  const contractAvailable = !!contracts.premiumSubscription;

  const handleSubscribe = useCallback(async (tierIndex: number) => {
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
    setPremiumActivated(false);

    try {
      const { Contract, formatEther } = await import("ethers");
      const { signer, provider, address: userAddress } = await getProviderAndSigner();
      const tier = premiumTiers[tierIndex];

      const subContract = new Contract(contracts.premiumSubscription, PREMIUM_SUBSCRIPTION_ABI, signer);
      const [tierPrice]: [bigint] = await subContract.getTier(tier.tierId);

      const balance: bigint = await provider.getBalance(userAddress);
      if (balance < tierPrice) {
        toast.error(`Insufficient STT balance. You have ${formatEther(balance)} but need ${formatEther(tierPrice)} STT`);
        setProcessing(false);
        return;
      }

      toast.info("Processing subscription...");
      const subTx = await subContract.subscribe(tier.tierId, { value: tierPrice });
      const receipt = await subTx.wait();
      setTxHash(receipt.hash);

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
        const msg = verifyErr?.response?.data?.error || "Could not auto-activate. Click 'Activate Premium' below.";
        toast.warning(msg);
      }
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        toast.error("Transaction rejected by user");
      } else {
        toast.error(err?.message?.slice(0, 100) ?? "Transaction failed");
      }
    } finally {
      setProcessing(false);
    }
  }, [wallet, contractAvailable, hasWallet, getProviderAndSigner]);

  const handleManualVerify = useCallback(async (tierIndex: number) => {
    if (!txHash) return;
    setProcessing(true);
    try {
      const tier = premiumTiers[tierIndex];
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
      toast.error(err?.response?.data?.error || "Verification failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [txHash]);

  const closeModal = () => {
    if (!processing) {
      setPayingTier(null);
      setTxHash(null);
      setPremiumActivated(false);
      setPremiumExpiry(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <BackgroundGlow />
      <Navbar />
      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <h1 className="text-4xl text-mewwme sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3">
            PREMIUM
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="text-3xl sm:text-4xl inline-block"
            >
              ⭐
            </motion.span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Unlock the complete experience with no limits or restrictions.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div key={plan.name} className={`glass-card rounded-2xl p-6 sm:p-8 relative flex flex-col ${plan.popular ? "border-purple-500/40" : plan.borderColor}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 text-xs font-bold text-background flex items-center gap-1">
                  Most Popular
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                    className="inline-block"
                  >
                    ⭐
                  </motion.span>
                </div>
              )}
              <h3 className={`text-xl font-bold text-center mb-4 ${plan.color}`}>{plan.name}</h3>
              <div className="text-center mb-1">
                <span className="text-5xl font-extrabold text-foreground">{plan.price}</span>
              </div>
              <p className="text-center text-xs text-muted-foreground mb-1">STT /month</p>
              <p className="text-center text-sm text-muted-foreground mb-6">
                Activate premium on {plan.servers} server{plan.servers > 1 ? "s" : ""}
              </p>

              <button
                onClick={() => setPayingTier(plan.tierIndex)}
                className={`relative overflow-hidden w-full py-3 rounded-xl text-center font-semibold text-foreground ${plan.btnGradient} hover:opacity-90 transition-all duration-300 block mb-6 group`}
              >
                <span className="relative z-10">Get Started</span>
                <motion.div
                  className="absolute top-0 left-0 h-full w-[40%] bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-0"
                  animate={{ x: ["-200%", "350%"] }}
                  transition={{
                    repeat: Infinity,
                    duration: 2.5,
                    ease: "easeInOut",
                    repeatDelay: 0.5,
                  }}
                />
              </button>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.color}`} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Quota stacking note */}
        <p className="text-center text-sm text-muted-foreground max-w-2xl mx-auto mb-16">
          Quota stacking: Purchase multiple plans to increase your server slots.
          Each subscription has its own 30-day billing cycle.
        </p>

        {/* Comparison Table */}
        <div className="max-w-4xl mx-auto">

          {/* Tier selector for mobile ONLY */}
          <div className="flex sm:hidden items-center justify-center gap-2 mb-8 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">View Perks For:</span>
            {tiers.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  selectedTier === tier
                    ? "bg-pink-500/20 border border-pink-500/40 text-pink-400"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {tier}
              </button>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-muted-foreground font-semibold">Feature</th>
                  {tiers.map((tier) => (
                    <th key={tier} className="p-4 text-center text-muted-foreground font-semibold">
                      {tier}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((section) => (
                  <Fragment key={section.category}>
                    <tr>
                      <td colSpan={5} className="px-4 pt-4 pb-2 text-xs font-bold text-pink-400 uppercase tracking-wider">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feature) => (
                      <tr key={feature.name} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 text-foreground">{feature.name}</td>
                        {tiers.map((tier) => (
                          <td key={tier} className="p-4 text-center">
                            {feature.values[tier] === "\u2714" ? (
                              <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : feature.values[tier] === "\u2716" ? (
                              <span className="text-muted-foreground/50">{"\u2716"}</span>
                            ) : (
                              <span className="text-foreground font-medium">{feature.values[tier]}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: show selected tier */}
          <div className="sm:hidden glass-card rounded-2xl p-4 space-y-1">
            {comparisonData.map((section) => (
              <div key={section.category}>
                <div className="text-xs font-bold text-pink-400 uppercase tracking-wider pt-3 pb-2">
                  {section.category}
                </div>
                {section.features.map((feature) => (
                  <div key={feature.name} className="flex items-center justify-between py-2 border-t border-white/5">
                    <span className="text-sm text-foreground">{feature.name}</span>
                    {feature.values[selectedTier] === "\u2714" ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : feature.values[selectedTier] === "\u2716" ? (
                      <span className="text-muted-foreground/50">{"\u2716"}</span>
                    ) : (
                      <span className="text-foreground font-medium text-sm">{feature.values[selectedTier]}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />

      {/* Payment Modal */}
      {payingTier !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-background p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">{premiumTiers[payingTier].label}</h3>
            <p className="text-xs text-muted-foreground">
              {premiumTiers[payingTier].quota} server{premiumTiers[payingTier].quota > 1 ? "s" : ""} &middot; 30 days
            </p>

            <div className="text-center py-2">
              <span className="text-4xl font-extrabold text-foreground">{premiumTiers[payingTier].price}</span>
              <span className="text-lg text-muted-foreground ml-1">STT</span>
            </div>

            {wallet.connected && wallet.walletAddress && (
              <p className="text-xs text-muted-foreground text-center">
                Paying from: <span className="font-mono text-purple-400">{shortenAddress(wallet.walletAddress)}</span>
              </p>
            )}

            {/* Post-payment status */}
            {txHash && (
              <div className="space-y-2">
                <a
                  href={`https://shannon-explorer.somnia.network/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 underline block text-center"
                >
                  View transaction on explorer
                </a>
                {premiumActivated ? (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <p className="text-sm font-semibold text-green-400">Premium Activated!</p>
                    {premiumExpiry && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {new Date(premiumExpiry).toLocaleDateString()}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Go to your <a href="/profile" className="text-purple-400 underline hover:text-purple-300">Profile</a> to apply premium on a server.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleManualVerify(payingTier)}
                    disabled={processing}
                    className="w-full py-2 rounded-lg text-sm font-medium text-purple-400 border border-purple-500/30 hover:bg-purple-500/10 transition-all disabled:opacity-40"
                  >
                    {processing ? "Verifying..." : "Activate Premium"}
                  </button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={closeModal}
                disabled={processing}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-white/10 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubscribe(payingTier)}
                disabled={processing || !wallet.connected || !privyAvailable || !contractAvailable || premiumActivated}
                className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40"
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
                  "Connect Wallet"
                ) : premiumActivated ? (
                  "Done!"
                ) : (
                  `Pay ${premiumTiers[payingTier].price} STT`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Premium;
