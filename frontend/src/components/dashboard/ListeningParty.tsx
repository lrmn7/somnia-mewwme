import { useState } from "react";

export interface VoiceMember {
  userId: string;
  username: string;
  globalName: string | null;
  avatarURL: string | null;
}

interface Props {
  members: VoiceMember[];
}

const MAX_VISIBLE = 5;

export default function ListeningParty({ members }: Props) {
  const [showSheet, setShowSheet] = useState(false);

  if (members.length === 0) return null;

  const displayName = (m: VoiceMember) => m.globalName || m.username;
  const visible = members.slice(0, MAX_VISIBLE);
  const overflow = members.length - MAX_VISIBLE;

  return (
    <>
      {/* Desktop: Avatar Stack */}
      <div className="hidden sm:flex items-center gap-2">
        <div className="flex items-center -space-x-2">
          {visible.map((m) => (
            <div
              key={m.userId}
              className="relative group"
            >
              {m.avatarURL ? (
                <img
                  src={m.avatarURL}
                  alt={displayName(m)}
                  className="h-7 w-7 rounded-full border-2 border-background object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="h-7 w-7 rounded-full border-2 border-background bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/60 ring-1 ring-white/10">
                  {displayName(m).charAt(0).toUpperCase()}
                </div>
              )}
              {/* Tooltip */}
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/10 text-[10px] font-medium text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {displayName(m)}
              </div>
            </div>
          ))}
          {overflow > 0 && (
            <div className="h-7 w-7 rounded-full border-2 border-background bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/50 ring-1 ring-white/10">
              +{overflow}
            </div>
          )}
        </div>
        <span className="text-[11px] font-medium text-white/40">
          {members.length} listening
        </span>
      </div>

      <button
        onClick={() => setShowSheet(true)}
        className="flex sm:hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/50 hover:bg-white/[0.08] transition"
      >
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
        {members.length}
      </button>
      {showSheet && (
        <div className="fixed inset-0 z-[100] sm:hidden" onClick={() => setShowSheet(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="absolute bottom-0 inset-x-0 rounded-t-2xl border-t border-white/10 bg-[#111] p-4 pb-32 animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <h3 className="text-sm font-bold text-white mb-3">
              Listening Now ({members.length})
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/[0.03]">
                  {m.avatarURL ? (
                    <img src={m.avatarURL} alt={displayName(m)} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white/60">
                      {displayName(m).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium text-white truncate">{displayName(m)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
