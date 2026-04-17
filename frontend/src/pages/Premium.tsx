import { Check } from "lucide-react";
import React, { useState, Fragment } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";
import { links } from '@/config/links';
import { useWallet } from "@/hooks/useWallet";
import { usePurchasePremium } from "@/hooks/useContract";
import { PREMIUM_PLANS } from "@/lib/web3";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  {
    name: "Guild Basic",
    planKey: "guild_basic" as keyof typeof PREMIUM_PLANS,
    price: "3 STT",
    color: "text-yellow-500",
    borderColor: "border-yellow-500/30",
    btnGradient: "bg-gradient-to-r from-yellow-600 to-yellow-500",
    servers: 1,
    features: [
      "Better audio quality",
      "Unlimited YouTube Links",
      "24/7 Mode",
      "Autoplay Mode",
      "Amazing filters (bassboost, nightcore, etc...)",
      "Change volume",
      "Unlimited Songs in the Queue",
      "Activate premium on 1 server",
      "Premium Role",
      "Bypass vote locks",
      "Default Volume",
      "Access to 4 premium Custom bots",
      "Premium support",
    ],
    popular: false,
  },
  {
    name: "Guild Plus",
    planKey: "guild_plus" as keyof typeof PREMIUM_PLANS,
    price: "7 STT",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    btnGradient: "bg-gradient-to-r from-purple-600 to-purple-500",
    servers: 3,
    features: [
      "Better audio quality",
      "Unlimited YouTube Links",
      "24/7 Mode",
      "Autoplay Mode",
      "Change volume",
      "Amazing filters (bassboost, nightcore, etc...)",
      "Unlimited Songs in the Queue",
      "Activate premium on 3 servers",
      "Premium Role",
      "Bypass vote locks",
      "Default Volume",
      "Access to 4 premium Custom bots",
      "Premium support",
      "Embed color",
    ],
    popular: true,
  },
  {
    name: "Guild Pro",
    planKey: "guild_pro" as keyof typeof PREMIUM_PLANS,
    price: "10 STT",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    btnGradient: "bg-gradient-to-r from-emerald-600 to-emerald-500",
    servers: 5,
    features: [
      "Change bot name & avatar",
      "Better audio quality",
      "Unlimited YouTube Links",
      "24/7 Mode",
      "Autoplay Mode",
      "Change volume",
      "Amazing filters (bassboost, nightcore, etc...)",
      "Unlimited Songs in the Queue",
      "Activate premium on 5 servers",
      "Premium Role",
      "Bypass vote locks",
      "Default Volume",
      "Access to 4 premium Custom bots",
      "Premium support",
      "Embed color",
    ],
    popular: false,
  },
];

type TierKey = "Free" | "Guild Basic" | "Guild Plus" | "Guild Pro";

const comparisonData: { category: string; features: { name: string; values: Record<TierKey, string> }[] }[] = [
  {
    category: "General",
    features: [
      { name: "Premium Support", values: { Free: "✖", "Guild Basic": "✔", "Guild Plus": "✔", "Guild Pro": "✔" } },
      { name: "Discord Access", values: { Free: "✖", "Guild Basic": "✔", "Guild Plus": "✔", "Guild Pro": "✔" } },
    ],
  },
  {
    category: "Music",
    features: [
      { name: "High Quality Music", values: { Free: "✖", "Guild Basic": "✔", "Guild Plus": "✔", "Guild Pro": "✔" } },
      { name: "Unlimited YouTube Links", values: { Free: "✖", "Guild Basic": "✔", "Guild Plus": "✔", "Guild Pro": "✔" } },
      { name: "Audio Filters", values: { Free: "✖", "Guild Basic": "✔", "Guild Plus": "✔", "Guild Pro": "✔" } },
      { name: "Bypass Vote Locks", values: { Free: "✖", "Guild Basic": "✔", "Guild Plus": "✔", "Guild Pro": "✔" } },
      { name: "Default Volume", values: { Free: "✖", "Guild Basic": "✔", "Guild Plus": "✔", "Guild Pro": "✔" } },
      { name: "Premium Servers", values: { Free: "0", "Guild Basic": "1", "Guild Plus": "3", "Guild Pro": "5" } },
      { name: "Songs In Queue", values: { Free: "150", "Guild Basic": "550", "Guild Plus": "∞", "Guild Pro": "∞" } },
      { name: "Change Bot Name & Avatar", values: { Free: "✖", "Guild Basic": "✖", "Guild Plus": "✖", "Guild Pro": "✔" } },
      { name: "Embed Color", values: { Free: "✖", "Guild Basic": "✖", "Guild Plus": "✔", "Guild Pro": "✔" } },
    ],
  },
];

