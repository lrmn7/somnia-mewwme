import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWallet } from "@/hooks/useWallet";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { formatSTT, parseSTT, shortenAddress, GUILD_TIP_ABI } from "@/lib/web3";
import { PRIVY_APP_ID } from "@/lib/config";

interface GuildTipData {
  guildId: string;
  totalTips: string;
  tipCount: number;
  contractAddress: string | null;
}

export function GuildTipButton({ guildId, onTipSent }: { guildId: string; onTipSent?: () => void }) {
  const { wallet } = useWallet();
  const { hasWallet, getProviderAndSigner } = useEmbeddedWallet();
  const [tipData, setTipData] = useState<GuildTipData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("1");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  const privyAvailable = !!PRIVY_APP_ID;

  useEffect(() => {
    async function fetchTipData() {
      try {
        const [contractRes, tipsRes] = await Promise.all([
          api.get(`/api/web3/guild/${guildId}/contract`),
          api.get(`/api/web3/guild/${guildId}/tips`),
        ]);
        setTipData({
          guildId,
          totalTips: tipsRes.data.totalTips,
          tipCount: tipsRes.data.tipCount,
          contractAddress: contractRes.data.contractAddress,
        });
      } catch {
        setTipData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchTipData();
  }, [guildId]);

  const handleTip = useCallback(async () => {
    if (!wallet.connected || !wallet.walletAddress) {
      toast.error("Please connect your wallet first from your Profile page");
      return;
    }

    if (!tipData?.contractAddress) {
      toast.error("This server does not have a tip contract");
      return;
    }

    const tipAmount = parseFloat(amount);
    if (isNaN(tipAmount) || tipAmount < 0.1) {
      toast.error("Minimum tip is 0.1 STT");
      return;
    }

    setProcessing(true);
    try {
      const { Contract } = await import("ethers");
      const { signer } = await getProviderAndSigner();
      const amountWei = parseSTT(tipAmount);

      // Send tip with native STT (single transaction, no approve needed)
      toast.info("Sending tip...");
      const tipContract = new Contract(tipData.contractAddress, GUILD_TIP_ABI, signer);
      const tipTx = await tipContract.tip(message.trim(), { value: amountWei });
      await tipTx.wait();

      toast.success(`Tipped ${tipAmount} STT to the server!`);
      setShowModal(false);
      setAmount("1");
      setMessage("");

      // Notify parent to refresh tip history
      onTipSent?.();
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        toast.error("Transaction rejected");
      } else {
        toast.error(err?.message?.slice(0, 100) ?? "Tip failed");
      }
    } finally {
      setProcessing(false);
    }
  }, [wallet, tipData, amount, message, guildId, getProviderAndSigner]);

  if (loading || !tipData?.contractAddress) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 rounded-lg bg-purple-500/15 border border-purple-500/25 px-3 py-1.5 text-xs font-semibold text-purple-400 hover:bg-purple-500/25 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Tip Server
      </button>

      {/* Tip Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setShowModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-background p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Tip Server</h3>
            <p className="text-[10px] text-white/20">Minimum: 0.1 STT &middot; 1.5% platform fee</p>

            {wallet.connected && wallet.walletAddress && (
              <p className="text-xs text-muted-foreground">
                From: <span className="font-mono text-purple-400">{shortenAddress(wallet.walletAddress)}</span>
              </p>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Amount (STT)</label>
              <div className="flex gap-2">
                {["0.5", "1", "5", "10"].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      amount === preset
                        ? "bg-purple-500/20 border border-purple-500/40 text-purple-400"
                        : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {preset} STT
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:outline-none"
                placeholder="Custom amount"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Message (optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:outline-none resize-none"
                placeholder="Leave a message with your tip..."
              />
              <p className="text-[10px] text-muted-foreground/50 text-right">{message.length}/200</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={processing}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-white/10 transition disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleTip}
                disabled={processing || !wallet.connected || !privyAvailable}
                className="flex-1 rounded-lg bg-purple-500/20 border border-purple-500/30 px-4 py-2 text-sm font-semibold text-purple-300 hover:bg-purple-500/30 transition disabled:opacity-40"
              >
                {processing ? "Processing..." : !wallet.connected ? "Connect Wallet" : `Send ${amount} STT`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
