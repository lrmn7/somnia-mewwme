import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import BackgroundGlow from "@/components/BackgroundGlow";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

interface CommunityServer {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  contractAddress: string;
  hasPremium?: boolean;
}

type Tab = "popular" | "newest";

export default function Community() {
  const [tab, setTab] = useState<Tab>("popular");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{
    popularServers: CommunityServer[];
    newestServers: CommunityServer[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.get(`/api/community/servers${search ? `?search=${encodeURIComponent(search)}` : ""}`)
        .then(({ data }) => setData(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, search ? 300 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const servers = data
    ? tab === "popular" ? data.popularServers : data.newestServers
    : [];

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <BackgroundGlow />
      <Navbar />
      <main className="flex-1 relative z-10 pt-28 sm:pt-36 pb-20 px-4 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Community
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Discover servers and support them with tips on Somnia Network.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-md mx-auto mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search servers..."
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:outline-none transition"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {([
            { key: "popular" as Tab, label: "Popular" },
            { key: "newest" as Tab, label: "Newest" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-purple-500/20 border border-purple-500/40 text-purple-400"
                  : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Server grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No servers found.</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {servers.map((server) => (
              <Link
                key={server.id}
                to={`/community/${server.id}`}
                className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-center gap-3">
                  {server.icon ? (
                    <img
                      src={server.icon}
                      alt={server.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {server.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-white truncate">{server.name}</h3>
                      {server.hasPremium && (
                        <span className="shrink-0 flex items-center gap-0.5 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[9px] font-bold text-purple-400">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{server.memberCount.toLocaleString()} members</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
