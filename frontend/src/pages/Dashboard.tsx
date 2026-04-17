import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { DISCORD_CLIENT_ID } from "@/lib/config";
import type { BotGuild } from "@/types/player";
import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";
import { motion } from "framer-motion";

const MotionDiv = motion.div as any;

function getInviteUrl(guildId: string) {
  const redirectUri = encodeURIComponent(
    window.location.origin + "/invite-callback"
  );
  return (
    `https://discord.com/oauth2/authorize` +
    `?client_id=${DISCORD_CLIENT_ID}` +
    `&permissions=281477127351344` +
    `&scope=bot+applications.commands` +
    `&guild_id=${guildId}` +
    `&disable_guild_select=true` +
    `&redirect_uri=${redirectUri}` +
    `&response_type=code`
  );
}

export default function Dashboard() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [guilds, setGuilds] = useState<BotGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [justInvitedId, setJustInvitedId] = useState<string | null>(null);

  const fetchGuilds = useCallback(async () => {
    try {
      const { data } = await api.get<BotGuild[]>("/api/guilds");
      setGuilds(data);
    } catch {
      setError("Failed to load servers. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/login");
      return;
    }
    if (status === "authenticated") {
      fetchGuilds().finally(() => setLoading(false));
    }
  }, [status, navigate, fetchGuilds]);

  useEffect(() => {
    const invited = searchParams.get("invited");
    if (!invited || status !== "authenticated") return;

    setJustInvitedId(invited);
    setTimeout(() => setJustInvitedId(null), 5000);

    fetchGuilds().finally(() => {
      navigate("/servers", { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, status]);

  const withBot = guilds.filter(
    (g) => g.hasBot && g.name.toLowerCase().includes(search.toLowerCase())
  );
  const withoutBot = guilds.filter(
    (g) => !g.hasBot && g.name.toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="min-h-screen flex flex-col relative text-foreground items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />

      <main className="flex-1">
        <section className="relative z-10 max-w-6xl mx-auto px-4 pt-32 pb-16">
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Your Servers</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Select a server to manage your music bot
          </p>
        </div>

        {/* Search */}
        <div className="relative mx-auto mb-10 max-w-xl">
          <svg
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search servers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-foreground placeholder-muted-foreground backdrop-blur-sm transition focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/30"
          />
        </div>

        {error && (
          <div className="glass-card rounded-xl p-4 mb-8 border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Servers with bot */}
        {withBot.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Servers with Mewwme
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
              {withBot.map((guild) => (
                <ServerCard
                  key={guild.id}
                  guild={guild}
                  hasBot
                  highlight={guild.id === justInvitedId}
                  onAction={() => navigate(`/player/${guild.id}`)}
                />
              ))}
            </div>
          </MotionDiv>
        )}

        {guilds.filter((g) => g.hasBot).length > 0 &&
          withBot.length === 0 &&
          search && (
            <div className="text-center py-8 mb-10">
              <p className="text-muted-foreground">No servers match your search.</p>
            </div>
          )}

        {/* Servers without bot */}
        {(withoutBot.length > 0 || guilds.some((g) => !g.hasBot)) && (
          <MotionDiv
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-muted-foreground mb-1">
              Add Mewwme to a Server
            </h2>
            <p className="text-sm text-muted-foreground/60 mb-4">
              Servers where you have permission to add bots
            </p>
            {withoutBot.length === 0 && search ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No servers match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {withoutBot.map((guild) => (
                  <ServerCard
                    key={guild.id}
                    guild={guild}
                    hasBot={false}
                    onAction={() => {
                      window.location.href = getInviteUrl(guild.id);
                    }}
                  />
                ))}
              </div>
            )}
          </MotionDiv>
        )}

        {guilds.length === 0 && !loading && !error && (
          <div className="text-center py-20">
            <p className="text-lg text-muted-foreground">
              No Discord servers found
            </p>
            <p className="text-sm text-muted-foreground/60 mt-2">
              Make sure you have manage permissions in at least one server
            </p>
          </div>
        )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ServerCard({
  guild,
  hasBot,
  highlight = false,
  onAction,
}: {
  guild: BotGuild;
  hasBot: boolean;
  highlight?: boolean;
  onAction: () => void;
}) {
  const iconUrl = guild.iconUrl
    ? guild.iconUrl
    : guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`
    : null;

  return (
    <MotionDiv
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`glass-card glass-card-hover rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-colors duration-300 ${
        highlight
          ? "ring-2 ring-green-500/60 bg-green-500/10"
          : ""
      }`}
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
      <p className="text-sm font-medium text-foreground truncate max-w-full">{guild.name}</p>
      <button
        onClick={onAction}
        className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          hasBot
            ? "bg-pink-500/15 text-pink-400 hover:bg-pink-500/25"
            : "bg-indigo-600 text-white hover:bg-indigo-500"
        }`}
      >
        {hasBot ? "Setup" : "Invite Bot"}
      </button>
    </MotionDiv>
  );
}
