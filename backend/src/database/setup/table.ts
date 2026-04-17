import { IDriver, QuickDB } from "mewwme.quick.db";
import { Manager } from "../../manager.js";
import { Handler } from "../handler.js";
// Schema
import { AutoReconnect } from "../schema/AutoReconnect.js";
import { Playlist } from "../schema/Playlist.js";
import { PremiumUserLegacy } from "../schema/PremiumUserLegacy.js";
import { Setup } from "../schema/Setup.js";
import { Language } from "../schema/Language.js";
import { Prefix } from "../schema/Prefix.js";
import { ControlButton } from "../schema/ControlButton.js";
import { QuickDatabasePlus } from "../../structures/QuickDatabasePlus.js";
import { PremiumGuildLegacy } from "../schema/PremiumGuildLegacy.js";
import { BlacklistUser } from "../schema/BlacklistUser.js";
import { BlacklistGuild } from "../schema/BlacklistGuild.js";
import { Maintenance } from "../schema/Maintenanc.js";
import { Themes } from "../schema/Themes.js";
import { Votes } from "../schema/Votes.js";
import { CommandGlobalUsage } from "../schema/CommandGlobalUsage.js";
import { CommandUserUsage } from "../schema/CommandUserUsage.js";
import { PlayedSongGuild } from "../schema/PlayedSongGuild.js";
import { PlayedSongUser } from "../schema/PlayedSongUser.js";
import { PlayedSongGlobal } from "../schema/PlayedSongGlobal.js";
import { LastFm } from "../schema/LastFm.js";
import { TicketSetup } from "../schema/TicketSetup.js";
import { VoteReminders } from "../schema/VoteReminders.js";
import { TopTrack } from "../schema/TopTrack.js";
import { TopArtist } from "../schema/TopArtist.js";
import { NotifyTwitch } from "../schema/NotifyTwitch.js";
import { NotifyYoutube } from "../schema/NotifyYoutube.js";
import { UserStatistics } from "../schema/UserStatistics.js";
import { TempVoiceChannel } from "../schema/TempVoiceChannel.js";
import { TempVoiceChannelSetting } from "../schema/TempVoiceChannelSetting.js";
import { GameStatistics } from "../schema/GameStatistics.js";
import { GameHistory } from "../schema/GameHistory.js";
import { StatusVoiceChannel } from "../schema/StatusVoiceChannel.js";
import { DjRole } from "../schema/DjRole.js";
import { LikedSongs } from "../schema/LikedSongs.js";
import { UserProfile } from "../schema/UserProfile.js";
import { GuildStats } from "../schema/GuildStats.js";
import { GuildTopTrack } from "../schema/GuildTopTrack.js";
import { GuildTopArtist } from "../schema/GuildTopArtist.js";
import { AutoplaySetting } from "../schema/AutoplaySetting.js";
import { GuildDefaultSource } from "../schema/GuildDefaultSource.js";
import { AiChatHistory } from "../schema/AiChatHistory.js";
import { HelpdeskDeploy } from "../schema/HelpdeskDeploy.js";
import { HelperDeploy } from "../schema/HelperDeploy.js";
import { WalletBinding } from "../schema/WalletBinding.js";
import { GuildContract } from "../schema/GuildContract.js";
import { TipCache } from "../schema/TipCache.js";
import { Web3Premium } from "../schema/Web3Premium.js";
import { Web3Subscription } from "../schema/Web3Subscription.js";

import chalk from "chalk";
export class TableSetup {
  client: Manager;
  driver: IDriver;
  driverName: string;
  constructor(client: Manager, driver: IDriver, driverName: string) {
    this.client = client;
    this.driver = driver;
    this.driver = driver;
    this.driverName = driverName;
    this.register();
  }

