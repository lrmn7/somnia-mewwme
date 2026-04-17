import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";


interface Command {
  name: string;
  description: string;
}

interface CommandCategory {
  category: string;
  commands: Command[];
}

export default function Commands() {
  const [commandData, setCommandData] = useState<CommandCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchCommands() {
      try {
        const { data } = await api.get<CommandCategory[]>("/api/commands");
        setCommandData(data);
      } catch (err) {
        const e = err as { response?: { data?: { error?: string } }; message?: string };
        setError(e?.response?.data?.error ?? e?.message ?? "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    fetchCommands();
  }, []);

  const categories = useMemo(
    () => ["All", ...commandData.map((cat) => cat.category)],
    [commandData]
  );

  const filteredCommands = useMemo(() => {
    return commandData
      .filter((category) => {
        if (selectedCategory !== "All" && category.category !== selectedCategory) {
          return false;
        }
        if (searchQuery) {
          return category.commands.some(
            (cmd) =>
              cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }
        return true;
      })
      .map((category) => ({
        ...category,
        commands: category.commands.filter(
          (cmd) =>
            !searchQuery ||
            cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }));
  }, [commandData, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <div className="h-20 lg:h-24" />
      <main className="flex-1">
        <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-white">
                  Mewwme Commands
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Complete list of all available commands for Mewwme Music Bot
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="max-w-2xl mx-auto mb-8"
            >
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search commands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-full bg-white/5 backdrop-blur-sm border border-pink-500/30 text-foreground placeholder-muted-foreground focus:border-pink-500 focus:outline-none transition-colors"
                />
              </div>
            </motion.div>

            {loading ? (
              <div>
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="h-12 w-28 rounded-full bg-white/5 animate-pulse" />
                  ))}
                </div>
                <div className="space-y-12">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i}>
                      <div className="h-10 w-48 rounded bg-white/5 animate-pulse mb-6" />
                      <div className="grid md:grid-cols-2 gap-6">
                        {Array.from({ length: 4 }).map((_, j) => (
                          <div key={j} className="h-28 rounded-xl bg-white/5 animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-red-400 text-xl mb-4">Failed to load commands</p>
                <p className="text-muted-foreground">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    api
                      .get<CommandCategory[]>("/api/commands")
                      .then(({ data }) => setCommandData(data))
                      .catch((err) => {
                        const e = err as { response?: { data?: { error?: string } }; message?: string };
                        setError(e?.response?.data?.error ?? e?.message ?? "Something went wrong");
                      })
                      .finally(() => setLoading(false));
                  }}
                  className="mt-4 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-semibold text-foreground hover:bg-white/10 transition"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="flex flex-wrap justify-center gap-3 mb-12"
                >
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                        selectedCategory === category
                          ? "bg-pink-500 text-black shadow-lg shadow-pink-500/40"
                          : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-pink-500/20"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </motion.div>
                <div className="space-y-12">
                  {filteredCommands.map((category, catIndex) => (
                    <motion.div
                      key={category.category}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: catIndex * 0.1 }}
                    >
                      <div className="mb-6 flex items-center">
                        <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-white">
                          {category.category}
                        </h2>
                        <span className="ml-3 text-sm text-muted-foreground">
                          ({category.commands.length} command{category.commands.length !== 1 ? "s" : ""})
                        </span>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        {category.commands.map((command, cmdIndex) => (
                          <motion.div
                            key={command.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(cmdIndex * 0.05, 0.5) }}
                            className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-pink-500/20 hover:border-pink-500/50 hover:bg-white/[0.08] hover:scale-[1.02] hover:shadow-lg hover:shadow-pink-500/10 transition-all duration-300"
                          >
                            <code className="text-pink-500 font-bold text-lg block mb-2">
                              {command.name}
                            </code>
                            <p className="text-muted-foreground">{command.description}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* No Results */}
                {filteredCommands.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <p className="text-muted-foreground text-xl">
                      No commands found matching &ldquo;{searchQuery}&rdquo;
                    </p>
                  </motion.div>
                )}
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  className="mt-20 p-10 text-center"
                >
                  <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-white mb-4">
                    Want More Features?
                  </h2>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Upgrade to Mewwme Premium for 80+ advanced commands and exclusive features
                  </p>
                  <a
                    href="/premium"
                    className="inline-block px-8 py-4 bg-pink-500 rounded-full text-black font-bold shadow-lg shadow-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/50 hover:scale-105 transition-all duration-300"
                  >
                    Mewwme Premium →
                  </a>
                </motion.div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
