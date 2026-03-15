import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatSTT, parseSTT, contracts, PREMIUM_SUBSCRIPTION_ABI } from "@/lib/web3";
import { useAuth } from "@/hooks/useAuth";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BackgroundGlow from "@/components/BackgroundGlow";
import Footer from "@/components/Footer";

interface PlatformStats {
  tips: {
    totalAmount: string;
    count: number;
    uniqueGuilds: number;
  };
  subscriptions: {
    total: number;
    active: number;
    byTier: { basic: number; plus: number; pro: number; unknown: number };
    totalRevenue: string;
  };
  premium: {
    guilds: number;
    users: number;
  };
  platform: {
    totalGuilds: number;
    totalUsers: number;
  };
}

interface TierData {
  tierId: number;
  price: string;
  quota: number;
  active: boolean;
}

const TIER_LABELS: Record<number, string> = { 1: "Basic", 2: "Plus", 3: "Pro" };

function TierManager() {
  const { getProviderAndSigner } = useEmbeddedWallet();
  const [tiers, setTiers] = useState<TierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Editable form state per tier
  const [editForms, setEditForms] = useState<Record<number, { price: string; quota: string; active: boolean }>>({});

  const loadTiers = useCallback(async () => {
    try {
      const { JsonRpcProvider, Contract } = await import("ethers");
      const provider = new JsonRpcProvider("https://dream-rpc.somnia.network");
      const contract = new Contract(contracts.premiumSubscription, PREMIUM_SUBSCRIPTION_ABI, provider);

      const count: bigint = await contract.tierCount();
      const loaded: TierData[] = [];
      for (let i = 1; i <= Number(count); i++) {
        const [price, quota, active]: [bigint, bigint, boolean] = await contract.getTier(i);
        loaded.push({ tierId: i, price: price.toString(), quota: Number(quota), active });
      }
      setTiers(loaded);

      // Init edit forms
      const forms: Record<number, { price: string; quota: string; active: boolean }> = {};
      for (const t of loaded) {
        forms[t.tierId] = {
          price: formatSTT(t.price).replace(/\.?0+$/, ""),
          quota: t.quota.toString(),
          active: t.active,
        };
      }
      setEditForms(forms);

      // Check if current wallet is admin
      try {
        const { address } = await getProviderAndSigner();
        const adminAddr: string = await contract.admin();
        setIsAdmin(address.toLowerCase() === adminAddr.toLowerCase());
      } catch {
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Failed to load tiers:", err);
    } finally {
      setLoading(false);
    }
  }, [getProviderAndSigner]);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  const handleSave = useCallback(async (tierId: number) => {
    const form = editForms[tierId];
    if (!form) return;

    const priceNum = parseFloat(form.price);
    const quotaNum = parseInt(form.quota);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast.error("Price must be greater than 0");
      return;
    }
    if (isNaN(quotaNum) || quotaNum <= 0) {
      toast.error("Quota must be greater than 0");
      return;
    }

    setSaving(tierId);
    try {
      const { Contract } = await import("ethers");
      const { signer } = await getProviderAndSigner();
      const contract = new Contract(contracts.premiumSubscription, PREMIUM_SUBSCRIPTION_ABI, signer);

      const priceWei = parseSTT(form.price);
      toast.info(`Updating Tier ${tierId} (${TIER_LABELS[tierId] || `Tier ${tierId}`})...`);
      const tx = await contract.setTier(tierId, priceWei, quotaNum, form.active);
      await tx.wait();

      toast.success(`Tier ${TIER_LABELS[tierId] || tierId} updated!`);
      await loadTiers();
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        toast.error("Transaction rejected");
      } else {
        toast.error(err?.message?.slice(0, 100) ?? "Failed to update tier");
      }
    } finally {
      setSaving(null);
    }
  }, [editForms, getProviderAndSigner, loadTiers]);

  if (loading) {
    return (
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-bold text-white mb-4">Tier Management</h2>
        <p className="text-xs text-muted-foreground">Loading tiers from contract...</p>
      </div>
    );
  }

  if (!contracts.premiumSubscription) {
    return (
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h2 className="text-sm font-bold text-white mb-4">Tier Management</h2>
        <p className="text-xs text-muted-foreground">PremiumSubscription contract not configured.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white">Tier Management</h2>
        {isAdmin ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/25">Admin</span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">Not Admin</span>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mb-4">
        Changes are sent directly to the smart contract. Only the contract admin wallet can update.
      </p>

      <div className="space-y-4">
        {tiers.map((tier) => {
          const form = editForms[tier.tierId];
          if (!form) return null;
          const label = TIER_LABELS[tier.tierId] || `Tier ${tier.tierId}`;
          const hasChanges =
            form.price !== formatSTT(tier.price).replace(/\.?0+$/, "") ||
            form.quota !== tier.quota.toString() ||
            form.active !== tier.active;

          return (
            <div
              key={tier.tierId}
              className={`rounded-xl border p-4 space-y-3 ${
                tier.active
                  ? "bg-white/[0.02] border-white/[0.08]"
                  : "bg-red-500/[0.03] border-red-500/20 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{label}</span>
                  <span className="text-[10px] text-muted-foreground/50">Tier ID: {tier.tierId}</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-[10px] text-muted-foreground">Active</span>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) =>
                      setEditForms((prev) => ({ ...prev, [tier.tierId]: { ...form, active: e.target.checked } }))
                    }
                    disabled={!isAdmin}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-purple-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground/60 block mb-1">Price (STT)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setEditForms((prev) => ({ ...prev, [tier.tierId]: { ...form, price: e.target.value } }))
                    }
                    disabled={!isAdmin}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground/60 block mb-1">Server Quota</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.quota}
                    onChange={(e) =>
                      setEditForms((prev) => ({ ...prev, [tier.tierId]: { ...form, quota: e.target.value } }))
                    }
                    disabled={!isAdmin}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-500/50 focus:outline-none disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground/40">
                  Current: {formatSTT(tier.price)} STT / {tier.quota} server{tier.quota > 1 ? "s" : ""}
                </p>
                {isAdmin && hasChanges && (
                  <button
                    onClick={() => handleSave(tier.tierId)}
                    disabled={saving !== null}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition disabled:opacity-40"
                  >
                    {saving === tier.tierId ? "Saving..." : "Save"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login");
      return;
    }
    if (status !== "authenticated") return;

    api.get<PlatformStats>("/api/admin/platform-stats")
      .then(({ data }) => setStats(data))
      .catch((err) => {
        const msg = err?.response?.data?.error || "Access denied or failed to load stats";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [status, navigate]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <BackgroundGlow />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <BackgroundGlow />
      <Navbar />
      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 text-white">
            Platform Admin
          </h1>
          <p className="text-sm text-muted-foreground mb-8">Overview of platform fees, subscriptions, and tips.</p>

          {error ? (
            <div className="glass-card rounded-2xl p-8 text-center">
              <p className="text-red-400 font-semibold">{error}</p>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Total Tips</p>
                  <p className="text-lg font-bold text-green-400 mt-0.5">{formatSTT(stats.tips.totalAmount)} STT</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1">{stats.tips.count} tips across {stats.tips.uniqueGuilds} guild{stats.tips.uniqueGuilds !== 1 ? "s" : ""}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Subscription Revenue</p>
                  <p className="text-lg font-bold text-amber-400 mt-0.5">{formatSTT(stats.subscriptions.totalRevenue)} STT</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1">{stats.subscriptions.total} total subscriptions</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Active Subscriptions</p>
                  <p className="text-lg font-bold text-purple-400 mt-0.5">{stats.subscriptions.active}</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1">{stats.premium.users} premium user{stats.premium.users !== 1 ? "s" : ""}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Premium Guilds</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{stats.premium.guilds}</p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1">of {stats.platform.totalGuilds} total guild{stats.platform.totalGuilds !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Tier Management */}
              <TierManager />

              {/* Subscription breakdown */}
              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <h2 className="text-sm font-bold text-white mb-4">Subscription Breakdown</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-yellow-500/[0.06] border border-yellow-500/20 p-3 text-center">
                    <p className="text-xs text-yellow-400 font-semibold">Basic</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.subscriptions.byTier.basic}</p>
                  </div>
                  <div className="rounded-lg bg-purple-500/[0.06] border border-purple-500/20 p-3 text-center">
                    <p className="text-xs text-purple-400 font-semibold">Plus</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.subscriptions.byTier.plus}</p>
                  </div>
                  <div className="rounded-lg bg-pink-500/[0.06] border border-pink-500/20 p-3 text-center">
                    <p className="text-xs text-pink-400 font-semibold">Pro</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stats.subscriptions.byTier.pro}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
}
