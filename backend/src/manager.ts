import {
  Client,
  GatewayIntentBits,
  ColorResolvable,
  Message,
  ActionRowBuilder,
  ButtonBuilder,
  Collection,
  InteractionCollector,
  ButtonInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { WebServer } from "./web/WebServer.js";
import { DatabaseService } from "./database/index.js";
import { resolve } from "path";
import { LoggerService } from "./services/LoggerService.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { RestAPI } from "./web/RestAPI.js";
import { ManifestService } from "./services/ManifestService.js";
import { config } from "dotenv";
import { initHandler } from "./handlers/index.js";
import { DeployService } from "./services/DeployService.js";
import { MewslinkInit } from "./structures/Mewslink.js";
import { Config, Emojis } from "./@types/Config.js";
import { DatabaseTable } from "./database/@types.js";
import { LavalinkDataType, LavalinkUsingDataType } from "./@types/Lavalink.js";
import { Mewslink } from "./mewslink/Mewslink.js";
import { Command } from "./structures/Command.js";
import { PlayerButton } from "./@types/Button.js";
import { GlobalMsg } from "./structures/CommandHandler.js";
import { MewslinkPlayer } from "./mewslink/main.js";
import { TopggService } from "./services/TopggService.js";
import { AssistanceHandler } from "./@guild-helpers/AssistanceHandler.js";
import { StatisticsHandler } from "./@guild-helpers/StatisticsHandler.js";
import { Localization } from "./structures/Localization.js";
import { ClusterManager } from "./shard/ClusterManager.js";
import cluster, { Cluster } from "node:cluster";
import { ManifestInterface } from "./@types/Manifest.js";
import chalk from "chalk";
import NotifyTwitch from "./services/NotifyTwitch.js";
import NotifyYoutube from "./services/NotifyYoutube.js";
import MysqlBackupService from "./services/MysqlBackup.js";
import TempVoiceService from "./services/TempVoiceService.js";
import FilterMenuService from "./services/FilterMenuService.js";
config();

function getShard(clusterManager: ClusterManager) {
  const shardListData = clusterManager.getShard(cluster.worker.id);
  return {
    shards: shardListData,
    shardCount: clusterManager.totalShards,
  };
}

export class Manager extends Client {
  public cluster: { id: number | 0; data: Cluster | null };
  public manifest: ManifestInterface;
  public logger: LoggerService;
  public db!: DatabaseTable;
  public owner: string;
  public color_main: ColorResolvable;
  public color_second: ColorResolvable;
  public i18n: Localization;
  public prefix: string;
  public isDatabaseConnected: boolean;
  public lavalinkList: LavalinkDataType[];
  public lavalinkUsing: LavalinkUsingDataType[];
  public lavalinkUsed: LavalinkUsingDataType[];
  public mewslink: Mewslink;
  public commands: Collection<string, Command>;
  public interval: Collection<string, NodeJS.Timer>;
  public sentQueue: Collection<string, boolean>;
  public nplayingMsg: Collection<
    string,
    {
      coll: InteractionCollector<ButtonInteraction<"cached">>;
      msg: Message;
    }
  >;
  public aliases: Collection<string, string>;
  public plButton: Collection<string, PlayerButton>;
  public leaveDelay: Collection<string, NodeJS.Timeout>;
  public nowPlaying: Collection<string, { interval: NodeJS.Timeout; msg: GlobalMsg }>;
  public wsl: Collection<string, { send: (data: Record<string, unknown>) => void }>;
  public dashboardEmit?: (guildId: string, event: string, data: Record<string, unknown>) => void;
  public UpdateMusic!: (player: MewslinkPlayer) => Promise<void | Message<true>>;
  public UpdateQueueMsg!: (player: MewslinkPlayer) => Promise<void | Message<true>>;
  public enSwitch!: ActionRowBuilder<ButtonBuilder>;
  public diSwitch!: ActionRowBuilder<ButtonBuilder>;
  public enSwitchMod!: ActionRowBuilder<ButtonBuilder>;
  public topgg?: TopggService;
  public icons: Emojis;
  public REGEX: RegExp[];
  public selectMenuOptions: StringSelectMenuOptionBuilder[] = [];

  constructor(
    public config: Config,
    isMsgEnable: boolean,
    public clusterManager?: ClusterManager
  ) {
    super({
      shards: clusterManager ? getShard(clusterManager).shards : "auto",
      shardCount: clusterManager ? getShard(clusterManager).shardCount : 1,
      allowedMentions: {
        parse: ["roles", "users", "everyone"],
        repliedUser: false,
      },
      intents: isMsgEnable
        ? [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageTyping,
            GatewayIntentBits.GuildScheduledEvents,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildWebhooks,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.AutoModerationExecution,
          ]
        : [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildVoiceStates,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessageTyping,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.DirectMessageTyping,
            GatewayIntentBits.GuildScheduledEvents,
            GatewayIntentBits.GuildInvites,
            GatewayIntentBits.GuildWebhooks,
            GatewayIntentBits.GuildModeration,
            GatewayIntentBits.GuildMessageReactions,
            GatewayIntentBits.AutoModerationExecution,
          ],
    });

    // Initial basic bot config
    this.setMaxListeners(25);
    const __dirname = dirname(fileURLToPath(import.meta.url));
    this.cluster = {
      data: clusterManager ? cluster : null,
      id: clusterManager ? cluster.worker.id : 0,
    };
    this.logger = new LoggerService(this, this.cluster.id);
    this.manifest = new ManifestService().data;
    this.owner = this.config.bot.OWNER_ID;
    this.color_main = (this.config.bot.EMBED_COLOR_MAIN || "#f4e0c7") as ColorResolvable;
    this.color_second = (this.config.bot.EMBED_COLOR_SECOND || "#f4e0c7") as ColorResolvable;
    this.i18n = new Localization({
      defaultLocale: this.config.bot.LANGUAGE || "en",
      directory: resolve(join(__dirname, "languages")),
    });
    this.prefix = this.config.features.MESSAGE_CONTENT.commands.prefix || "me";
    this.REGEX = [
      /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*v=|v\/)))([-a-zA-Z0-9_]{11,})/,
      /^.*(youtu.be\/|list=)([^#\&\?]*).*/,
      /^(?:spotify:|https:\/\/[a-z]+\.spotify\.com\/(track\/|user\/(.*)\/playlist\/|playlist\/))(.*)$/,
      /^https?:\/\/(?:www\.)?deezer\.com\/[a-z]+\/(track|album|playlist)\/(\d+)$/,
      /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(soundcloud\.com|snd\.sc)\/(.*)$/,
      /(?:https:\/\/music\.apple\.com\/)(?:.+)?(artist|album|music-video|playlist)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)\/([\w\-\.]+(\/)+[\w\-\.]+|[^&]+)/,
      /^https?:\/\/(?:www\.|secure\.|sp\.)?nicovideo\.jp\/watch\/([a-z]{2}[0-9]+)/,
      /(?:https:\/\/spotify\.link)\/([A-Za-z0-9]+)/,
      /^https:\/\/deezer\.page\.link\/[a-zA-Z0-9]{12}$/,
      /https:\/\/music\.youtube\.com\/playlist\?list=([a-zA-Z0-9_-]{11})/,
      /^https?:\/\/(?:www\.)?tidal\.com\/(?:browse\/)?(track|album)\/(\d+)$/,
    ];
    this.lavalinkList = [];
    this.lavalinkUsing = [];
    this.lavalinkUsed = [];

    // Collections
    this.commands = new Collection<string, Command>();
    this.interval = new Collection<string, NodeJS.Timer>();
    this.sentQueue = new Collection<string, boolean>();
    this.aliases = new Collection<string, string>();
    this.nplayingMsg = new Collection<
      string,
      {
        coll: InteractionCollector<ButtonInteraction<"cached">>;
        msg: Message;
      }
    >();
    this.plButton = new Collection<string, PlayerButton>();
    this.leaveDelay = new Collection<string, NodeJS.Timeout>();
    this.nowPlaying = new Collection<string, { interval: NodeJS.Timeout; msg: GlobalMsg }>();
    this.wsl = new Collection<string, { send: (data: Record<string, unknown>) => void }>();
    this.isDatabaseConnected = false;

    // Icons setup
    this.icons = this.config.emojis;

    // Init mewslink
    this.mewslink = new MewslinkInit(this).init;

    // Initialize Temp Voice Manager
    const tempVoice = new TempVoiceService();

    // Handle voice state updates to manage temp voice channels
    this.on("voiceStateUpdate", (oldState, newState) =>
      tempVoice.handleVoiceStateUpdate(oldState, newState, this)
    );
  }

  protected configVolCheck(vol: number = this.config.bot.DEFAULT_VOLUME) {
    if (!vol || isNaN(vol) || vol > 100 || vol < 1) {
      this.config.bot.DEFAULT_VOLUME = 50;
      return false;
    }
    return true;
  }

  protected configSearchCheck(data: string[] = this.config.features.AUTOCOMPLETE_SEARCH) {
    const defaultSearch = ["feby putry", "biru baru", "mahalini", "ghea indrawari"];
    if (!data || data.length == 0) {
      this.config.features.AUTOCOMPLETE_SEARCH = defaultSearch;
      return false;
    }
    for (const element of data) {
      if (!this.stringCheck(element)) {
        this.config.features.AUTOCOMPLETE_SEARCH = defaultSearch;
        return false;
      }
    }
    return true;
  }

  protected stringCheck(data: unknown) {
    if (typeof data === "string" || data instanceof String) return true;
    return false;
  }

  public start() {
    this.logger.info("ClientManager", "Booting client Mewwme's...");
    this.logger.info("ClientManager", `Version: ${this.manifest.metadata.bot.version}`);
    this.logger.info("ClientManager", `Codename: ${this.manifest.metadata.bot.codename}`);
    this.logger.info("ClientManager", `Autofix Version: ${this.manifest.metadata.autofix.version}`);


    if (this.config.features.HIDE_LINK && this.config.features.REPLACE_LINK) {
      this.logger.warn(
        "ClientManager",
        chalk.bold.red(
          "You can only enable one feature: HIDE_LINK or REPLACE_LINK. Please disable one to proceed."
        )
      );
      return;
    }

    if (this.config.features.FilterMenu ?? false) {
      const FilterSelect = new FilterMenuService();
      FilterSelect.execute(this);
    }

    if (this.config.utilities.NotifyTwitch.Enable ?? false) {
      const Twitch = new NotifyTwitch();
      Twitch.execute(this);
    }

    if (this.config.utilities.NotifyYoutube.Enable ?? false) {
      const Youtube = new NotifyYoutube();
      Youtube.execute(this);
    }

    if (this.config.features.DATABASE.MYSQLBACKUP.Enable ?? false) {
      const mysqlbackup = new MysqlBackupService();
      mysqlbackup.execute(this);
    }

    if (this.config.features.RestAPI.enable ?? false) {
      new RestAPI(this);
    }
    if (this.config.features.WebServer.enable ?? false) {
      new WebServer(this);
    }
    new StatisticsHandler(this);
    new AssistanceHandler(this);
    new DeployService(this);
    new initHandler(this);
    new DatabaseService(this);
    super.login(this.config.bot.TOKEN);
  }
}
