import type { BotGuild } from "@/types/player";
import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

interface Props {
  guild: BotGuild;
  onClick: () => void;
}

export default function GuildCard({ guild, onClick }: Props) {
  const iconUrl = guild.iconUrl
    ? guild.iconUrl
    : guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`
    : null;

  return (
    <MotionDiv
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="glass-card glass-card-hover rounded-2xl p-5 cursor-pointer flex flex-col items-center gap-3 text-center"
    >
      {iconUrl ? (
        <img
          src={iconUrl}
          alt={guild.name}
          className="w-16 h-16 rounded-full object-cover"
        />
      ) : (
        <div className="w-16 h-16 rounded-full bg-pink-500/20 flex items-center justify-center">
          <span className="text-2xl font-bold text-pink-400">
            {guild.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <p className="text-sm font-medium text-foreground truncate max-w-full">
        {guild.name}
      </p>
      {!guild.hasBot && (
        <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
          Invite bot
        </span>
      )}
    </MotionDiv>
  );
}
