import { motion } from "framer-motion";

const CommunityShowcase = () => {
  return (
    <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-8 sm:p-12 text-center relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 border border-purple-500/20 px-4 py-1.5 mb-6">
              <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs font-semibold text-purple-400 tracking-wide uppercase">Powered by Somnia Network</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white">
              Support Your Favorite Server
            </h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
              More than just a music bot. Send tips with STT tokens on Somnia Network
              and support the communities you love. Every tip is recorded on-chain,
              transparent and verifiable.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15">
                  <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Tip with STT</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/15">
                  <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <span>On-chain & Transparent</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-500/15">
                  <svg className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <span>Real-time via Reactivity</span>
              </div>
            </div>

            <a
              href="/community"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-sm font-semibold text-purple-300 hover:bg-purple-500/30 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              Explore Community
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CommunityShowcase;
