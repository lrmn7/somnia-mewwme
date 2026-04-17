import { MewslinkNodeOptions } from "../mewslink/main.js";
import { ClusterManagerOptions } from "../shard/ClusterManager.js";
export interface SomniaConfig {
  Enable: boolean;
  ChainId: number;
  RpcUrl: string;
  WssUrl: string;
  ExplorerUrl: string;
  CurrencySymbol: string;
  TreasuryAddress: string;
  PremiumAddress: string;
  TipJarFactoryAddress: string;
}

export interface Config {
  bot: Bot;
  lavalink: Lavalink;
  features: Features;
  utilities: Utilities;
  logchannel: LogChannel;
  PremiumRole: PremiumRole;
  Somnia: SomniaConfig;
  emojis: Emojis;
  HELPDESK: HELPDESK;
  HELPER_SETUP: HELPER_SETUP;
  MENU_HELP_EMOJI: MENU_HELP_EMOJI;
  PLAYER_BUTTON: PLAYER_BUTTON;
  WELCOMER_EVENTS: WELCOMER_EVENTS;
  IMAGES_WELCOMER: IMAGES_WELCOMER;
  SELECT_MENU_FILTER: SELECT_MENU_FILTER;
  SEARCH_COMMANDS_EMOJI: SEARCH_COMMANDS_EMOJI;
  PLAYER_SOURCENAME: PLAYER_SOURCENAME;
  TRACKS_EMOJI: TRACKS_EMOJI;
  COMMANDS_ACCESS: COMMANDS_ACCESS;
  DASHBOARD_ACCESS: DASHBOARD_ACCESS;
  DefaultSourceDashboard: DefaultSourceDashboard;
  GeminiAiChat?: GeminiAiChat;
}

export interface GeminiAiChat {
  Enable: boolean;
  ApiKeys: string[];
  Models: string[];
}

export interface PremiumRole {
  Enable: boolean;
  GuildID: string;
  RoleID: string;
  PatreonAccessToken: string;
  PatreonCampignId: string;
  PatreonLogChannelID: string;
  PatreonPriceUser: number;
  PatreonServerTiers: {
    price: number;
    quota: number;
  }[];
}

export interface LogChannel {
  UpdateChannelId: string;
  GuildJoinChannelID: string;
  GuildLeaveChannelID: string;
  RedeemChannelID: string;
  RemoveChannelID: string;
  GenerateCodeChannelID: string;
  RatingChannelID: string;
  BugReportChannelID: string;
  SuggestionChannelID: string;
  ErrorChannelID: string;
  PremiumExpireChannelID: string;
  CleanUpDatabase25DaysChannelID: string;
}

export interface Utilities {
  CatAndQuotes: CatAndQuotes;
  NotifyTwitch: NotifyTwitch;
  NotifyYoutube: NotifyYoutube;
  LyricsGenius: LyricsGenius;
}

export interface LyricsGenius {
  Enable: boolean;
  ApiKey: string;
}

export interface CatAndQuotes {
  Enable: boolean;
  ApiKey: string;
  CatChannelId: string;
  QuoteChannelId: string;
}

export interface NotifyTwitch {
  Enable: boolean;
  Schedule: string;
  GlobalChannelID: string;
  ClientId: string;
  ClientSecret: string;
  LimitPremium: Number;
  LimitNonPremium: Number;
}

export interface NotifyYoutube {
  Enable: boolean;
  Schedule: string;
  GlobalChannelID: string;
  ApiKey: string;
  ApiKey1: string;
  ApiKey2: string;
  ApiKey3: string;
  ApiKey4: string;
  ApiKey5: string;
  LimitPremium: Number;
  LimitNonPremium: Number;
}

export interface TRACKS_EMOJI {
  Author: string;
  Volume: string;
  Autoplay: string;
  Timers: string;
}

export interface PLAYER_SOURCENAME {
  YOUTUBE: string;
  SPOTIFY: string;
  DEEZER: string;
  TWITCH: string;
  SOUNDCLOUD: string;
  APPLE_MUSIC: string;
  YOUTUBE_MUSIC: string;
  HTTP: string;
  TIDAL: string;
  UNKNOWN: string;
}

export interface SEARCH_COMMANDS_EMOJI {
  YOUTUBE: string;
  SPOTIFY: string;
  DEEZER: string;
  TWITCH: string;
  SOUNDCLOUD: string;
  APPLE_MUSIC: string;
  YOUTUBE_MUSIC: string;
  TIDAL: string;
  UNKNOWN: string;
}

