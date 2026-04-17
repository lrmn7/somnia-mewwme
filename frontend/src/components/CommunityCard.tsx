import { motion } from "framer-motion";
import { FiHeart } from "react-icons/fi";
import { BadgeCheck } from "lucide-react";

const MotionDiv = motion.div as any;

interface Props {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  contractAddress: string;
  totalDonation?: string;
  totalTipsCached?: number;
  isPremium?: boolean;
  description?: string;
  onClick?: () => void;
}

export default function CommunityCard({
  guildName,
  guildIcon,
  totalTipsCached,
  isPremium,
  onClick,
}: Props) {
  return (
    <MotionDiv
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-card glass-card-hover rounded-2xl p-5 cursor-pointer flex flex-col items-center gap-3 text-center"
    >
      {/* Avatar */}
      {guildIcon ? (
        <img
          src={guildIcon}
          alt={guildName || "Guild"}
          className="w-16 h-16 rounded-full object-cover border border-white/10"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center border border-white/10">
          <span className="text-2xl font-bold text-pink-400">
            {(guildName || "?").charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Name + Premium Badge */}
      <div className="flex items-center gap-1.5 max-w-full">
        <p className="text-sm font-semibold text-foreground truncate">
          {guildName || "Unknown Guild"}
        </p>
        {isPremium && (
          <BadgeCheck className="h-4 w-4 text-blue-400 shrink-0" />
        )}
      </div>

      {/* Total Donations */}
      {(totalTipsCached != null && totalTipsCached > 0) ? (
        <div className="flex items-center gap-1 text-xs text-pink-400/80">
          <FiHeart className="h-3 w-3" />
          <span>{totalTipsCached} donation{totalTipsCached === 1 ? "" : "s"}</span>
        </div>
      ) : (
        <div className="text-xs text-white/25">Be the first to donate</div>
      )}
    </MotionDiv>
  );
}
