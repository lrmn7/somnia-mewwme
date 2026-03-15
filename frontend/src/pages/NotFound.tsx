import { useLocation, Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Home, ArrowLeft, Music } from "lucide-react";
import Navbar from "@/components/Navbar";
import BackgroundGlow from "@/components/BackgroundGlow";
import Footer from "@/components/Footer";

const floatingNotes = [
  { emoji: "🎵", x: "10%", y: "20%", duration: 6, delay: 0 },
  { emoji: "🎶", x: "85%", y: "15%", duration: 8, delay: 1 },
  { emoji: "🎧", x: "75%", y: "70%", duration: 7, delay: 2 },
  { emoji: "🎵", x: "20%", y: "75%", duration: 9, delay: 0.5 },
  { emoji: "🎶", x: "50%", y: "10%", duration: 7, delay: 1.5 },
  { emoji: "🎧", x: "90%", y: "45%", duration: 6, delay: 3 },
  { emoji: "🎵", x: "5%", y: "50%", duration: 8, delay: 2.5 },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const glitchAnimation = useMemo(
    () => ({
      textShadow: [
        "0 0 0px transparent",
        "3px 0 0px rgba(236,72,153,0.7), -3px 0 0px rgba(96,165,250,0.7)",
        "0 0 0px transparent",
        "-2px 0 0px rgba(236,72,153,0.5), 2px 0 0px rgba(96,165,250,0.5)",
        "0 0 0px transparent",
      ],
    }),
    []
  );

  const glitchTransition = useMemo(
    () => ({
      duration: 3,
      repeat: Infinity,
      repeatType: "loop" as const,
      ease: "easeInOut" as const,
    }),
    []
  );

  return (
    <div className="min-h-screen flex flex-col relative text-foreground overflow-hidden">
      <BackgroundGlow />
      <Navbar />

      {/* Floating music notes */}
      {floatingNotes.map((note, i) => (
        <motion.span
          key={i}
          className="absolute text-2xl sm:text-3xl opacity-10 pointer-events-none select-none z-0"
          style={{ left: note.x, top: note.y }}
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 15, 0, -15, 0],
            rotate: [0, 10, 0, -10, 0],
            opacity: [0.06, 0.12, 0.06],
          }}
          transition={{
            duration: note.duration,
            delay: note.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {note.emoji}
        </motion.span>
      ))}

      <main className="flex-1 relative z-10 flex items-center justify-center px-4 py-28">
        <div className="w-full max-w-2xl text-center">
          {/* 404 number */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h1
              className="text-[8rem] sm:text-[12rem] md:text-[14rem] font-black leading-none tracking-tighter select-none"
              style={{
                background:
                  "linear-gradient(135deg, hsl(330,81%,60%) 0%, hsl(280,80%,60%) 50%, hsl(330,81%,68%) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
              animate={glitchAnimation}
              transition={glitchTransition}
            >
              404
            </motion.h1>
          </motion.div>

          {/* Glass card */}
          <motion.div
            className="glass-card rounded-2xl p-8 sm:p-10 mx-auto -mt-8 sm:-mt-12"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
          >
            {/* Icon */}
            <motion.div
              className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
              style={{
                background: "rgba(236, 72, 153, 0.15)",
                border: "1px solid rgba(236, 72, 153, 0.25)",
              }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <Music className="h-8 w-8 text-pink-400" />
            </motion.div>

            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Page Not Found
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-2 max-w-md mx-auto">
              Looks like you wandered into another dimension.
            </p>
            <p className="text-muted-foreground/60 text-sm mb-8">
              <span className="font-mono bg-white/5 px-2 py-1 rounded text-pink-400/80">
                {location.pathname}
              </span>{" "}
              doesn't exist on our server.
            </p>

            {/* Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-3 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Link to="/" className="btn-primary-glass rounded-xl">
                <Home className="h-4 w-4" />
                Back to Home
              </Link>
              <button
                onClick={() => window.history.back()}
                className="btn-secondary-glass rounded-xl flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            </motion.div>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            className="mt-10 flex items-center justify-center gap-3 text-muted-foreground/40 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/10" />
            <span>Error 404 • Mewwme</span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/10" />
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NotFound;
