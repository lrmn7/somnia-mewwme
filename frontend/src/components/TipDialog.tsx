import { useState, useEffect } from "react";
import { Heart, Send, ExternalLink, Clock, MessageSquare, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAccount } from "wagmi";
import { useTip } from "@/hooks/useContract";
import { useWallet } from "@/hooks/useWallet";
import { api } from "@/lib/api";
import { truncateAddress, getExplorerTxUrl, somniaTestnet } from "@/lib/web3";
import WalletConnect from "@/components/WalletConnect";

interface TipRecord {
  senderAddress: string;
  senderDiscordId: string | null;
  amount: string;
  message: string;
  txHash: string;
  timestamp: number;
}

interface TipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  contractAddress: string;
}

export default function TipDialog({
  open,
  onOpenChange,
  guildId,
  guildName,
  guildIcon,
  contractAddress,
}: TipDialogProps) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [tips, setTips] = useState<TipRecord[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);

  const { isConnected } = useAccount();
  const { isCorrectChain } = useWallet();
  const { sendTip, isPending } = useTip(contractAddress);

  // Load tip history when dialog opens
  useEffect(() => {
    if (open && guildId) {
      loadTips();
    }
  }, [open, guildId]);

  const loadTips = async () => {
    try {
      setLoadingTips(true);
      const { data } = await api.get(`/api/community/guild/${guildId}`);
      if (data.success) {
        setTips(data.tips || []);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingTips(false);
    }
  };

  const handleSendTip = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    const hash = await sendTip(amount, message, guildId);
    if (hash) {
      setAmount("");
      setMessage("");
      // Reload tips after successful tip
      setTimeout(loadTips, 2000);
    }
  };

  const presetAmounts = ["0.1", "0.5", "1", "5"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-700 text-gray-200 max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {guildIcon ? (
              <img
                src={guildIcon}
                alt={guildName}
                className="h-10 w-10 rounded-full border border-gray-700"
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Heart className="h-5 w-5 text-pink-400" />
              </div>
            )}
            <div>
              <DialogTitle className="text-white">{guildName}</DialogTitle>
              <DialogDescription className="text-gray-400">
                Send a tip to support this server
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!isConnected ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-gray-400">Connect your wallet to send a tip</p>
            <WalletConnect />
          </div>
        ) : !isCorrectChain ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <p className="text-sm text-yellow-400">Please switch to Somnia Testnet</p>
            <WalletConnect />
          </div>
        ) : (
          <>
            {/* Amount Input */}
            <div className="space-y-3">
              <Label className="text-gray-300">Amount (STT)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                disabled={isPending}
              />
              <div className="flex gap-2">
                {presetAmounts.map((preset) => (
                  <Button
                    key={preset}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(preset)}
                    disabled={isPending}
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 flex-1"
                  >
                    {preset} STT
                  </Button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="space-y-2">
              <Label className="text-gray-300">Message (optional)</Label>
              <Input
                placeholder="Great music selection!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
                className="bg-gray-800 border-gray-700 text-white"
                disabled={isPending}
              />
              <p className="text-xs text-gray-500">{message.length}/200 characters</p>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendTip}
              disabled={isPending || !amount || parseFloat(amount) <= 0}
              className="w-full gap-2 bg-pink-600 hover:bg-pink-500 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send {amount ? `${amount} STT` : "Tip"}
                </>
              )}
            </Button>
          </>
        )}

        {/* Recent Tips */}
        <div className="mt-2">
          <h4 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Recent Tips
          </h4>
          {loadingTips ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          ) : tips.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No tips yet. Be the first!</p>
          ) : (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {tips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between py-2 px-3 rounded-lg bg-gray-800/50 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-400">
                          {truncateAddress(tip.senderAddress)}
                        </span>
                        <span className="text-pink-400 font-semibold">{tip.amount} STT</span>
                      </div>
                      {tip.message && (
                        <p className="text-gray-400 mt-0.5 flex items-start gap-1 truncate">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          {tip.message}
                        </p>
                      )}
                    </div>
                    <a
                      href={getExplorerTxUrl(tip.txHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-gray-300 ml-2 shrink-0"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
