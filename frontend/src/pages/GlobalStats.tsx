import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { GlobalStatsData } from "@/types/player";
import Navbar from "@/components/Navbar";
import BackgroundGlow from "@/components/BackgroundGlow";
import Footer from "@/components/Footer";

function formatListenTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function Thumbnail({
  src,
  name,
  isArtist,
  isGuild,
  size = "sm",
}: {
  src?: string | null;
  name: string;
  isArtist?: boolean;
  isGuild?: boolean;
  size?: "sm" | "lg";
}) {
  const [error, setError] = useState(false);
  const dim = size === "lg" ? "w-14 h-14" : "w-10 h-10";
  const rounded = isGuild ? "rounded-2xl" : isArtist ? "rounded-full" : "rounded-lg";

  if (!src || error) {
    return (
      <div
        className={`${dim} ${rounded} bg-white/10 flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={name}
      className={`${dim} ${rounded} object-cover shrink-0`}
      onError={() => setError(true)}
    />
  );
}

export default function GlobalStats() {
  const [data, setData] = useState<GlobalStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GlobalStatsData>("/api/global-stats")
      .then(({ data }) => setData(data))
      .catch(() => setError("Failed to load global statistics"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      <Navbar />
      <BackgroundGlow />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-32 sm:pt-36 pb-20">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Global Stats</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Aggregated music statistics across all servers.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        ) : data ? (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                  </svg>
                }
                label="Total Tracks Played"
                value={data.globalTracksPlayed.toLocaleString()}
              />
              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                label="Total Listen Time"
                value={formatListenTime(data.globalListenTimeMs)}
              />
              <StatCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                }
                label="Active Servers"
                value={data.totalGuilds.toLocaleString()}
              />
            </div>

            {/* Guild Leaderboard */}
            {data.topGuilds.length > 0 && (
              <div className="glass-card rounded-2xl p-6 sm:p-8 mb-10">
                <h2 className="text-xl font-bold text-foreground mb-6">Server Leaderboard</h2>
                <div className="space-y-3">
                  {data.topGuilds.slice(0, 10).map((guild, i) => {
                    const isTop = i === 0;
                    return (
                      <div
                        key={guild.guildId}
                        className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
                          isTop
                            ? "bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-500/20"
                            : "bg-white/5 hover:bg-white/10"
                        }`}
                      >
                        <span
                          className={`text-sm font-bold w-6 text-center shrink-0 ${
                            i === 0
                              ? "text-pink-400"
                              : i === 1
                              ? "text-gray-300"
                              : i === 2
                              ? "text-amber-500"
                              : "text-muted-foreground"
                          }`}
                        >
                          #{i + 1}
                        </span>
                        <Thumbnail src={guild.iconUrl} name={guild.name} isGuild size={isTop ? "lg" : "sm"} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground truncate">{guild.name}</p>
                            {isTop && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-medium shrink-0">
                                Top Server
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <Badge
                              icon={
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
                                </svg>
                              }
                              label={`${guild.tracksPlayed.toLocaleString()} tracks`}
                            />
                            <Badge
                              icon={
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              }
                              label={formatListenTime(guild.listenTimeMs)}
                            />
                            <Badge
                              icon={
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                                </svg>
                              }
                              label={`${guild.memberCount.toLocaleString()} members`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Tracks & Artists */}
            <div className="grid md:grid-cols-2 gap-6">
              <TopList
                title="Top Tracks"
                items={data.topTracks.slice(0, 10).map((t) => ({
                  id: t.trackId,
                  name: t.name,
                  count: t.count,
                  artworkUrl: t.artworkUrl,
                  url: t.trackUrl,
                  isArtist: false,
                }))}
              />
              <TopList
                title="Top Artists"
                items={data.topArtists.slice(0, 10).map((a) => ({
                  id: a.artistId,
                  name: a.name,
                  count: a.count,
                  artworkUrl: a.artworkUrl,
                  url: a.artistUrl,
                  isArtist: true,
                }))}
              />
            </div>
          </>
        ) : null}
      </div>
      <Footer />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="glass-card rounded-xl p-5 hover:scale-[1.02] transition-transform text-center sm:text-left">
      <div className="text-pink-400 mb-2 flex justify-center sm:justify-start">{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function Badge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

function TopList({
  title,
  items,
}: {
  title: string;
  items: {
    id: string;
    name: string;
    count: number;
    artworkUrl?: string | null;
    url?: string | null;
    isArtist: boolean;
  }[];
}) {
  if (items.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
        <p className="text-sm text-muted-foreground text-center py-6">No data yet</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-bold text-foreground mb-4">{title}</h3>
      <div className="space-y-1">
        {items.map((item, i) => {
          const content = (
            <>
              <span
                className={`text-xs font-bold w-5 text-right shrink-0 ${
                  i === 0 ? "text-pink-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-500" : "text-muted-foreground"
                }`}
              >
                {i + 1}
              </span>
              <Thumbnail src={item.artworkUrl} name={item.name} isArtist={item.isArtist} />
              <span className="text-sm font-medium text-foreground truncate flex-1 min-w-0">
                {item.name}
              </span>
            </>
          );

          if (item.url) {
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
              >
                {content}
              </a>
            );
          }

          return (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
