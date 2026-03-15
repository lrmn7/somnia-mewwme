import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundGlow from "@/components/BackgroundGlow";
import { links } from '@/config/links';
const TermsOfService = () => {
const lastUpdated = "March 8, 2026";

  const terms = [
    {
      title: "1. Acceptance of Terms",
      content: (
        <p>
          By inviting the Mewwme bot to your Discord server or using any of our services (including our website and dashboard), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our bot and remove it from your servers.
        </p>
      ),
    },
    {
      title: "2. Description of Service",
      content: (
        <p>
          Mewwme is a Discord music bot that allows users to play and manage audio playback within Discord voice channels. We interact with third-party platforms (like YouTube, Spotify, SoundCloud, etc.) to fetch audio content. We do not host or distribute the audio content ourselves.
        </p>
      ),
    },
    {
      title: "3. Acceptable Use and Conduct",
      content: (
        <>
          <p className="mb-2">When using Mewwme, you agree <strong>not</strong> to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the bot to play illegal, offensive, or TOS-violating audio content.</li>
            <li>Intentionally spam commands or abuse the bot's API to cause lag or crashes.</li>
            <li>Exploit any bugs or vulnerabilities found in the bot.</li>
            <li>Sell or redistribute our premium features without explicit permission.</li>
          </ul>
        </>
      ),
    },
    {
      title: "4. Premium Subscriptions",
      content: (
        <p>
          Mewwme offers optional Premium features. By purchasing Premium, you agree to our pricing and payment terms. Subscriptions are billed automatically unless canceled. Refunds are subject to our <a href="/refundpolicy" className="text-blue-400 hover:text-blue-300 underline transition-colors">Refund Policy</a>. We reserve the right to modify Premium perks or pricing with prior notice.
        </p>
      ),
    },
    {
      title: "5. Service Availability",
      content: (
        <p>
          We strive to keep Mewwme online 24/7, but we do not guarantee 100% uptime. The bot may occasionally be offline for maintenance, updates, or due to external API limitations (e.g., Discord or YouTube outages). We are not liable for any disruption of service.
        </p>
      ),
    },
    {
      title: "6. Third-Party Services",
      content: (
        <p>
          Our bot uses third-party APIs to function. By using Mewwme, you are also bound by the terms of service of these third-party platforms (such as YouTube's Terms of Service). If these platforms change their policies or restrict access, Mewwme's functionality may be affected.
        </p>
      ),
    },
    {
      title: "7. Termination and Bans",
      content: (
        <p>
          We reserve the right to ban any user or blacklist any Discord server from using Mewwme at our sole discretion, without prior notice, if we determine that these Terms of Service have been violated.
        </p>
      ),
    },
    {
      title: "8. Disclaimer of Warranties",
      content: (
        <p>
          Mewwme is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We make no warranties, expressed or implied, regarding the bot's reliability, accuracy, or suitability for your specific needs.
        </p>
      ),
    },
    {
      title: "9. Changes to Terms",
      content: (
        <p>
          We may update these Terms of Service from time to time. Any changes will be communicated via our official Support Server or Website. Continued use of Mewwme after changes implies your acceptance of the new terms.
        </p>
      ),
    },
    {
      title: "10. Contact Information",
      content: (
        <p>
          If you have any questions or concerns regarding these terms, please reach out to our team via the official <a href={links.supportServer} className="text-blue-400 hover:text-blue-300 underline transition-colors">Support Server</a>.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative text-foreground">
      <BackgroundGlow />
      <Navbar />
      <div className="h-20 lg:h-24" />
      <main className="flex-1">
        <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-mewwme">
                Terms of Service
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                The rules and guidelines for using the Mewwme Discord bot.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Last updated: {lastUpdated}
              </p>
            </motion.div>

            {/* Content Sections */}
            <div className="space-y-8">
              {terms.map((term, index) => (
                <motion.div
                  key={term.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.5) }}
                  className="glass-card rounded-2xl p-6 sm:p-8"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {term.title}
                  </h2>
                  <div className="text-muted-foreground leading-relaxed">
                    {term.content}
                  </div>
                </motion.div>
              ))}
            </div>

          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfService;