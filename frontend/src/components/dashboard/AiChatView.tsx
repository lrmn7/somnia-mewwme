import { useState, useRef, useEffect, useCallback } from "react";
import { FiSend, FiPlay, FiMusic, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import clsx from "clsx";

interface AiSong {
  title: string;
  artist: string;
  query: string;
  thumbnail?: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  songs: AiSong[];
  timestamp: number;
  actionUrl?: string | null;
  actionLabel?: string | null;
}

interface Props {
  guildId: string;
  onAddToQueue: (uris: string[]) => Promise<void>;
  hasPlayer: boolean;
  inVoice: boolean | null;
}

function formatChatTime(ts: number): string {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const mins = d.getMinutes().toString().padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

export default function AiChatView({ guildId, onAddToQueue, hasPlayer, inVoice }: Props) {
  const { user } = useAuth();
  const userAvatar = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : null;
  const welcomeMsg: ChatMessage = {
    id: "welcome",
    role: "ai",
    text: "Hi i'm Meww. Tell me what's on your mind or what vibe you're going for, and I'll pick some tracks for you.",
    songs: [],
    timestamp: Date.now(),
  };
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMsg]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [loadingSong, setLoadingSong] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (historyLoaded) return;
    (async () => {
      try {
        const { data } = await api.get("/api/ai-chat/history");
        const history = data?.messages;
        if (Array.isArray(history) && history.length > 0) {
          const loaded: ChatMessage[] = history.map((m: any, i: number) => ({
            id: `hist-${m.id ?? i}`,
            role: m.role === "user" ? "user" : "ai",
            text: m.content,
            songs: m.songs ?? [],
            timestamp: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
          }));
          setMessages([welcomeMsg, ...loaded]);
        }
      } catch {
      } finally {
        setHistoryLoaded(true);
      }
    })();
  }, [historyLoaded]);

  const handleSend = useCallback(async () => {
    const msg = input.trim();
    if (!msg || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: msg,
      songs: [],
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/api/ai-chat", { message: msg, guildId });
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: data.text || "Hmm, I blanked out for a sec. What kind of music are you into?",
        songs: data.songs || [],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errData = err?.response?.data;
      const errText = errData?.error || "Something glitched. Try again!";
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "ai",
          text: `⚠️ ${errText}`,
          songs: [],
          timestamp: Date.now(),
          actionUrl: errData?.actionUrl || null,
          actionLabel: errData?.actionLabel || null,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, guildId]);

  const handleClearChat = useCallback(async () => {
    try {
      await api.post("/api/ai-chat/clear");
      setMessages([welcomeMsg]);
      toast.success("Chat history cleared");
    } catch {
      toast.error("Failed to clear chat history");
    }
  }, []);

  const handlePlaySong = useCallback(
    async (song: AiSong) => {
      if (inVoice === false) {
        toast.error("Join a voice channel first to play music.");
        return;
      }
      setLoadingSong(song.query);
      try {
        const { data } = await api.get("/api/search", {
          params: { identifier: song.query, guildId },
        });
        if (data?.tracks?.length > 0) {
          await onAddToQueue([data.tracks[0].uri]);
          if (hasPlayer) {
            toast.success(`Added to queue: ${song.title}`);
          } else {
            toast.success(`Now playing: ${song.title}`);
          }
        } else {
          toast.error(`Couldn't find "${song.title}". Try searching manually.`);
        }
      } catch {
        toast.error("Failed to play song. Please try again.");
      } finally {
        setLoadingSong(null);
      }
    },
    [guildId, onAddToQueue, inVoice, hasPlayer]
  );

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-4 border-b border-white/[0.08]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-500/20 border border-white/[0.08]">
          <FiMusic className="h-5 w-5 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-white">AI Chat</h2>
          <p className="text-xs text-white/40">Powered by Meww.me • Your friendly music AI</p>
        </div>
        <button
          onClick={handleClearChat}
          title="Clear Chat"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-rose-400 hover:bg-white/[0.06] transition"
        >
          <FiTrash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-none px-4 sm:px-6 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={clsx("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            {/* Bot avatar (left side) */}
            {msg.role === "ai" && (
              <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden border border-rose-500/30 mt-0.5">
                <img src="/assets/mewwme.gif" alt="mewwme logo" className="h-full w-full object-cover" />
              </div>
            )}

            <div className={clsx("max-w-[80%] sm:max-w-[70%]")}>
              <div
                className={clsx(
                  "rounded-2xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-rose-500/20 border border-rose-500/20 text-white"
                    : "bg-white/[0.05] border border-white/[0.08] text-white/90"
                )}
              >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

              {/* Action button (vote/premium link) */}
              {msg.actionUrl && (
                <a
                  href={msg.actionUrl}
                  target={msg.actionUrl.startsWith("http") ? "_blank" : undefined}
                  rel={msg.actionUrl.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-semibold hover:bg-rose-500/30 transition"
                >
                  {msg.actionLabel || "Learn More"}
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                </a>
              )}

              {/* Song cards */}
              {msg.songs.length > 0 && (
                <div className={clsx("mt-3 space-y-2", msg.songs.length > 5 && "max-h-[320px] overflow-y-auto scrollbar-none pr-1")}>
                  {msg.songs.map((song, i) => (
                    <div
                      key={`${msg.id}-song-${i}`}
                      className="group flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/[0.06] p-2.5 hover:bg-white/[0.08] hover:border-white/[0.12] hover:shadow-lg hover:shadow-black/20 transition-all duration-200"
                    >
                      {/* Album artwork */}
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
                        {song.thumbnail ? (
                          <img
                            src={song.thumbnail}
                            alt={song.title}
                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-rose-500/20 to-purple-500/20">
                            <FiMusic className="h-5 w-5 text-rose-400/60" />
                          </div>
                        )}
                      </div>

                      {/* Track info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-rose-300 transition-colors">{song.title}</p>
                        <p className="text-[11px] text-white/40 truncate">{song.artist}</p>
                      </div>

                      {/* Play button */}
                      <div className="shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handlePlaySong(song)}
                          disabled={loadingSong === song.query}
                          title={hasPlayer ? "Add to queue" : "Play now"}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/15 text-green-400 hover:bg-green-500/30 hover:scale-110 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:hover:scale-100"
                        >
                          {loadingSong === song.query ? (
                            <div className="h-3.5 w-3.5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
                          ) : (
                            <FiPlay className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
              {/* Timestamp */}
              <p className={clsx("text-[10px] text-white/25 mt-1 px-1", msg.role === "user" ? "text-right" : "text-left")}>
                {msg.id === "welcome" ? "" : formatChatTime(msg.timestamp)}
              </p>
            </div>

            {/* User avatar (right side) */}
            {msg.role === "user" && (
              <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden border border-white/10 mt-0.5">
                {userAvatar ? (
                  <img src={userAvatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10 text-white/50 text-xs font-bold">
                    {user?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start gap-2.5">
            <div className="shrink-0 h-8 w-8 rounded-full overflow-hidden border border-rose-500/30 mt-0.5">
              <img src="/assets/mewwme.gif" alt="MEWWME" className="h-full w-full object-cover" />
            </div>
            <div className="rounded-2xl bg-white/[0.05] border border-white/[0.08] px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-rose-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-rose-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-white/40">Meww is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 sm:px-6 py-4 border-t border-white/[0.08]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me for music recommendations..."
            disabled={loading}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-rose-500/40 focus:bg-white/[0.06] transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <FiSend className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
