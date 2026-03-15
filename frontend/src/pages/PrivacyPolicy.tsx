import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackgroundGlow from "@/components/BackgroundGlow";
import { links } from '@/config/links';
const PrivacyPolicy = () => {
const lastUpdated = "March 8, 2026";

  const policies = [
    {
      title: "1. Introduction",
      content: (
        <p>
          Welcome to Mewwme. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the Mewwme Discord Bot and its related services (website, dashboard, and support server). By using Mewwme, you agree to the collection and use of information in accordance with this policy.
        </p>
      ),
    },
    {
      title: "2. Information We Collect",
      content: (
        <>
          <p className="mb-2">To provide our music services efficiently, we collect the following data from Discord's API:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>User Data:</strong> Discord User ID, username, and avatar (for profiles and playlist creation).</li>
            <li><strong>Server Data:</strong> Guild ID, Voice Channel ID, and Text Channel ID (to play music and send command responses).</li>
            <li><strong>Usage Data:</strong> Commands executed, error logs, and music playback history (to improve bot performance and fix bugs).</li>
            <li><strong>Custom Data:</strong> User-created playlists, saved settings, and premium subscription status.</li>
          </ul>
        </>
      ),
    },
    {
      title: "3. How We Use Your Information",
      content: (
        <>
          <p className="mb-2">We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To operate, maintain, and provide the features of the bot.</li>
            <li>To execute music commands and join the correct voice channels.</li>
            <li>To save and manage your custom music playlists and server settings.</li>
            <li>To provide customer support and troubleshoot technical issues.</li>
          </ul>
        </>
      ),
    },
    {
      title: "4. Data Retention and Deletion",
      content: (
        <p>
          We retain your data only for as long as necessary to provide our services. You have the right to request the deletion of your data at any time. If you wish to delete your custom playlists or reset your server settings, you can use the respective bot commands (e.g., <code>/delete</code> for playlists or <code>/settings reset</code>). For complete data removal, please contact us in our support server.
        </p>
      ),
    },
    {
      title: "5. Third-Party Services",
      content: (
        <p>
          Mewwme interacts with various third-party platforms to fetch and play music (such as YouTube, Spotify, SoundCloud, Apple Music, etc.). We do not control these third-party services, and your use of those platforms through Mewwme is subject to their respective terms of service and privacy policies. We do not sell, trade, or rent your personal information to third parties.
        </p>
      ),
    },
    {
      title: "6. Security",
      content: (
        <p>
          The security of your data is important to us. We implement industry-standard security measures to protect against unauthorized access, alteration, disclosure, or destruction of your personal information stored in our database. However, please remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
        </p>
      ),
    },
    {
      title: "7. Changes to This Privacy Policy",
      content: (
        <p>
          We may update our Privacy Policy from time to time. We will notify users of any significant changes by posting an announcement in our official Support Server. You are advised to review this Privacy Policy periodically for any changes.
        </p>
      ),
    },
    {
      title: "8. Contact Us",
      content: (
        <p>
          If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us by joining our official <a href={links.supportServer} className="text-blue-400 hover:text-blue-300 underline transition-colors">Support Server</a>.
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
                Privacy Policy
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                How we handle and protect your data when using Mewwme.
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Last updated: {lastUpdated}
              </p>
            </motion.div>

            {/* Content Sections */}
            <div className="space-y-8">
              {policies.map((policy, index) => (
                <motion.div
                  key={policy.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: Math.min(index * 0.1, 0.5) }}
                  className="glass-card rounded-2xl p-6 sm:p-8"
                >
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {policy.title}
                  </h2>
                  <div className="text-muted-foreground leading-relaxed">
                    {policy.content}
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

export default PrivacyPolicy;