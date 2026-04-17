import { motion } from "framer-motion";
import { FiGlobe } from "react-icons/fi";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import teams from "@/config/team.json";

type TeamMember = {
  id: number;
  name: string;
  categories: string[];
  badge: string | null;
  description: string;
  imageUrl: string;
  websiteUrl: string | null;
};

const Team = () => {
  const members = teams as TeamMember[];
  const availableRoles = Array.from(new Set(members.flatMap((team) => team.categories)));

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <Navbar />
      <div className="h-20 lg:h-24" />
      <main className="flex-1">
        <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-white">
                  Meet The Team
                </span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Meet the amazing team and contributors behind Mewwme&apos;s.
              </p>
            </motion.div>

            <div className="space-y-10">
              {availableRoles.map((role) => (
                <div key={role}>
                  <h2 className="text-2xl sm:text-3xl font-bold mb-5 text-foreground text-center">
                    {role}
                  </h2>
                  <div className="flex flex-wrap justify-center gap-6">
                    {members
                      .filter((member) => member.categories.includes(role))
                      .map((member, index) => (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 20 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-50px" }}
                          transition={{ duration: 0.45, delay: Math.min(index * 0.08, 0.25) }}
                          className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] max-w-sm glass-card rounded-2xl p-6 border border-white/10 hover:border-mewwme/40 transition-colors text-center"
                        >
                          <div className="flex flex-col items-center text-center">
                            <img
                              className="mx-auto h-24 w-24 rounded-full object-cover border-2 border-white/15"
                              src={member.imageUrl}
                              width={96}
                              height={96}
                              alt={member.name}
                            />
                            <div className="mt-4 flex items-center justify-center gap-2">
                              <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                              {member.websiteUrl && (
                                <a
                                  href={member.websiteUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Open ${member.name} profile`}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:border-mewwme/50 transition-colors"
                                >
                                  <FiGlobe className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                            {member.badge && (
                              <span className="absolute right-0 top-0 ml-2 -translate-y-2 translate-x-2 rounded-full bg-mewwme px-1 py-0 text-xs font-semibold text-gray-800">
                                {member.badge}
                              </span>
                            )}
                            <p className="mt-2 text-sm text-mewwme font-medium">{member.description}</p>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Team;
