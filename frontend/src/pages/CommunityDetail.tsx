import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { formatSTT, parseSTT, shortenAddress, GUILD_TIP_ABI } from "@/lib/web3";
import { useWallet } from "@/hooks/useWallet";
import { useEmbeddedWallet } from "@/hooks/useEmbeddedWallet";
import { PRIVY_APP_ID } from "@/lib/config";
import Navbar from "@/components/Navbar";
import BackgroundGlow from "@/components/BackgroundGlow";
import Footer from "@/components/Footer";

interface ServerDetail {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  ownerName: string | null;
  contractAddress: string;
  hasPremium?: boolean;
  inviteUrl?: string | null;
}

interface TipEvent {
  sender: string;
  amount: string;
  message: string;
  txHash: string;
  timestamp: number;
}

export default function CommunityDetail() {
  const { guildId } = useParams<{ guildId: string }>();
  const { wallet } = useWallet();
  const { hasWallet, getProviderAndSigner } = useEmbeddedWallet();
  const privyAvailable = !!PRIVY_APP_ID;

  const [server, setServer] = useState<ServerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // On-chain data
  const [tips, setTips] = useState<TipEvent[]>([]);
  const [totalTips, setTotalTips] = useState("0");
  const [tipCount, setTipCount] = useState(0);
  const [tipsLoading, setTipsLoading] = useState(false);

  // Tip modal
  const [showModal, setShowModal] = useState(false);
  const [amount, setAmount] = useState("1");
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  // Fetch server info from backend
  useEffect(() => {
    if (!guildId) return;
    api.get(`/api/community/servers/${guildId}`)
      .then(({ data }) => setServer(data))
      .catch(() => setError("Server not found"))
      .finally(() => setLoading(false));
  }, [guildId]);

  // Read tip history from on-chain (with localStorage cache)
  useEffect(() => {
    if (!server?.contractAddress) return;
    setTipsLoading(true);

    const cacheKey = `communityTips:v1:${server.contractAddress}`;

    (async () => {
      try {
        const { Contract, JsonRpcProvider } = await import("ethers");
        const provider = new JsonRpcProvider("https://dream-rpc.somnia.network");
        const contract = new Contract(server.contractAddress, GUILD_TIP_ABI, provider);

        // Read totalTips from contract
        const onChainTotal: bigint = await contract.totalTips().catch(() => BigInt(0));

        // Load cache
        let cachedTips: TipEvent[] = [];
        let lastScannedBlock = 0;
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            cachedTips = parsed.tips ?? [];
            lastScannedBlock = parsed.lastBlock ?? 0;
          }
        } catch { /* ignore */ }

        const currentBlock = await provider.getBlockNumber();

        const CHUNK = 999;
        const PARALLEL = 5;
        const MAX_ROUNDS = 100;
        const MIN_TIPS = 10;
        const filter = contract.filters.TipReceived();
        const newEvents: any[] = [];
        const hasCache = lastScannedBlock > 0;

        if (hasCache) {
          const startBlock = lastScannedBlock + 1;
          const blocksToScan = currentBlock - startBlock;
          if (blocksToScan > 0) {
            const totalChunks = Math.ceil(blocksToScan / CHUNK);
            let scanned = 0;
            while (scanned < totalChunks) {
              const promises: Promise<any[]>[] = [];
              for (let j = 0; j < PARALLEL && scanned + j < totalChunks; j++) {
                const idx = scanned + j;
                const from = startBlock + idx * CHUNK;
                const to = Math.min(from + CHUNK - 1, currentBlock);
                promises.push(contract.queryFilter(filter, from, to).catch(() => [] as any[]));
              }
              if (promises.length === 0) break;
              const results = await Promise.all(promises);
              for (const ev of results) newEvents.push(...ev);
              scanned += promises.length;
            }
          }
        } else {
          let cursor = currentBlock;
          for (let round = 0; round < MAX_ROUNDS; round++) {
            const promises: Promise<any[]>[] = [];
            for (let j = 0; j < PARALLEL; j++) {
              const toBlock = cursor - j * CHUNK;
              const fromBlock = Math.max(0, toBlock - CHUNK + 1);
              if (toBlock < 0) break;
              promises.push(contract.queryFilter(filter, fromBlock, toBlock).catch(() => [] as any[]));
              if (fromBlock === 0) break;
            }
            if (promises.length === 0) break;
            const results = await Promise.all(promises);
            for (const ev of results) newEvents.push(...ev);
            cursor -= PARALLEL * CHUNK;
            if (newEvents.length >= MIN_TIPS || cursor <= 0) break;
          }
        }

        const newTips: TipEvent[] = newEvents.map((e: any) => ({
          sender: e.args?.sender ?? "",
          amount: (e.args?.amount ?? BigInt(0)).toString(),
          message: e.args?.message ?? "",
          txHash: e.transactionHash,
          timestamp: Number(e.args?.timestamp ?? 0) * 1000,
        }));

        const allTips = [...cachedTips, ...newTips]
          .filter((t, i, arr) => arr.findIndex((x) => x.txHash === t.txHash) === i)
          .sort((a, b) => b.timestamp - a.timestamp);

        // Save cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ tips: allTips, lastBlock: currentBlock }));
        } catch { /* ignore */ }

        setTips(allTips.slice(0, 10));
        setTipCount(allTips.length);
        setTotalTips(onChainTotal.toString());
      } catch (err) {
        console.error("[CommunityDetail] Failed to read on-chain tips:", err);
      } finally {
        setTipsLoading(false);
      }
    })();
  }, [server?.contractAddress]);

  // Handle sending tip
  const handleTip = useCallback(async () => {
    if (!wallet.connected || !wallet.walletAddress) {
      toast.error("Please connect your wallet first from your Profile page");
      return;
    }
    if (!server?.contractAddress) return;

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

      toast.info("Sending tip...");
      const tipContract = new Contract(server.contractAddress, GUILD_TIP_ABI, signer);
      const tx = await tipContract.tip(message.trim(), { value: amountWei });
      await tx.wait();

      toast.success(`Tipped ${tipAmount} STT!`);
      setShowModal(false);
      setAmount("1");
      setMessage("");

      // Add to local state immediately
      const newTip: TipEvent = {
        sender: wallet.walletAddress,
        amount: amountWei.toString(),
        message: message.trim(),
        txHash: tx.hash,
        timestamp: Date.now(),
      };
      setTips((prev) => [newTip, ...prev].slice(0, 10));
      setTipCount((c) => c + 1);
      setTotalTips((prev) => (BigInt(prev) + amountWei).toString());
    } catch (err: any) {
      if (err?.code === "ACTION_REJECTED" || err?.code === 4001) {
        toast.error("Transaction rejected");
      } else {
        toast.error(err?.message?.slice(0, 100) ?? "Tip failed");
      }
    } finally {
      setProcessing(false);
    }
  }, [wallet, server, amount, message, getProviderAndSigner]);

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <BackgroundGlow />
      <Navbar />
      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link to="/community" className="text-sm text-muted-foreground hover:text-white transition">
              &larr; Back to Community
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
            </div>
          ) : error || !server ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">{error ?? "Server not found"}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Server header */}
              <div className="glass-card rounded-2xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  {server.icon ? (
                    <img
                      src={server.icon}
                      alt={server.name}
                      className="w-20 h-20 rounded-full ring-2 ring-purple-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-bold text-muted-foreground ring-2 ring-white/10">
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-center sm:text-left flex-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <h1 className="text-2xl font-bold text-white">{server.name}</h1>
                      {server.hasPremium && (
                        <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-400">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{server.memberCount.toLocaleString()} members</span>
                      {server.ownerName && <span>Owner: {server.ownerName}</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {server.inviteUrl && (
                        <a
                          href={server.inviteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-sm font-semibold text-indigo-400 hover:bg-indigo-500/30 transition"
                        >
                          Join Server
                        </a>
                      )}
                      <button
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-sm font-semibold text-purple-400 hover:bg-purple-500/30 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Tip Server
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                      <a
                        href={`https://shannon-explorer.somnia.network/address/${server.contractAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-purple-400 hover:text-purple-300 underline"
                      >
                        {shortenAddress(server.contractAddress)}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tip Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Total Tips</p>
                  <p className="text-lg font-bold text-purple-400 mt-0.5">
                    {formatSTT(totalTips)} STT
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Tip Count</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">{tipCount}</p>
                </div>
              </div>

              {/* Tip History */}
              <div className="glass-card rounded-2xl p-5 sm:p-6">
                <h2 className="text-sm font-bold text-white mb-4">Recent Tips</h2>
                {tipsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                  </div>
                ) : tips.length === 0 ? (
                  <p className="text-sm text-muted-foreground/60 text-center py-6">
                    No tips yet. Be the first to tip this server!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {tips.map((tip) => (
                      <div
                        key={tip.txHash}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 shrink-0">
                            <svg className="h-3.5 w-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-muted-foreground truncate">
                              {shortenAddress(tip.sender)}
                            </p>
                            {tip.message && (
                              <p className="text-[10px] text-muted-foreground/80 truncate max-w-[200px]">
                                "{tip.message}"
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground/60">
                              {new Date(tip.timestamp).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-purple-400">{formatSTT(tip.amount)} STT</p>
                          <a
                            href={`https://shannon-explorer.somnia.network/tx/${tip.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-muted-foreground/50 hover:text-purple-400 transition"
                          >
                            View tx
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Tip Modal */}
      {showModal && server && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !processing && setShowModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-background p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Tip {server.name}</h3>
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
    </div>
  );
}
