import { motion } from "framer-motion";
import CanvasCurvedLoop from "@/components/ui/curved-text";
const sources = [
  { name: "YouTube", icon: "https://cdn.simpleicons.org/youtube/white", url: "https://youtube.com/" },
  { name: "YouTube Music", icon: "https://cdn.simpleicons.org/youtubemusic/white", url: "https://music.youtube.com/" },
  { name: "Spotify", icon: "https://cdn.simpleicons.org/spotify/white", url: "https://spotify.com/" },
  { name: "SoundCloud", icon: "https://cdn.simpleicons.org/soundcloud/white", url: "https://soundcloud.com/" },
  { name: "Apple Music", icon: "https://cdn.simpleicons.org/applemusic/white", url: "https://music.apple.com/" },
  { name: "Deezer", icon: "https://cdn.simpleicons.org/deezer/white", url: "https://deezer.com/" },
  { name: "Tidal", icon: "https://cdn.simpleicons.org/tidal/white", url: "https://tidal.com/" },
  { name: "Bandcamp", icon: "https://cdn.simpleicons.org/bandcamp/white", url: "https://bandcamp.com/" },
  { name: "Twitch", icon: "https://cdn.simpleicons.org/twitch/white", url: "https://twitch.tv/" },
  { name: "Vimeo", icon: "https://cdn.simpleicons.org/vimeo/white", url: "https://vimeo.com/" },
  { name: "Mixcloud", icon: "https://cdn.simpleicons.org/mixcloud/white", url: "https://mixcloud.com/" },
  { name: "Reddit", icon: "https://cdn.simpleicons.org/reddit/white", url: "https://reddit.com/" },
  { name: "TikTok", icon: "https://cdn.simpleicons.org/tiktok/white", url: "https://tiktok.com/" },
];

const SourceCard = ({ source }: { source: typeof sources[0] }) => (
  <a
    href={source.url}
    target="_blank"
    rel="noopener noreferrer"
    className="rounded-2xl px-5 py-4 flex flex-col items-center gap-3 min-w-[120px] group/card mx-2 cursor-pointer"
  >
    <img 
      src={source.icon} 
      alt={source.name} 
      className="w-8 h-8 opacity-70 group-hover/card:opacity-100 group-hover/card:scale-[1.3] transition-all duration-300" 
    />
    <span className="text-xs text-muted-foreground group-hover/card:text-foreground transition-colors whitespace-nowrap mt-1">
      {source.name}
    </span>
  </a>
);

const MusicSources = () => {
  return (
    <section className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-0"
        >
          <div className="w-full max-w-7xl px-4 mx-auto marquee-mask">
            <CanvasCurvedLoop
              textSegments={[
                { text: "Stream From " },
                { text: "Anywhere", color: "#ec4899" },
              ]}
              speed={0.7}
              curveHeight={34}
              fontSize={44}
              height={116}
              gap={0.5}
              easing={0.05}
              direction="left"
              interactive={true}
              className="rounded-lg overflow-hidden text-black dark:text-white"
            />
          </div>
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-muted-foreground -mt-6"
        >
          One bot, endless music sources at your fingertips
        </motion.p>
      </div>
      <div className="w-full lg:w-[60%] mx-auto marquee-mask relative overflow-hidden py-4 group/marquee">
        <div className="sources-marquee-track flex group-hover/marquee:[animation-play-state:paused]">
          
          <div className="flex flex-shrink-0">
            {sources.map((source, i) => (
              <SourceCard key={i} source={source} />
            ))}
          </div>
          <div className="flex flex-shrink-0" aria-hidden="true">
            {sources.map((source, i) => (
              <SourceCard key={`dup-${i}`} source={source} />
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
};

export default MusicSources;
