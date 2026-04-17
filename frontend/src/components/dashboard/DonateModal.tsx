import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { somniaTestnet } from "@/lib/web3";
import { useTip } from "@/hooks/useContract";
import { toast } from "sonner";
import { FiX, FiHeart, FiAlertCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  guildId: string;
  contractAddress: string;
  onSuccess?: () => void;
}

export default function DonateModal({ open, onClose, guildId, contractAddress, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState(false);

  const { address, isConnected, chainId } = useAccount();
  const { sendTip, isPending } = useTip(contractAddress);

  // Validation
  const amountNum = parseFloat(amount);
  const amountError = !amount ? "Amount required" : amountNum <= 0 ? "Amount must be greater than 0" : "";
  const walletError = !isConnected ? "Please connect your wallet in Profile first" : "";
  const networkError = isConnected && chainId !== somniaTestnet.id ? "Wrong network (Somnia required)" : "";
  const canDonate = !amountError && !walletError && !networkError && !isPending;

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canDonate) return;
    const tx = await sendTip(amount, message, guildId);
    if (tx) {
      setAmount("");
      setMessage("");
      setTouched(false);
      onClose();
      onSuccess?.();
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#111111]/95 backdrop-blur-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <FiHeart className="h-4 w-4 text-pink-400" />
            </div>
            <h2 className="text-base font-bold text-white">Support this Server</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleDonate} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1.5">Amount (STT)</label>
            <input
              type="number"
              min="0"
              step="any"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all ${
                touched && amountError
                  ? "border-pink-500/40 focus:ring-pink-500/30"
                  : "border-white/[0.08] focus:ring-pink-500/30 focus:border-pink-500/30"
              }`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Enter amount"
              disabled={isPending}
              autoFocus
            />
            {touched && amountError && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-pink-400">
                <FiAlertCircle className="h-3 w-3" />
                {amountError}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 mb-1.5">Message (optional)</label>
            <input
              type="text"
              maxLength={120}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-pink-500/30 focus:border-pink-500/30 transition-all"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Say something nice!"
              disabled={isPending}
            />
            <div className="flex justify-end mt-1">
              <span className={`text-[11px] ${message.length >= 120 ? "text-pink-400" : "text-white/25"}`}>
                {message.length} / 120
              </span>
            </div>
          </div>

          {/* Errors */}
          {walletError && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/[0.08] border border-yellow-500/20 rounded-lg px-3 py-2">
              <FiAlertCircle className="h-3.5 w-3.5 shrink-0" />
              {walletError}
            </div>
          )}
          {networkError && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/[0.08] border border-yellow-500/20 rounded-lg px-3 py-2">
              <FiAlertCircle className="h-3.5 w-3.5 shrink-0" />
              {networkError}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2.5 justify-end pt-2">
            <button
              type="button"
              className="px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 text-sm font-medium hover:bg-white/[0.06] transition-all"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canDonate}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${
                !canDonate
                  ? "bg-pink-500/20 text-pink-400/40 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-500/20"
              }`}
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Donating...
                </span>
              ) : (
                "Donate"
              )}
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
