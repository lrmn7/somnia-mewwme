import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";
import GuildTippSummary from "@/components/dashboard/GuildTippSummary";
import GuildTippHistory from "@/components/dashboard/GuildTippHistory";
import DonateModal from "@/components/dashboard/DonateModal";
import { ArrowLeft, Copy, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { truncateAddress } from "@/lib/web3";

interface GuildDetail {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  contractAddress: string;
  isPremium?: boolean;
}

export default function CommunityDetail() {
  const { guild } = useParams<{ guild: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<GuildDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [donateOpen, setDonateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!guild) return;
    setLoading(true);
    api
      .get(`/api/community/guild/${guild}`)
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [guild]);

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const copyAddress = () => {
    if (data?.contractAddress) {
      navigator.clipboard.writeText(data.contractAddress);
      toast.success("Contract address copied!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col relative text-foreground">
        <Navbar />
        <main className="flex-1 relative z-10 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col relative text-foreground">
        <Navbar />
        <main className="flex-1 relative z-10 flex flex-col items-center justify-center gap-4">
          <p className="text-lg text-white/60">Guild not found.</p>
          <button
            onClick={() => navigate("/community")}
            className="text-sm text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate("/community")}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </button>

          {/* HEADER */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-white/10 bg-indigo-500/20 flex items-center justify-center shrink-0 mb-4">
              {data.guildIcon ? (
                <img src={data.guildIcon} alt={data.guildName || "Guild"} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">{(data.guildName || "?").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-white">{data.guildName || "Unknown Guild"}</h1>
              {data.isPremium && (
                <BadgeCheck className="h-5 w-5 text-blue-400 shrink-0" />
              )}
            </div>
          </div>

          {/* CONTRACT ADDRESS (copy-only, NOT clickable) */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 mb-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-medium text-white/30 mb-0.5">Contract Address</p>
              <p className="text-xs font-mono text-white/60">{truncateAddress(data.contractAddress)}</p>
            </div>
            <button
              onClick={copyAddress}
              className="shrink-0 h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
              title="Copy address"
            >
              <Copy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </button>
          </div>

          {/* SUMMARY (Total + Balance + Donate Action — NO CLAIM) */}
          <div className="mb-8">
            <GuildTippSummary
              key={`summary-${refreshKey}`}
              guildId={data.guildId}
              contractAddress={data.contractAddress}
              isOwner={false}
              hideClaim={true}
              onDonate={() => setDonateOpen(true)}
              onClaim={() => {}}
            />
          </div>

          {/* HISTORY */}
          <GuildTippHistory
            key={`history-${refreshKey}`}
            guildId={data.guildId}
            contractAddress={data.contractAddress}
          />

          {/* DONATE MODAL */}
          <DonateModal
            open={donateOpen}
            onClose={() => setDonateOpen(false)}
            guildId={data.guildId}
            contractAddress={data.contractAddress}
            onSuccess={handleSuccess}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