export interface SELECT_MENU_FILTER {
  placeholder: string;
  emoji_reset: string;
  emoji_filter: string;
  emoji_free: string;
  reset: string;
  threed: string;
  bass: string;
  bassboost: string;
  chipmunk: string;
  darthvader: string;
  daycore: string;
  doubletime: string;
  earrape: string;
  karaoke: string;
  nightcore: string;
  pitch: string;
  pop: string;
  rate: string;
  slowmotion: string;
  soft: string;
  speed: string;
  superbass: string;
  china: string;
  televison: string;
  treblebass: string;
  tremolo: string;
  vaporwave: string;
  vibrate: string;
  vibrato: string;
}

export interface PLAYER_BUTTON {
  autoplay: string;
  loop: string;
  pause: string;
  previous: string;
  queue: string;
  shuffle: string;
  skip: string;
  stop: string;
  volume_down: string;
  volume_up: string;
}

export interface Bot {
  TOKEN: string;
  SHARDING_SYSTEM: ClusterManagerOptions;
  EMBED_COLOR_MAIN: string;
  EMBED_COLOR_SECOND: string;
  OWNER_ID: string;
  MYSTATS_CARD: string;
  TOPSTATS_CARD: string;
  ADMIN: string[];
  DEFAULT_VOLUME: number;
  LANGUAGE: string;
  DEBUG_MODE: boolean;
  BOT_ACTIVITY_TYPE: number;
  BOT_ACTIVITY: string;
  STREAM_URL: string;
  BOT_STATUS: string;
  CUSTOM_STATUS: string;
  BOT_ACTIVITY1: string;
  BOT_ACTIVITY2: string;
  BOT_ACTIVITY3: string;
  WEBSITE_URL: string;
  SERVER_SUPPORT_URL: string;
  PREMIUM_URL: string;
  TEAM_NAME: string;
  TERMS_URL: string;
  PRIVACY_URL: string;
  IMAGES_URL_HELPMENU: string;
  IMAGES_URL_COMMAND: string;
  IMAGES_URL_ABOUT: string;
  IMAGES_URL_REQUEST_MUSIC: string;
  IMAGES_URL_REQUEST_NOQUEUE: string;
  COMMANDS_URL: string;
}

export interface HELPDESK {
  Enable: boolean;
  BUTTON_HELPDESK10: BUTTON_HELPDESK10;
  EMOJI1: string;
  EMOJI2: string;
  EMOJI3: string;
  EMOJI4: string;
  EMOJI5: string;
  EMOJI6: string;
  EMOJI7: string;
  EMOJI8: string;
  EMOJI9: string;
  EMOJI10: string;
  WEBSITE_URL: string;
  SERVER_SUPPORT_URL: string;
  PREMIUM_URL: string;
  HELPDESK_LOGS_CHANNEL_ID: string;
}

export interface BUTTON_HELPDESK10 {
  NAME1: string;
  NAME2: string;
  NAME3: string;
  URL1: string;
  URL2: string;
  URL3: string;
}

export interface HELPER_SETUP {
  Enable: boolean;
  SERVER_SUPPORT_URL: string;
  NAME1: string;
  NAME2: string;
  NAME3: string;
  VIEW_RULES: VIEW_RULES;
  SELECT_ROLES: SELECT_ROLES;
  SUPPORT_US: SUPPORT_US;
}

export interface VIEW_RULES {
  ROLE_ID: string;
  ROLE_NAME: string;
  NAME1: string;
  NAME2: string;
  NAME3: string;
  NAME4: string;
  NAME5: string;
  URL1: string;
  URL2: string;
  URL3: string;
  URL4: string;
  URL5: string;
}

export interface SELECT_ROLES {
  NAME1: string;
  NAME2: string;
  NAME3: string;
  NAME4: string;
  ID1: string;
  ID2: string;
  ID3: string;
  ID4: string;
}

export interface SUPPORT_US {
  NAME1: string;
  NAME2: string;
  NAME3: string;
  URL1: string;
  URL2: string;
  URL3: string;
}

export interface MENU_HELP_EMOJI {
  E_HOME: string;
  E_SETTING: string;
  E_INFO: string;
  E_PLAYLIST: string;
  E_FILTER: string;
  E_GAMES: string;
  E_ALLCMD: string;
  E_MUSIC: string;
  E_SUPPORT: string;
  E_WEBSITE: string;
  E_PREMIUM: string;
  E_ALLCATEGORIES: string;
}

