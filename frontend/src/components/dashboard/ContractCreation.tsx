import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { Copy, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useWallet } from "@/hooks/useWallet";
import { useCreateGuildContract } from "@/hooks/useContract";
import WalletConnect from "@/components/WalletConnect";
import { truncateAddress, TIPJAR_FACTORY_ADDRESS, FACTORY_ABI, somniaTestnet, wagmiConfig } from "@/lib/web3";
import type { Address } from "viem";

interface Props {
  guildId: string;
}

export default function ContractCreation({ guildId }: Props) {
  const { address, isConnected } = useAccount();
  const { isCorrectChain, switchToSomnia } = useWallet();
  const { createContract, isPending, debugInfo } = useCreateGuildContract(TIPJAR_FACTORY_ADDRESS || undefined);
  const [existingContract, setExistingContract] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if guild already has a contract (backend first, then on-chain fallback)
    const check = async () => {
      try {
        const { data } = await api.get(`/api/guild/${guildId}/contract`);
        if (data?.contractAddress) {
          setExistingContract(data.contractAddress);
          setLoading(false);
          return;
        }
      } catch {
        // Backend unavailable or no record
      }

      // Fallback: check on-chain factory
      if (TIPJAR_FACTORY_ADDRESS) {
        try {
          const addr = await readContract(wagmiConfig, {
            address: TIPJAR_FACTORY_ADDRESS as Address,
            abi: FACTORY_ABI,
            functionName: "getGuild",
            args: [guildId],
            chainId: somniaTestnet.id,
          });
          if (addr && addr !== "0x0000000000000000000000000000000000000000") {
            setExistingContract(addr as string);
          }
        } catch {
          // On-chain check failed
        }
      }

      setLoading(false);
    };
    check();
  }, [guildId]);

  const handleCreate = async () => {
    if (!address) {
      toast.error("Connect your wallet first.");
      return;
    }

    // Fetch guild owner's bound wallet — contract owner MUST be the guild owner
    let ownerWallet: string;
    try {
      const { data } = await api.get(`/api/guild/${guildId}/owner-wallet`);
      if (!data.bound) {
        toast.error(data.error || "Guild owner belum connect wallet. Minta owner untuk bind wallet terlebih dahulu.");
        return;
      }
      ownerWallet = data.ownerWallet;
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to resolve guild owner wallet.";
      toast.error(msg);
      return;
    }

    const result = await createContract(guildId, ownerWallet);
    if (!result) return;

    const { hash, contractAddress } = result;

    // Register in backend if we have a valid contract address
    if (contractAddress) {
      try {
        await api.post(`/api/guild/${guildId}/contract`, {
          contractAddress,
          factoryAddress: TIPJAR_FACTORY_ADDRESS,
          creatorWallet: address,
          ownerWallet,
          txHash: hash,
        });
        setExistingContract(contractAddress);
      } catch (err: any) {
        const msg = err?.response?.data?.error || "Failed to register contract in backend.";
        toast.error(msg);
      }
    } else {
      // Fallback refetch after delay if address couldn't be resolved
      setTimeout(() => {
        api.get(`/api/guild/${guildId}/contract`).then(({ data }) => {
          if (data?.contractAddress) setExistingContract(data.contractAddress);
        }).catch(() => {});
      }, 10000);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        <div className="animate-pulse flex gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-white/10 rounded" />
            <div className="h-3 w-48 bg-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Already has a contract
  if (existingContract) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-white mb-1">Tipping Enabled</h3>
            <p className="text-xs text-white/40 mb-2">
              This server has a tip jar contract deployed on Somnia.
            </p>
            <button
              onClick={() => { navigator.clipboard.writeText(existingContract); toast.success("Contract address copied!"); }}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition cursor-pointer bg-transparent border-none p-0"
              title="Copy contract address"
            >
              {truncateAddress(existingContract)}
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No contract yet
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/20 text-pink-400 shrink-0">
          <Zap className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-1">Enable Community Tipping</h3>
          <p className="text-xs text-white/40 mb-4">
            Deploy a tip jar contract for this server. Members can send STT tips to support the community.
            The server owner will be the contract owner and can claim tips anytime (1.5% platform fee applies).
          </p>

          {!isConnected ? (
            <WalletConnect compact />
          ) : !isCorrectChain ? (
            <button
              onClick={switchToSomnia}
              className="flex items-center gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 px-4 py-2 text-xs font-semibold text-yellow-400 hover:bg-yellow-500/20 transition"
            >
              Switch to Somnia
            </button>
          ) : !TIPJAR_FACTORY_ADDRESS ? (
            <p className="text-xs text-yellow-400">Factory contract not configured. Please set VITE_TIPJAR_FACTORY_ADDRESS in .env.</p>
          ) : (
            <button
              onClick={handleCreate}
              disabled={isPending}
              className="flex items-center gap-2 rounded-lg bg-pink-500/10 border border-pink-500/20 px-4 py-2 text-xs font-semibold text-pink-400 hover:bg-pink-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <div className="w-3 h-3 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  Deploy Tip Jar Contract
                </>
              )}
            </button>
          )}

          {/* ─── DEBUG PANEL ─── */}
          {debugInfo && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/[0.05] p-3 overflow-auto max-h-72">
              <h4 className="text-xs font-bold text-red-400 mb-2">DEBUG INFO (check browser console for full details)</h4>
              <pre className="text-[10px] text-white/60 whitespace-pre-wrap break-all font-mono">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
