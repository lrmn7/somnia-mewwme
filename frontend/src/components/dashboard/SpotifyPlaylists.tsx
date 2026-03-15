import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { SpotifyPlaylistItem, SpotifyTrack } from "@/types/player";
import { MusicalNoteIcon, PlayIcon, XMarkIcon, PlusIcon } from "@heroicons/react/24/solid";

interface Props {
  guildId: string;
  onAddToQueue: (uris: string[]) => Promise<void>;
}

export default function SpotifyPlaylists({ guildId, onAddToQueue }: Props) {
  const [status, setStatus] = useState<{
    connected: boolean;
    configured: boolean;
  } | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [addingUri, setAddingUri] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ connected: boolean; configured: boolean }>("/api/spotify/status")
      .then(({ data }) => {
        setStatus(data);
        if (data.connected) {
          api
            .get<SpotifyPlaylistItem[]>("/api/spotify/playlists")
            .then(({ data: pl }) => setPlaylists(pl || []))
            .catch(() => {});
        }
      })
      .catch(() => setStatus({ connected: false, configured: false }))
      .finally(() => setLoading(false));
  }, []);

  const openTracks = async (id: string) => {
    setSelectedId(id);
    setTracksLoading(true);
    try {
      const { data } = await api.get<SpotifyTrack[]>(`/api/spotify/playlists/${id}/tracks`);
      setTracks(data || []);
    } catch {
      setTracks([]);
    } finally {
      setTracksLoading(false);
    }
  };

  const playPlaylist = async (id: string) => {
    setPlayingId(id);
    try {
      const { data } = await api.get<SpotifyTrack[]>(`/api/spotify/playlists/${id}/tracks`);
      const uris = (data || []).slice(0, 100).map((t) => t.uri);
      if (uris.length > 0) await onAddToQueue(uris);
    } finally {
      setPlayingId(null);
    }
  };

  const addTrack = async (uri: string) => {
    setAddingUri(uri);
    try {
      await onAddToQueue([uri]);
    } finally {
      setAddingUri(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Spotify is not configured on this bot.</p>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="text-center py-20">
        <div className="glass-card rounded-2xl p-8 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Connect Spotify</h3>
          <p className="text-sm text-muted-foreground mb-4">Enter your Spotify username in your profile settings to access your playlists</p>
          <a
            href="/profile"
            className="inline-block px-6 py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition-colors"
          >
            Go to Profile
          </a>
        </div>
      </div>
    );
  }

  if (selectedId) {
    const playlist = playlists.find((p) => p.id === selectedId);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedId(null)} className="p-2 rounded-lg hover:bg-white/10">
            <XMarkIcon className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{playlist?.name}</h2>
            <p className="text-xs text-muted-foreground">{tracks.length} tracks</p>
          </div>
        </div>

        {tracksLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-3 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {tracks.map((track) => (
              <div key={track.uri} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 group">
                {track.thumbnail ? (
                  <img src={track.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                    <MusicalNoteIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{track.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
                </div>
                <button
                  onClick={() => addTrack(track.uri)}
                  disabled={addingUri === track.uri}
                  className="p-2 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                >
                  {addingUri === track.uri ? (
                    <div className="w-4 h-4 border-2 border-pink-400/30 border-t-pink-400 rounded-full animate-spin" />
                  ) : (
                    <PlusIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Spotify Playlists</h2>
      {playlists.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">No Spotify playlists found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {playlists.map((pl) => (
            <div key={pl.id} className="glass-card glass-card-hover rounded-xl p-4 cursor-pointer overflow-hidden">
              <div className="flex gap-4">
                {pl.image ? (
                  <img src={pl.image} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <MusicalNoteIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{pl.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{pl.trackCount} tracks</p>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playPlaylist(pl.id);
                      }}
                      disabled={playingId === pl.id}
                      className="px-3 py-1 rounded-md bg-pink-500/20 text-pink-400 text-xs hover:bg-pink-500/30 disabled:opacity-50"
                    >
                      {playingId === pl.id ? "Loading..." : "Play"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openTracks(pl.id);
                      }}
                      className="px-3 py-1 rounded-md bg-white/10 text-foreground text-xs hover:bg-white/15"
                    >
                      Tracks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