export interface Features {
  PLAY_COMMAND_ENGINE: string[];
  SEARCH_COMMAND_ENGINE: string[];
  SEARCH_TIMEOUT: number;
  AUTO_RESUME: boolean;
  DELETE_MSG_TIMEOUT: number;
  LIMIT_TRACK: number;
  LIMIT_PLAYLIST: number;
  AUTOCOMPLETE_SEARCH: string[];
  REPLACE_LINK: boolean;
  AUTOPLAY_SUPPORT: boolean;
  CONVERT_LINK: CONVERT_LINK;
  YOUTUBE_LINK: boolean;
  YOUTUBE_MUSIC_LINK: boolean;
  HIDE_LINK: boolean;
  LEAVE_TIMEOUT: number;
  DATABASE: Database;
  MESSAGE_CONTENT: MessageContent;
  AUTOFIX_LAVALINK: AutofixLavalink;
  MAX_QUEUE: number;
  RestAPI: RestAPI;
  WebServer: WebServer;
  FilterMenu: boolean;
  ButtonLabel: boolean;
  MusicCard: MusicCard;
}

export interface MusicCard {
  Enable: boolean;
  Themes: string;
}

export interface AutofixLavalink {
  enable: boolean;
  retryCount: number;
  retryTimeout: number;
  defaultSearchEngine: string;
}

export interface Database {
  driver: string;
  config: any;
  ClearCache: string;
  MYSQLBACKUP: MysqlBackup;
}

export interface MysqlBackup {
  Enable: boolean;
  Schedule: string;
  Timezone: string;
  ChannelId: string;
}

export interface MessageContent {
  enable: boolean;
  commands: Commands;
}

export interface Commands {
  enable: boolean;
  prefix: string;
}

export interface RestAPI {
  enable: boolean;
  port: number;
  auth: string;
  whitelist: string[];
  SessionSecret: string;
  DiscordClientId: string;
  DiscordClientSecret: string;
  DiscordRedirectUri: string;
  DashboardUrl: string;
}

export interface WebServer {
  enable: boolean;
  Port: number;
  BaseUrl: string;
  TOPGG_VOTELOGS: TOPGG_VOTELOGS;
  LAST_FM_SCROBBLED: LAST_FM_SCROBBLED;
}

export interface TOPGG_VOTELOGS {
  Enable: boolean;
  TopGgAuth: string;
  TopGgWebhookSecret: string;
  TopGgToken: string;
  LogVoteChannelID: string;
  WebhookURL: string;
}

export interface LAST_FM_SCROBBLED {
  Enable: boolean;
  ApiKey: string;
  Secret: string;
  Callback: string;
  scheduleScrobble: number;
  ExpiredLink: number;
  RedirectOnSuccess: string;
  RedirectOnError: string;
}

export interface LAST_FM {
  Enable: boolean;
  ApiKey: string;
  Secret: string;
  Callback: string;
  RedirectOnSuccess: string;
  RedirectOnError: string;
  scheduleScrobble: number;
  ExpiredLink: number;
}

export interface Lavalink {
  APPLE_TOKEN: string;
  SPOTIFY: Spotify;
  NP_REALTIME: boolean;
  NODES: MewslinkNodeOptions[];
}

export interface Spotify {
  enable: boolean;
  id: string;
  secret: string;
  clients?: { id: string; secret: string }[];
}

export interface CONVERT_LINK {
  Enable: boolean;
  Engine: string;
}

export interface Emojis {
  PLAYER: PlayerEmojis;
  GLOBAL: GlobalEmojis;
}

export interface PlayerEmojis {
  PLAY: string;
  PAUSE: string;
  LOOP: string;
  SHUFFLE: string;
  STOP: string;
  SKIP: string;
  PREVIOUS: string;
  VOLDOWN: string;
  VOLUP: string;
  QUEUE: string;
  AUTOPLAY: string;
}

export interface GlobalEmojis {
  ARROW_NEXT: string;
  ARROW_PREVIOUS: string;
  LOADING: string;
  DOT: string;
  BLANK: string;
}

export interface WELCOMER_EVENTS {
  Enable: string;
  WELCOMER_GUILD_ID: string;
  LEAVE_CHANNEL_ID: string;
  WELCOME_CHANNEL_ID: string;
  GREETINGS: GREETINGS;
  SUBTITLE: string;
  COLOR_GREETINGS: string;
  COLOR_USERNAME: string;
  COLOR_SUBTITLE: string;
}

export interface GREETINGS {
  welcome: string[];
  bye: string[];
}

