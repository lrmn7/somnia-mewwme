import { motion } from "framer-motion";
import notify from "/assets/notify.svg";
import playerscard from "/assets/playerscard.svg";
import dashboard from "/assets/dashboard.svg";
import stats from "/assets/stats.svg";
import songreqchannel from "/assets/songreqchannel.png";

const features = [
  {
    title: "Play From Any Source",
    description: "Stream music from YouTube, Spotify, Apple Music, SoundCloud, Deezer, Tidal and more. Crystal-clear audio quality from all your favorite platforms.",
    tags: [
      { icon: "https://cdn.simpleicons.org/spotify", label: "Spotify" },
      { icon: "https://cdn.simpleicons.org/youtube", label: "YouTube" },
      { icon: "https://cdn.simpleicons.org/applemusic", label: "Apple Music" },
    ],
    images: [playerscard],
    layout: "left" as const,
  },
  {
    title: "Song Request Channel",
    description: "Set up a dedicated channel where anyone can request songs. Just type the song name and Mewwme plays it instantly. No commands required.",
    tags: [
      { label: "No Commands Required" },
      { label: "Queue By Typing" },
    ],
    images: [songreqchannel],
    layout: "right" as const,
  },
{
  title: "Music Dashboard Experience",
  description: "Control your music seamlessly with the web dashboard. Play tracks, manage the queue, view live synced lyrics and explore over 200+ radio stations from around the world all in one place.",
  tags: [
    { label: "Music Dashboard" },
    { label: "Live Lyrics Sync" },
    { label: "200+ Global Radio" },
  ],
  images: [dashboard],
  layout: "left" as const,
},
  {
    title: "Twitch & Youtube Notify",
    description: "Get fast and customizable Twitch/Youtube notifications in your Discord server with just a few clicks.",
    tags: [
      { label: "Twitch Stream" },
      { label: "Youtube Stream" },
      { label: "Youtube Video" },
    ],
    images: [notify],
    layout: "right" as const,
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const isLeft = feature.layout === "left";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="p-6 sm:p-8 lg:p-10"
    >
      <div className={`flex flex-col ${isLeft ? "lg:flex-row" : "lg:flex-row-reverse"} gap-8 items-center`}>
        {/* Text content */}
        <div className="flex-1 space-y-4">
          <h3 className="text-2xl sm:text-3xl font-bold text-mewwme">{feature.title}</h3>
          <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {feature.tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium glass-card text-foreground"
              >
                {tag.icon && <img src={tag.icon} alt="" className="w-4 h-4" />}
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        {/* Images */}
        <div className="flex-1 w-full">
          <div className="grid gap-3">
            {feature.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={feature.title}
                className="rounded-xl w-full object-cover border border-white/5"
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Features = () => {
  return (
    <section id="features" className="relative z-10 py-16 sm:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">
            Your Community, <span className="text-mewwme">Your Music</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Every feature tuned for the ultimate collective listening journey
          </p>
        </motion.div>

        <div className="space-y-8">
          {features.map((feature, i) => (
            <FeatureCard key={i} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;