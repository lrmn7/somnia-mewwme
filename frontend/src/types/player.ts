export type Requester =
  | {
      id: string;
      username: string;
      globalName: string | null;
      defaultAvatarURL: string | null;
    }
  | string
  | null;

export type Track = {
  title: string;
  uri: string;
  length: number;
  thumbnail: string | null;
  author: string;
  requester: Requester;
};

export type LoopMode = "song" | "queue" | "none";

export type PlayerState = {
  guildId: string;
  loop: LoopMode;
  pause: boolean;
  member: boolean | null;
  position: number;
  autoplay: boolean;
  filter: string | null;
  isPremium?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
  hasFilterAccess?: boolean;
  hasAutoplayAccess?: boolean;
  autoplayEnabled?: boolean;
  filterRequirement?: string;
  autoplayRequirement?: string;
  voteUrl?: string | null;
  defaultSource?: string;
  sourceAccess?: Record<string, { hasAccess: boolean; requirement: string }>;
  current: Track | null;
  queue: Track[];
  volume?: number;
  updatedAt?: number;
  /**
   * Monotonic sequence number from the server.
   * Used to reject stale playerState events that arrive out of order.
   * FIX: prevents dashboard desynchronization on rapid track transitions.
   */
  seq?: number;
};

export type BotGuild = {
  id: string;
  name: string;
  icon: string | null;
  iconUrl: string | null;
  permissions: string;
  owner: boolean;
  hasBot: boolean;
};

export type DiscordUser = {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  global_name?: string | null;
};

export type SearchTrack = {
  title: string;
  uri: string;
  length: number;
  thumbnail: string | null;
  author: string;
  requester: Requester;
};

export type SearchResult = {
  tracks: SearchTrack[];
  type: "playlist" | "search" | "track";
  playlistName?: string;
};

// Liked songs
export type LikedTrack = {
  title: string;
  uri: string;
  author: string;
  thumbnail: string | null;
  length: number;
  likedAt?: string;
};

// Custom playlists
export type PlaylistTrack = {
  title: string;
  uri: string;
  length?: number;
  thumbnail?: string | null;
  author?: string;
};

export type Playlist = {
  id: string;
  name: string;
  owner: string;
  private: boolean;
  created: string;
  description?: string;
  tracks?: PlaylistTrack[];
};

// Guild stats
export type GuildTopTrack = {
  trackId: string;
  name: string;
  trackUrl: string;
  artworkUrl: string;
  count: number;
};

export type GuildTopArtist = {
  artistId: string;
  name: string;
  artistUrl: string;
  artworkUrl: string;
  count: number;
};

export type GuildStatsData = {
  guildId: string;
  listenTimeMs: number;
  tracksPlayed: number;
  topTracks: GuildTopTrack[];
  topArtists: GuildTopArtist[];
};

// Guild settings
export type GuildSettings = {
  guildId: string;
  guildName: string;
  prefix: string;
  language: string;
  statusVoiceChannel: boolean;
  djRole: { guild: string; enable: boolean; roleid: string | null };
  controlButton: "enable" | "disable";
  twentyfourseven: boolean;
  setup: { guild: string; enable: boolean; channel: string | null; playmsg: string | null; voice: string | null; category: string | null } | null;
  tempVoiceChannel: { guildId: string; tempVoiceEnabled: boolean; createVoiceChannelId?: string } | null;
  roles?: { id: string; name: string; color: string }[];
  isPremium?: boolean;
  isOwner?: boolean;
  isAdmin?: boolean;
  isGuildOwner?: boolean;
  hasManageGuild?: boolean;
  has247Access?: boolean;
  requirement247?: string;
  hasSetupAccess?: boolean;
  requirementSetup?: string;
  hasLanguageAccess?: boolean;
  requirementLanguage?: string;
  hasStatusVCAccess?: boolean;
  requirementStatusVC?: string;
  hasPrefixAccess?: boolean;
  requirementPrefix?: string;
  hasDjRoleAccess?: boolean;
  requirementDjRole?: string;
  hasControlButtonAccess?: boolean;
  requirementControlButton?: string;
  autoplaySetting?: boolean;
  hasAutoplaySettingAccess?: boolean;
  requirementAutoplaySetting?: string;
  voteUrl?: string | null;
  defaultSource?: string;
  sourceAccess?: Record<string, { hasAccess: boolean; requirement: string }>;
};

// Radio
export type RadioCountry = {
  name: string;
  code: string;
  stationcount: number;
};

export type RadioStation = {
  id: string;
  name: string;
  url: string;
  favicon: string;
  country: string;
  tags: string;
  codec: string;
  bitrate: number;
  language: string;
  votes: number;
};

// Spotify playlists
export type SpotifyPlaylistItem = {
  id: string;
  name: string;
  description: string;
  image: string | null;
  trackCount: number;
  url: string;
  isPublic: boolean;
  owner: string;
};

export type SpotifyTrack = {
  title: string;
  uri: string;
  artist: string;
  thumbnail: string | null;
  duration: number;
};

// Top charts
export type ChartTrack = {
  rank: number;
  title: string;
  artist: string;
  spotify_url: string;
  cover: string;
  duration: number;
};

// Lyrics
export type SyncedLine = {
  time: number; // seconds (float)
  text: string;
};

export type LyricsData = {
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  syncedLyrics?: SyncedLine[] | null;
  plainLyrics?: string;
  error?: string;
};

// Filter presets
export type FilterPreset = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: string;
};

// Dashboard view type
export type DashboardView =
  | "player"
  | "playlists"
  | "settings"
  | "guild-stats"
  | "radio"
  | "ai-chat";

// User profile stats
export type UserTopTrack = {
  name: string;
  count: number;
  artworkUrl?: string | null;
  trackUrl?: string | null;
};

export type UserTopArtist = {
  name: string;
  count: number;
  artworkUrl?: string | null;
  artistUrl?: string | null;
};

export type UserStats = {
  totalSongsPlayed: number;
  listenTimeMs: number;
  topTracks: UserTopTrack[];
  topArtists: UserTopArtist[];
  firstLogin: number | null;
  loginCount: number;
};

// Global stats
export type GlobalTopTrack = {
  trackId: string;
  name: string;
  trackUrl: string | null;
  artworkUrl: string | null;
  count: number;
};

export type GlobalTopArtist = {
  artistId: string;
  name: string;
  artistUrl: string | null;
  artworkUrl: string | null;
  count: number;
};

export type GlobalTopGuild = {
  guildId: string;
  name: string;
  iconUrl: string | null;
  memberCount: number;
  tracksPlayed: number;
  listenTimeMs: number;
  inviteUrl: string | null;
};

export type GlobalStatsData = {
  globalListenTimeMs: number;
  globalTracksPlayed: number;
  totalGuilds: number;
  topGuilds: GlobalTopGuild[];
  topTracks: GlobalTopTrack[];
  topArtists: GlobalTopArtist[];
};
