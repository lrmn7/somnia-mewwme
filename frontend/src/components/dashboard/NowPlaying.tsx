import type { Track } from "@/types/player";
import { MusicalNoteIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

interface Props {
  track: Track | null;
}

export default function NowPlaying({ track }: Props) {
  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-32 h-32 rounded-2xl glass-card flex items-center justify-center mb-6">
          <MusicalNoteIcon className="w-16 h-16 text-muted-foreground" />
        </div>
        <p className="text-lg text-muted-foreground">Nothing playing</p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Search for a song to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative mb-6">
        {track.thumbnail ? (
          <MotionDiv
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            key={track.uri}
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden shadow-2xl shadow-pink-500/10"
          >
            <img
              src={track.thumbnail}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          </MotionDiv>
        ) : (
          <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl glass-card flex items-center justify-center">
            <MusicalNoteIcon className="w-20 h-20 text-pink-500/50" />
          </div>
        )}
      </div>
      <h2 className="text-lg sm:text-xl font-bold text-foreground max-w-xs truncate">
        {track.uri ? (
          <a
            href={track.uri}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-pink-400 transition-colors"
          >
            {track.title}
          </a>
        ) : (
          track.title
        )}
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs truncate">
        {track.author}
      </p>
      {track.requester && typeof track.requester === "object" && (
        <p className="text-xs text-muted-foreground/60 mt-2">
          Requested by{" "}
          <span className="text-muted-foreground">
            {track.requester.globalName || track.requester.username}
          </span>
        </p>
      )}
    </div>
  );
}
