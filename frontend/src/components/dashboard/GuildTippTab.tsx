import { useState, useCallback } from "react";
import GuildTippSummary from "./GuildTippSummary";
import GuildTippHistory from "./GuildTippHistory";
import DonateModal from "./DonateModal";
import ClaimModal from "./ClaimModal";

interface Props {
  guildId: string;
  contractAddress: string;
  isOwner: boolean;
}

export default function GuildTippTab({ guildId, contractAddress, isOwner }: Props) {
  const [donateOpen, setDonateOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  if (!contractAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/[0.03] border border-white/[0.08] text-4xl mb-4">
          💎
        </div>
        <p className="text-lg font-bold text-white mb-1">No Tipping Contract</p>
        <p className="text-sm text-white/40 text-center max-w-sm">
          This guild doesn't have a tipping contract yet. Go to Guild Settings → Web3 Settings to create one.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 flex flex-col gap-8">
      {/* SECTION 1: SUMMARY */}
      <GuildTippSummary
        key={`summary-${refreshKey}`}
        guildId={guildId}
        contractAddress={contractAddress}
        isOwner={isOwner}
        onDonate={() => setDonateOpen(true)}
        onClaim={() => setClaimOpen(true)}
      />

      {/* SECTION 2: HISTORY */}
      <GuildTippHistory
        key={`history-${refreshKey}`}
        guildId={guildId}
        contractAddress={contractAddress}
      />

      {/* MODALS */}
      <DonateModal
        open={donateOpen}
        onClose={() => setDonateOpen(false)}
        guildId={guildId}
        contractAddress={contractAddress}
        onSuccess={handleSuccess}
      />
      <ClaimModal
        open={claimOpen}
        onClose={() => setClaimOpen(false)}
        guildId={guildId}
        contractAddress={contractAddress}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