const tiers: TierKey[] = ["Free", "Guild Basic", "Guild Plus", "Guild Pro"];

const PricingCard = ({
  name,
  planKey,
  price,
  color,
  borderColor,
  btnGradient,
  servers,
  features,
  popular,
  onPurchase,
  isPurchasing,
  isBound,
  isCorrectChain,
  switchToSomnia,
}: (typeof plans)[0] & {
  onPurchase: (planKey: keyof typeof PREMIUM_PLANS) => void;
  isPurchasing: boolean;
  isBound: boolean;
  isCorrectChain: boolean;
  switchToSomnia: () => void;
}) => (
  <div className={`glass-card rounded-2xl p-6 sm:p-8 relative flex flex-col ${popular ? `border-yellow-500/40` : borderColor}`}>
    {popular && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-yellow-600 to-yellow-500 text-xs font-bold text-background flex items-center gap-1">
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
    <h3 className={`text-xl font-bold text-center mb-4 ${color}`}>{name}</h3>
    <div className="text-center mb-1">
      <span className="text-5xl font-extrabold text-foreground">{price}</span>
    </div>
    <p className="text-center text-xs text-muted-foreground mb-1">+ VAT /month</p>
    <p className="text-center text-sm text-muted-foreground mb-6">
      Activate premium on {servers} server{servers > 1 ? "s" : ""}
    </p>
    
    {!isBound ? (
      <p className="text-center text-xs text-muted-foreground mb-6">
        Please connect your wallet in <a href="/profile" className="text-pink-400 hover:text-pink-300 underline">Profile</a> first
      </p>
    ) : !isCorrectChain ? (
      <button
        onClick={switchToSomnia}
        className={`relative overflow-hidden w-full py-3 rounded-xl text-center font-semibold text-foreground bg-gradient-to-r from-yellow-600 to-yellow-500 hover:opacity-90 transition-all duration-300 block mb-6`}
      >
        Switch to Somnia
      </button>
    ) : (
      <button
        onClick={() => onPurchase(planKey)}
        disabled={isPurchasing}
        className={`relative overflow-hidden w-full py-3 rounded-xl text-center font-semibold text-foreground ${btnGradient} hover:opacity-90 transition-all duration-300 block mb-6 group disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        <span className="relative z-10">{isPurchasing ? "Processing..." : `Pay ${price}`}</span>
        <motion.div
          className="absolute top-0 left-0 h-full w-[40%] bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 z-0"
          animate={{ x: ["-200%", "350%"] }}
          transition={{ 
            repeat: Infinity, 
            duration: 2.5, 
            ease: "easeInOut",
            repeatDelay: 0.5 
          }}
        />
      </button>
    )}

    <ul className="space-y-3 flex-1">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
          <span>{f}</span>
        </li>
      ))}
    </ul>
  </div>
);

const Premium = () => {
  const [selectedTier, setSelectedTier] = useState<TierKey>("Guild Basic");
  const { isBound, isConnected, isCorrectChain, switchToSomnia, connectWallet } = useWallet();
  const { user, login } = useAuth();
  const { purchasePremium, isPending: isPurchasing } = usePurchasePremium();

  const handlePurchase = async (planKey: keyof typeof PREMIUM_PLANS) => {
    if (!user?.id) {
      login();
      return;
    }
    // Auto-connect wallet if bound but not connected (e.g. page refresh)
    if (isBound && !isConnected) {
      await connectWallet();
    }
    await purchasePremium(user.id, planKey);
  };

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16 flex flex-col items-center">
          <h1 className="text-4xl text-mewwme sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-4 flex items-center justify-center gap-3">
            PREMIUM 
            <motion.span 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-white"
            >
              ⭐
            </motion.span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Unlock the complete experience with no limits or restrictions.
          </p>
          <p className="mt-3 text-xs text-muted-foreground/60 flex items-center gap-1">
            Powered by <span className="font-semibold text-emerald-400">Somnia</span>
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              {...plan}
              onPurchase={handlePurchase}
              isPurchasing={isPurchasing}
              isBound={isBound}
              isCorrectChain={isCorrectChain}
              switchToSomnia={switchToSomnia}
            />
          ))}
        </div>

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
                            {feature.values[tier] === "✔" ? (
                              <Check className="w-4 h-4 text-emerald-500 mx-auto" />
                            ) : feature.values[tier] === "✖" ? (
                              <span className="text-muted-foreground/50">✖</span>
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
                    {feature.values[selectedTier] === "✔" ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : feature.values[selectedTier] === "✖" ? (
                      <span className="text-muted-foreground/50">✖</span>
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
    </div>
  );
};

export default Premium;