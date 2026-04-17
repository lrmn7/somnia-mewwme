import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CommunityCard from "@/components/CommunityCard";
import { api } from "@/lib/api";
import { FiInbox, FiSearch, FiX } from "react-icons/fi";

interface CommunityGuild {
  guildId: string;
  guildName: string;
  guildIcon: string | null;
  contractAddress: string;
  totalTipsCached?: number;
  isPremium?: boolean;
  createdAt?: number;
}

type SortType = "popular" | "newest";

export default function CommunityList() {
  const navigate = useNavigate();
  const [guilds, setGuilds] = useState<CommunityGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortType>("popular");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .get("/api/community/guilds")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.guilds;
        setGuilds(Array.isArray(list) ? list.filter((g: any) => g.contractAddress) : []);
      })
      .catch(() => setGuilds([]))
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const query = search.toLowerCase().trim();
    const filtered = query
      ? guilds.filter((g) => g.guildName.toLowerCase().includes(query))
      : guilds;

    if (sort === "popular") {
      return [...filtered].sort((a, b) =>
        (b.totalTipsCached || 0) - (a.totalTipsCached || 0)
      );
    } else {
      return [...filtered].sort((a, b) =>
        (b.createdAt || 0) - (a.createdAt || 0)
      );
    }
  }, [guilds, sort, search]);

  return (
    <div>
      {/* Sort + Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        {/* Sort Pills */}
        <div className="flex gap-2 shrink-0">
          {(["popular", "newest"] as const).map((s) => (
            <button
              key={s}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                sort === s
                  ? "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                  : "text-white/50 hover:text-white/80 border border-white/[0.06] hover:border-white/10"
              }`}
              onClick={() => setSort(s)}
            >
              {s === "popular" ? "Popular" : "Newest"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search server..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-pink-500/30 focus:border-pink-500/30 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full text-white/30 hover:text-white/60 transition"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-white/40">
          <FiInbox className="h-12 w-12 mb-4" />
          <p className="text-base font-medium">
            {search ? "No servers found" : "No community available yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map((guild) => (
            <CommunityCard
              key={guild.guildId}
              {...guild}
              onClick={() => navigate(`/community/${guild.guildId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
