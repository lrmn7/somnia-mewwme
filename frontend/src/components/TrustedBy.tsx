import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

interface Server {
  id: string;
  name: string;
  memberCount: number;
  icon: string | null;
}

function formatMembers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return `${count}`;
}

const ServerCard = ({ server }: { server: Server }) => (
  <div className="glass-card glass-card-hover rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-[220px] sm:min-w-[260px] group mx-2 sm:mx-3">
    <div className="relative flex-shrink-0">
      {server.icon ? (
        <img
          src={server.icon}
          alt={server.name}
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover transition-colors duration-300"
        />
      ) : (
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-muted-foreground font-bold text-lg">
          {server.name.charAt(0)}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-bold text-sm sm:text-base truncate text-foreground group-hover:text-pink-300 transition-colors duration-300">
        {server.name}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-muted-foreground">
          {formatMembers(server.memberCount)} members
        </span>
      </div>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 min-w-[220px] sm:min-w-[260px] mx-2 sm:mx-3 bg-white/5">
    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="h-4 w-24 rounded bg-white/5 animate-pulse mb-1.5" />
      <div className="h-3 w-16 rounded bg-white/5 animate-pulse" />
    </div>
  </div>
);

const TrustedBy = () => {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Server[]>("/api/top-servers")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setServers(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && servers.length === 0) return null;

  return (
    <section className="relative z-10 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center mb-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl font-bold mb-4 text-foreground"
        >
          Discord Communities with{" "}<span className="text-mewwme">Mewwme</span>
        </motion.h2>
      </div>

      <div className="max-w-full sm:max-w-[85%] lg:max-w-[70%] mx-auto">
        <div className="w-full py-4 relative">
          <div className="marquee-mask relative overflow-hidden py-4">
            {loading ? (
              <div className="flex">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className="marquee-track">
                <div className="flex flex-shrink-0">
                  {servers.map((server) => (
                    <ServerCard key={server.id} server={server} />
                  ))}
                </div>
                <div className="flex flex-shrink-0" aria-hidden="true">
                  {servers.map((server) => (
                    <ServerCard
                      key={`dup-${server.id}`}
                      server={server}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