export interface IMAGES_WELCOMER {
  IMAGES1: string;
  IMAGES2: string;
  IMAGES3: string;
  IMAGES4: string;
  IMAGES5: string;
  IMAGES6: string;
  IMAGES7: string;
  IMAGES8: string;
  IMAGES9: string;
  IMAGES10: string;
  IMAGES11: string;
  IMAGES12: string;
  IMAGES13: string;
  IMAGES14: string;
  IMAGES15: string;
  IMAGES16: string;
  IMAGES17: string;
  IMAGES18: string;
  IMAGES19: string;
  IMAGES20: string;
  IMAGES21: string;
  IMAGES22: string;
  IMAGES23: string;
  IMAGES24: string;
  IMAGES25: string;
  IMAGES26: string;
  IMAGES27: string;
  IMAGES28: string;
}

export interface DefaultSourceDashboard {
  soundcloud: string[];
  apple_music: string[];
  spotify: string[];
  youtube: string[];
  youtube_music: string[];
  deezer: string[];
  tidal: string[];
  [key: string]: string[];
}

export interface DASHBOARD_ACCESS {
  Filters: string[];
  TwentyFourSeven: string[];
  Autoplay: string[];
  LastFm: string[];
  SongRequest: string[];
  Language: string[];
  StatusVoiceChannel: string[];
  Prefix: string[];
  DjRole: string[];
  ControlButton: string[];
  Playlist: string[];
  AiChat?: string[];
}

export interface COMMANDS_ACCESS {
  INFO: INFO;
  FILTER: FILTER;
  MUSIC: MUSIC;
  PLAYLIST: PLAYLIST;
  SETTINGS: SETTINGS;
  GAMES: GAMES;
}

export interface GAMES {
  TwoZeroFourEight: string[];
  Connect4: string[];
  FindEmoji: string[];
  Flood: string[];
  GameStats: string[];
  Hangman: string[];
  MatchPairs: string[];
  Minesweeper: string[];
  TicTacToe: string[];
  Trivia: string[];
  Wordle: string[];
  WouldYouRather: string[];
}

export interface FILTER {
  ThreeD: string[];
  Bass: string[];
  Bassboost: string[];
  China: string[];
  Chipmunk: string[];
  Darthvader: string[];
  Daycore: string[];
  Doubletime: string[];
  Earrape: string[];
  Electronic: string[];
  Equalizer: string[];
  Karaoke: string[];
  Nightcore: string[];
  Party: string[];
  Pitch: string[];
  Pop: string[];
  Rate: string[];
  Reset: string[];
  Slowmotion: string[];
  Soft: string[];
  Speed: string[];
  Superbass: string[];
  Television: string[];
  Treblebass: string[];
  Tremolo: string[];
  Vaporwave: string[];
  Vibrate: string[];
  Vibrato: string[];
}

export interface INFO {
  About: string[];
  Disclaimers: string[];
  Help: string[];
  Info: string[];
  Invite: string[];
  Lavalink: string[];
  Metadata: string[];
  Ping: string[];
  PremiumCheck: string[];
  PrivacyPolicy: string[];
  Rating: string[];
  Report: string[];
  Suggestions: string[];
  StatisticUser: string[];
  TermsOfServices: string[];
  MyStats: string[];
  TopStats: string[];
}

export interface MUSIC {
  AppleSource: string[];
  DeezerSource: string[];
  Autoplay: string[];
  ClearQueue: string[];
  ForceJoin: string[];
  Forward: string[];
  Join: string[];
  Loop: string[];
  Lyrics: string[];
  NowPlaying: string[];
  Pause: string[];
  Play: string[];
  PlayNext: string[];
  Previous: string[];
  Queue: string[];
  Radio: string[];
  Remove: string[];
  Replay: string[];
  Resume: string[];
  Rewind: string[];
  Search: string[];
  Seek: string[];
  Shuffle: string[];
  Skip: string[];
  SkipTo: string[];
  SoundcloudSource: string[];
  SpotifyPlaylist: string[];
  SpotifySource: string[];
  TidalMusicSource: string[];
  Stop: string[];
  Volume: string[];
}

export interface PLAYLIST {
  Add: string[];
  All: string[];
  Create: string[];
  Delete: string[];
  Detail: string[];
  Editor: string[];
  Import: string[];
  Info: string[];
  Remove: string[];
  SaveQueue: string[];
}

export interface SETTINGS {
  TwentyFourSeven: string[];
  ControlMode: string[];
  Language: string[];
  LastFm: string[];
  McSetup: string[];
  DjRole: string[];
  Prefix: string[];
  Setup: string[];
  Spotify: string[];
  SpotifyDisconnect: string[];
  TempVoiceChannel: string[];
  Themes: string[];
  NotifyTwitch: string[];
  NotifyYoutube: string[];
  StatusVoiceChannel: string[];
  PremiumClaim: string[];
  PremiumUnClaim: string[];
}
