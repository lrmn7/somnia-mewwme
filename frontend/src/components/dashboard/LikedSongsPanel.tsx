import type { LikedTrack } from "@/types/player";
import { XMarkIcon, MusicalNoteIcon, PlayIcon, HeartIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";

const MotionDiv = motion.div as any;

interface Props {
  open: boolean;
  onClose: () => void;
  liked: LikedTrack[];
  likedUris: Set<string>;
  onToggleLike: (track: LikedTrack) => void;
  onPlay: (uri: string) => void;
  onPlayAll: () => void;
}

function formatDuration(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function LikedSongsPanel({
  open,
  onClose,
  liked,
  onToggleLike,
  onPlay,
  onPlayAll,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <MotionDiv
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md glass-card border-l border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-3">
                <HeartIcon className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-foreground">Liked Songs</h2>
                <span className="text-xs bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-full">
                  {liked.length}
                </span>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <XMarkIcon className="w-5 h-5 text-foreground" />
              </button>
            </div>

            {liked.length > 0 && (
              <div className="px-5 py-3 border-b border-white/10">
                <button
                  onClick={onPlayAll}
                  className="w-full py-2 rounded-xl bg-pink-500/20 text-pink-400 text-sm font-medium hover:bg-pink-500/30 transition-colors"
                >
                  Play All
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-1.5 scrollbar-thin">
              {liked.length === 0 ? (
                <div className="text-center py-16">
                  <HeartIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No liked songs yet</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Tap the heart to save songs you love
                  </p>
                </div>
              ) : (
                liked.map((track) => (
                  <div
                    key={track.uri}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/10 transition-colors group cursor-pointer"
                    onClick={() => onPlay(track.uri)}
                  >
                    {track.thumbnail ? (
                      <img src={track.thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                        <MusicalNoteIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{track.author}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDuration(track.length)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLike(track);
                      }}
                      className="shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <HeartIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </MotionDiv>
        </>
      )}
    </AnimatePresence>
  );
}