  async register() {
    const baseDB = new QuickDatabasePlus(this.client.config.features.DATABASE.ClearCache, {
      driver: this.driver,
    });
    const start = Date.now();
    await baseDB.init();
    const end = Date.now();
    this.client.logger.info(
      "DatabaseService",
      chalk.green(`Connected to the database! [${this.driverName}] [${end - start}ms]`)
    );

    this.client.db = {
      autoreconnect: await baseDB.table<AutoReconnect>("autoreconnect"),
      playlist: await baseDB.table<Playlist>("playlist"),
      PremiumUserLegacy: await baseDB.table<PremiumUserLegacy>("PremiumUserLegacy"),
      setup: await baseDB.table<Setup>("setup"),
      language: await baseDB.table<Language>("language"),
      prefix: await baseDB.table<Prefix>("prefix"),
      ControlButton: await baseDB.table<ControlButton>("ControlButton"),
      PremiumGuildLegacy: await baseDB.table<PremiumGuildLegacy>("PremiumGuildLegacy"),
      BlacklistUser: await baseDB.table<BlacklistUser>("BlacklistUser"),
      BlacklistGuild: await baseDB.table<BlacklistGuild>("BlacklistGuild"),
      maintenance: await baseDB.table<Maintenance>("maintenance"),
      Themes: await baseDB.table<Themes>("Themes"),
      votes: await baseDB.table<Votes>("votes"),
      CommandGlobalUsage: await baseDB.table<CommandGlobalUsage>("CommandGlobalUsage"),
      CommandUserUsage: await baseDB.table<CommandUserUsage>("CommandUserUsage"),
      PlayedSongGuild: await baseDB.table<PlayedSongGuild>("PlayedSongGuild"),
      PlayedSongUser: await baseDB.table<PlayedSongUser>("PlayedSongUser"),
      PlayedSongGlobal: await baseDB.table<PlayedSongGlobal>("PlayedSongGlobal"),
      LastFm: await baseDB.table<LastFm>("LastFm"),
      TicketSetup: await baseDB.table<TicketSetup>("TicketSetup"),
      VoteReminders: await baseDB.table<VoteReminders>("VoteReminders"),
      TopTrack: await baseDB.table<TopTrack>("TopTrack"),
      TopArtist: await baseDB.table<TopArtist>("TopArtist"),
      NotifyTwitch: await baseDB.table<NotifyTwitch>("NotifyTwitch"),
      NotifyYoutube: await baseDB.table<NotifyYoutube>("NotifyYoutube"),
      UserStatistics: await baseDB.table<UserStatistics>("UserStatistics"),
      TempVoiceChannel: await baseDB.table<TempVoiceChannel>("TempVoiceChannel"),
      TempVoiceChannelSetting:
        await baseDB.table<TempVoiceChannelSetting>("TempVoiceChannelSetting"),
      GameStatistics: await baseDB.table<GameStatistics>("GameStatistics"),
      GameHistory: await baseDB.table<GameHistory>("GameHistory"),
      StatusVoiceChannel: await baseDB.table<StatusVoiceChannel>("StatusVoiceChannel"),
      DjRole: await baseDB.table<DjRole>("DjRole"),
      LikedSongs: await baseDB.table<LikedSongs>("LikedSongs"),
      UserProfile: await baseDB.table<UserProfile>("UserProfile"),
      GuildStats: await baseDB.table<GuildStats>("GuildStats"),
      GuildTopTrack: await baseDB.table<GuildTopTrack>("GuildTopTrack"),
      GuildTopArtist: await baseDB.table<GuildTopArtist>("GuildTopArtist"),
      AutoplaySetting: await baseDB.table<AutoplaySetting>("AutoplaySetting"),
      GuildDefaultSource: await baseDB.table<GuildDefaultSource>("GuildDefaultSource"),
      AiChatHistory: await baseDB.table<AiChatHistory>("AiChatHistory"),
      HelpdeskDeploy: await baseDB.table<HelpdeskDeploy>("HelpdeskDeploy"),
      HelperDeploy: await baseDB.table<HelperDeploy>("HelperDeploy"),
      WalletBinding: await baseDB.table<WalletBinding>("WalletBinding"),
      GuildContract: await baseDB.table<GuildContract>("GuildContract"),
      TipCache: await baseDB.table<TipCache>("TipCache"),
      Web3Premium: await baseDB.table<Web3Premium>("Web3Premium"),
      Web3Subscriptions: await baseDB.table<Web3Subscription>("Web3Subscriptions"),
    };

    this.client.isDatabaseConnected = true;
    new Handler(this.client);
  }
}
