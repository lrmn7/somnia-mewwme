import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import type { Playlist } from "@/types/player";

function fmtDuration(ms?: number) {
  if (!ms) return "--:--";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}


function CreateModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (name: string, description: string, isPrivate: boolean) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setErr("Name is required."); return; }
    setBusy(true);
    setErr("");
    try {
      await onCreate(name.trim(), description.trim(), isPrivate);
      onClose();
    } catch {
      toast.error("Failed to create playlist.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0d0d]/95 p-6 shadow-2xl shadow-black/40 overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/60 via-purple-500/40 to-transparent rounded-t-2xl" />
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-white">New Playlist</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40">Name <span className="text-rose-500">*</span></label>
            <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 border border-white/[0.08] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:outline-none transition-colors"
              placeholder="My awesome playlist" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 border border-white/[0.08] focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/20 focus:outline-none transition-colors"
              placeholder="Optional description" />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="accent-rose-500 h-4 w-4 rounded" />
            <span className="text-sm text-white/50 group-hover:text-white transition-colors">Private playlist</span>
          </label>
          {err && <p className="text-xs text-red-400 bg-red-400/5 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm text-white/50 hover:text-white border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-rose-500/20">
              {busy ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function AddTrackModal({ playlist, onClose, onAdd }: {
  playlist: Playlist;
  onClose: () => void;
  onAdd: (playlistId: string, uri: string) => Promise<void>;
}) {
  const [uri, setUri] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = uri.trim();
    if (!raw) { setErr("A Spotify URL is required."); return; }
    let parsed: URL;
    try { parsed = new URL(raw); } catch {
      toast.error("Invalid input - please paste a valid Spotify URL.");
      setErr("That doesn't look like a URL.");
      return;
    }
    if (parsed.hostname !== "open.spotify.com") {
      toast.error("Only Spotify links are supported (open.spotify.com).");
      setErr("Only Spotify URLs are accepted.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await onAdd(playlist.id, raw);
      onClose();
    } catch (e: unknown) {
      const axiosErr = e as { response?: { data?: { error?: string } } };
      toast.error(axiosErr?.response?.data?.error ?? "Failed to add track.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0d0d0d]/95 p-6 shadow-2xl shadow-black/40 overflow-hidden relative"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-500/30 to-transparent rounded-t-2xl" />
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-white">Add Track</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <p className="mb-5 text-sm text-white/40">to &ldquo;{playlist.name}&rdquo;</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/40">Spotify URL <span className="text-emerald-500">*</span></label>
            <input ref={inputRef} value={uri}
              onChange={(e) => { setUri(e.target.value); setErr(""); }}
              className="w-full rounded-xl bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 border border-white/[0.08] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 focus:outline-none transition-colors"
              placeholder="https://open.spotify.com/track/..." />
            <p className="mt-2 text-[11px] text-white/30">
              Only <span className="text-emerald-500 font-medium">open.spotify.com</span> track, album, or playlist links are accepted.
            </p>
          </div>
          {err && <p className="text-xs text-red-400 bg-red-400/5 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex justify-end gap-2.5 pt-3">
            <button type="button" onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm text-white/50 hover:text-white border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200">
              Cancel
            </button>
            <button type="submit" disabled={busy}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-all duration-200 shadow-lg shadow-green-500/15">
              {busy ? "Adding..." : "Add Track"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


function PlaylistPanel({ playlist, onClose, onAddTrack, onRemoveTrack, onPlay, onPlayTrack }: {
  playlist: Playlist;
  onClose: () => void;
  onAddTrack: (playlistId: string, uri: string) => Promise<void>;
  onRemoveTrack: (playlistId: string, index: number) => Promise<void>;
  onPlay: (playlistId: string) => Promise<void>;
  onPlayTrack: (playlistId: string, index: number) => Promise<void>;
}) {
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const tracks = playlist.tracks ?? [];

  const handlePlay = async () => {
    setBusy(true);
    try { await onPlay(playlist.id); } finally { setBusy(false); }
  };

  const handlePlayTrack = async (index: number) => {
    setPlayingIndex(index);
    try { await onPlayTrack(playlist.id, index); } finally { setPlayingIndex(null); }
  };

  return (
    <>
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-white/[0.08] bg-[#0d0d0d]/95 shadow-2xl shadow-black/40 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative p-5 sm:p-6 pb-4 sm:pb-5 border-b border-white/[0.06]">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/60 via-purple-500/40 to-transparent" />
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
              {/* Playlist thumbnail */}
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-rose-500/10 shrink-0 flex items-center justify-center overflow-hidden shadow-lg shadow-rose-500/10">
                {tracks.find((t) => t.thumbnail)?.thumbnail ? (
                  <img src={tracks.find((t) => t.thumbnail)!.thumbnail!} alt="" className="h-full w-full object-cover" />
                ) : (
                  <svg className="h-7 w-7 sm:h-8 sm:w-8 text-rose-500/50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">{playlist.name}</h2>
                {playlist.description && <p className="text-sm text-white/40 mt-0.5 line-clamp-1">{playlist.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-white/40">
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.125" />
                    </svg>
                    {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
                  </span>
                  <span className="w-px h-3 bg-white/10" />
                  <span>{playlist.private ? "Private" : "Public"}</span>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition shrink-0 ml-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 px-5 sm:px-6 py-3 sm:py-3.5 border-b border-white/[0.06]">
          <button onClick={handlePlay} disabled={tracks.length === 0 || busy}
            className="group flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:opacity-90 disabled:opacity-40 transition-all duration-200 shadow-lg shadow-green-500/15">
            {busy ? (
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            {busy ? "Loading..." : "Play All"}
          </button>
          <button onClick={() => setShowAddTrack(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-semibold text-white/50 hover:text-white hover:border-white/20 hover:bg-white/[0.04] transition-all duration-200">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Track
          </button>
        </div>

        {/* Track list */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-white/40">
              <svg className="h-10 w-10 text-white/10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.125" />
              </svg>
              <p className="text-sm">This playlist is empty.</p>
              <p className="text-xs text-white/25">Click &ldquo;Add Track&rdquo; above to add songs.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5">
              {tracks.map((track, i) => (
                <div key={i}
                  onClick={() => handlePlayTrack(i)}
                  className="flex items-center gap-2 sm:gap-3 rounded-xl px-2 sm:px-3 py-2 hover:bg-white/[0.04] group transition-colors duration-150 cursor-pointer"
                >
                  {playingIndex === i ? (
                    <svg className="h-3.5 w-3.5 shrink-0 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <>
                      <span className="w-5 text-right text-[10px] tabular-nums text-white/40 shrink-0 group-hover:hidden">{i + 1}</span>
                      <svg className="hidden group-hover:block h-3.5 w-3.5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </>
                  )}
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-white/[0.04] flex items-center justify-center">
                      <svg className="h-4 w-4 text-white/15" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium text-white">{track.title ?? "Unknown title"}</p>
                    <p className="truncate text-[10px] text-white/40">{track.author ?? ""}</p>
                  </div>
                  <span className="text-[10px] tabular-nums text-white/40 shrink-0 hidden sm:block">{fmtDuration(track.length)}</span>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveTrack(playlist.id, i); }} title="Remove track"
                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM8.46 11.88l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {showAddTrack && <AddTrackModal playlist={playlist} onClose={() => setShowAddTrack(false)} onAdd={onAddTrack} />}
    </>
  );
}


interface Props {
  guildId: string;
  onPlayStarted?: () => void;
}

export default function PlaylistsView({ guildId, onPlayStarted }: Props) {
  const auth = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [hasPlaylistAccess, setHasPlaylistAccess] = useState<boolean | null>(null);
  const [playlistRequirement, setPlaylistRequirement] = useState<string>("Member");
  const [voteUrl, setVoteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    api.get<{ hasPlaylistAccess: boolean; playlistRequirement: string; voteUrl: string | null }>("/api/playlists/access")
      .then(({ data }) => {
        setHasPlaylistAccess(data.hasPlaylistAccess);
        setPlaylistRequirement(data.playlistRequirement);
        setVoteUrl(data.voteUrl);
      })
      .catch(() => setHasPlaylistAccess(true));
  }, [auth.status]);

  useEffect(() => {
    if (auth.status !== "authenticated") return;
    api.get<Playlist[]>("/api/playlists")
      .then(({ data }) => setPlaylists(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [auth.status]);

  const handleCreate = async (name: string, description: string, isPrivate: boolean) => {
    const { data } = await api.post<Playlist>("/api/playlists", { name, description, private: isPrivate });
    setPlaylists((prev) => [...prev, data]);
    toast.success("Playlist created!");
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/api/playlists/${id}`);
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (selected?.id === id) setSelected(null);
    toast.success("Playlist deleted.");
  };

  const handleAddTrack = async (playlistId: string, uri: string) => {
    const { data } = await api.post<Playlist>(`/api/playlists/${playlistId}/tracks`, { uri });
    if (data && Array.isArray(data.tracks)) {
      setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? data : p)));
      setSelected((prev) => (prev?.id === playlistId ? data : prev));
    } else {
      const { data: all } = await api.get<Playlist[]>("/api/playlists");
      setPlaylists(all);
      setSelected((prev) => prev?.id === playlistId ? (all.find((p) => p.id === playlistId) ?? null) : prev);
    }
    toast.success("Track added!");
  };

  const handleRemoveTrack = async (playlistId: string, index: number) => {
    await api.delete(`/api/playlists/${playlistId}/tracks/${index}`);
    const { data } = await api.get<Playlist[]>("/api/playlists");
    setPlaylists(data);
    setSelected((prev) => prev?.id === playlistId ? (data.find((p) => p.id === playlistId) ?? null) : prev);
    toast.success("Track removed.");
  };

  const handlePlay = async (playlistId: string) => {
    await api.post(`/api/playlists/${playlistId}/play`, { guildId });
    setSelected(null);
    toast.success("Playlist queued!");
    onPlayStarted?.();
  };

  const handlePlayTrack = async (playlistId: string, index: number) => {
    await api.post(`/api/playlists/${playlistId}/play/${index}`, { guildId });
    toast.success("Track queued!");
    onPlayStarted?.();
  };

  if (auth.status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
      </div>
    );
  }

  const isVoterReq = playlistRequirement === "Voter";
  const isMaintenanceReq = playlistRequirement === "Admin" || playlistRequirement === "Owner";

  return (
    <div className="relative mx-auto max-w-5xl px-4 py-6 sm:py-10">
      {hasPlaylistAccess === false && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-[1px] rounded-2xl pointer-events-auto">
          <svg className="h-5 w-5 text-white/70" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h3 className="text-sm font-bold text-white">
            {isMaintenanceReq ? "This Feature is Under Maintenance" : isVoterReq ? "Vote Required" : "Premium Plan Required"}
          </h3>
          <p className="text-xs text-white/50 text-center px-4">
            {isMaintenanceReq
              ? "Custom playlists are currently under maintenance."
              : isVoterReq
                ? "Vote for the bot to unlock custom playlists."
                : "Only premium users can create custom playlists."}
          </p>
          {!isMaintenanceReq && (
            <a
              href={isVoterReq && voteUrl ? voteUrl : "/premium"}
              target={isVoterReq && voteUrl ? "_blank" : undefined}
              rel={isVoterReq && voteUrl ? "noopener noreferrer" : undefined}
              className="relative flex items-center gap-1 overflow-hidden rounded-lg border border-white/10 bg-white/[0.08] backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/[0.15] hover:border-white/25 active:scale-95"
            >
              <span className="relative z-10">{isVoterReq ? "Vote on Top.gg" : "Get Premium"}</span>
            </a>
          )}
        </div>
      )}

      <div className={hasPlaylistAccess === false ? "pointer-events-none select-none" : ""}>
        {/* Header */}
        <div className="mb-8 sm:mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="w-1 h-6 rounded-full bg-rose-500 shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">My Playlists</h1>
              {playlists.length > 0 && (
                <span className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-white/50">
                  {playlists.length}
                </span>
              )}
            </div>
            <p className="pl-3.5 text-sm text-white/40">Create playlists and load them into any server at once.</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="group flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 transition-all duration-200 shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98]">
            <svg className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Playlist
          </button>
        </div>

        {/* Content */}
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-20 rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.01]">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-rose-500/10">
              <svg className="h-10 w-10 text-rose-500/60" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.125A2.25 2.25 0 0016.875 2h-1.5A2.25 2.25 0 0013.5 4.125v12.428M9 21v-4.875A2.25 2.25 0 006.75 14h-1.5A2.25 2.25 0 003 16.125V21" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white">No playlists yet</p>
              <p className="mt-1 text-sm text-white/40">Create your first playlist to get started.</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-400 transition shadow-lg shadow-rose-500/20">
              Create your first playlist
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((pl, idx) => {
              const trackCount = pl.tracks?.length ?? 0;
              const firstThumb = pl.tracks?.find((t) => t.thumbnail)?.thumbnail;
              return (
                <div key={pl.id || `pl-${idx}`}
                  className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
                  onClick={() => setSelected(pl)}>
                  {/* Gradient bar top */}
                  <div className="h-0.5 w-full bg-gradient-to-r from-rose-500/60 via-purple-500/40 to-transparent" />

                  <div className="p-4 sm:p-5">
                    {/* Top row: thumbnail + delete btn */}
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-xl overflow-hidden bg-rose-500/10 shrink-0 flex items-center justify-center shadow-lg shadow-rose-500/10">
                        {firstThumb ? (
                          <img src={firstThumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <svg className="h-6 w-6 sm:h-7 sm:w-7 text-rose-500/50" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        )}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <svg className="h-5 w-5 text-white translate-x-px" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleDelete(pl.id); }}
                        title="Delete playlist"
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6v12zM8.46 11.88l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </button>
                    </div>

                    {/* Name & description */}
                    <h3 className="font-bold text-white truncate text-[15px] leading-snug">{pl.name}</h3>
                    {pl.description && (
                      <p className="mt-1 text-xs text-white/40 line-clamp-2 leading-relaxed">{pl.description}</p>
                    )}

                    {/* Meta row */}
                    <div className="mt-3 sm:mt-3.5 flex items-center gap-3 text-[11px] text-white/40">
                      <span className="flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V4.125" />
                        </svg>
                        {trackCount} {trackCount === 1 ? "track" : "tracks"}
                      </span>
                      <span className="w-px h-3 bg-white/10" />
                      <span className="flex items-center gap-1">
                        {pl.private ? (
                          <>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                            </svg>
                            Private
                          </>
                        ) : (
                          <>
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                            </svg>
                            Public
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
        {selected && (
          <PlaylistPanel
            playlist={selected}
            onClose={() => setSelected(null)}
            onAddTrack={handleAddTrack}
            onRemoveTrack={handleRemoveTrack}
            onPlay={handlePlay}
            onPlayTrack={handlePlayTrack}
          />
        )}
      </div>
    </div>
  );
}
