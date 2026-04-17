import {
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { ConvertTime } from "../../utilities/ConvertTime.js";
import { Manager } from "../../manager.js";
import { computeWeb3Quota } from "../../web/route/web3Premium.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { AutocompleteInteractionChoices, GlobalInteraction } from "../../@types/Interaction.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkSearchResultType, MewslinkTrack } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["play"];
  public description = "Play a song from any types";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Play;
  public usage = "<name_or_url>";
  public aliases = ["p", "pl", "pp"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "search",
      description: "The song link or name",
      type: ApplicationCommandOptionType.String,
      required: true,
      autocomplete: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    /////////////////////////////// Check Premium Role start ////////////////////////////////
    const PremiumGuildID = client.config.PremiumRole.GuildID;
    const PremiumRoleID = client.config.PremiumRole.RoleID;
    const isPremiumRoleEnabled = client.config.PremiumRole.Enable !== false;
    const supportGuild = isPremiumRoleEnabled
      ? await client.guilds.fetch(PremiumGuildID).catch(() => null)
      : null;
    const supportMember = supportGuild
      ? await supportGuild.members.fetch(String(handler.user?.id)).catch(() => null)
      : null;
    const isPremiumRole = supportMember ? supportMember.roles.cache.has(PremiumRoleID) : false;
    /////////////////////////////// Check Premium Role end ////////////////////////////////
    const User = await client.db.PremiumUserLegacy.get(handler.user.id);
    const Guild = await client.db.PremiumGuildLegacy.get(String(handler.guild?.id));
    const isPremiumUserCode = User && User.isPremium;
    const isPremiumGuildCode = Guild && Guild.isPremium;
    const isOwner = handler.user.id == client.owner;
    const isAdmin = client.config.bot.ADMIN.includes(handler.user.id);

    const isPremiumWeb3User = (await computeWeb3Quota(client, handler.user.id)) > 0;

    let isPremiumWeb3Guild = false;
    if (handler.guild?.id) {
      const allWeb3 = await client.db.Web3Premium.all();
      const sponsorWeb3 = allWeb3.find((entry: any) => {
        const data = entry.data || entry.value || entry;
        return (
          data.redeemedGuilds &&
          Array.isArray(data.redeemedGuilds) &&
          data.redeemedGuilds.includes(handler.guild?.id) &&
          data.expiresAt > Date.now()
        );
      });
      if (sponsorWeb3) isPremiumWeb3Guild = true;
    }
    const userPerm = {
      owner: isOwner,
      admin: isOwner || isAdmin,
      PremiumRole: isOwner || isAdmin || isPremiumRole,
      PremiumUserCode: isOwner || isAdmin || isPremiumUserCode,
      PremiumGuildCode: isOwner || isAdmin || isPremiumGuildCode,
      PremiumWeb3User: isOwner || isAdmin || isPremiumWeb3User,
      PremiumWeb3Guild: isOwner || isAdmin || isPremiumWeb3Guild,
      Premium:
        isOwner ||
        isAdmin ||
        isPremiumUserCode ||
        isPremiumGuildCode ||
        isPremiumRole ||
        isPremiumWeb3User ||
        isPremiumWeb3Guild,
    };

    let player = client.mewslink.players.get(handler.guild!.id);

    const value = handler.args.join(" ");

    if (!value)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_arg", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const { channel } = handler.member!.voice;
    if (!channel)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_no_in_voice", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const emotes = (str: string) => str.match(/<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu);

    if (emotes(value) !== null)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_emoji", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
                serversupport: client.config.bot.SERVER_SUPPORT_URL,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const isYouTubeMusicLink = (value: string): boolean => {
      const musicRegex = /(?:https?:\/\/)?music\.youtube\.com\/(?:[^ ]+)/i;
      return musicRegex.test(value);
    };

    const isStandardYouTubeLink = (value: string): boolean => {
      const standardRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube|youtu)\.(?:com|be)\/(?:[^ ]+)/i;
      return standardRegex.test(value) && !isYouTubeMusicLink(value);
    };

    if (isYouTubeMusicLink(value) && !client.config.features.YOUTUBE_MUSIC_LINK) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "youtube_disabled", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
                serversupport: String(client.config.bot.SERVER_SUPPORT_URL),
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    if (isStandardYouTubeLink(value) && !client.config.features.YOUTUBE_LINK) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "youtube_disabled", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
                serversupport: String(client.config.bot.SERVER_SUPPORT_URL),
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    if (!player)
      player = await client.mewslink.create({
        guildId: handler.guild!.id,
        voiceId: handler.member!.voice.channel!.id,
        textId: handler.channel!.id,
        shardId: handler.guild?.shardId ?? 0,
        deaf: true,
        mute: false,
        region: handler.member!.voice.channel!.rtcRegion ?? null,
        nodeName: (await client.mewslink.nodes.getLeastUsed()).options.name,
        volume: client.config.bot.DEFAULT_VOLUME ?? 50,
      });
    else if (player && !this.checkSameVoice(client, handler, handler.language)) {
      return;
    }

    player.textId = handler.channel!.id;

    const engines = client.config.features.PLAY_COMMAND_ENGINE;
    const randomEngine = engines[Math.floor(Math.random() * engines.length)];

    const result = await player.search(value, {
      engine: randomEngine,
      requester: handler.user,
    });
    const tracks = result.tracks;

    if (handler.message) await handler.message.delete().catch(() => null);

    if (!result.tracks.length)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_match", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (player.queue.length >= client.config.features.MAX_QUEUE && !userPerm.Premium)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_queue_max", {
                limitqueue: String(client.config.features.MAX_QUEUE),
                premium: client.config.bot.PREMIUM_URL,
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (
      result.type === "PLAYLIST" &&
      tracks.length > client.config.features.MAX_QUEUE &&
      !userPerm.Premium
    )
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_playlist_max", {
                limitqueue: String(client.config.features.MAX_QUEUE),
                premium: client.config.bot.PREMIUM_URL,
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (result.type === "PLAYLIST") for (let track of tracks) player.queue.add(track);
    else if (player.playing && result.type === "SEARCH") player.queue.add(tracks[0]);
    else if (player.playing && result.type !== "SEARCH")
      for (let track of tracks) player.queue.add(track);
    else player.queue.add(tracks[0]);

    // Clear dashboard playback flag so Discord-initiated tracks show embeds
    player.data.set("dashboardPlayback", false);

    const TotalDuration = player.queue.duration;

    const embed = new EmbedBuilder().setColor(client.color_second);
    if (tracks[0]?.uri && tracks[0].uri.includes("soundcloud")) {
      embed.setThumbnail(client.user?.displayAvatarURL({ size: 512 }));
    } else if (tracks[0]?.artworkUrl) {
      embed.setThumbnail(tracks[0].artworkUrl);
    }

    if (result.type === "TRACK") {
      embed.setDescription(
        `${client.i18n.get(handler.language, "commands.music", "play_track", {
          title: this.getTitle(client, result.type, tracks),
          duration: new ConvertTime().parse(tracks[0].duration as number),
          request: String(tracks[0].requester),
          serversupport: String(client.config.bot.SERVER_SUPPORT_URL),
          author: tracks[0]?.author || handler.guild!.name,
          url: String(tracks[0].uri || client.config.bot.SERVER_SUPPORT_URL),
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`
      );

      handler.editReply({ content: " ", embeds: [embed] });
      if (!player.playing) player.play();
    } else if (result.type === "PLAYLIST") {
      embed.setDescription(
        `${client.i18n.get(handler.language, "commands.music", "play_playlist", {
          title: this.getTitle(client, result.type, tracks, value),
          duration: new ConvertTime().parse(TotalDuration),
          songs: String(tracks.length),
          request: String(tracks[0].requester),
          serversupport: String(client.config.bot.SERVER_SUPPORT_URL),
          author: tracks[0]?.author || handler.guild!.name,
          url: String(tracks[0].uri || client.config.bot.SERVER_SUPPORT_URL),
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`
      );

      handler.editReply({ content: " ", embeds: [embed] });
      if (!player.playing) player.play();
    } else if (result.type === "SEARCH") {
      embed.setDescription(
        `${client.i18n.get(handler.language, "commands.music", "play_result", {
          title: this.getTitle(client, result.type, tracks),
          duration: new ConvertTime().parse(tracks[0].duration as number),
          request: String(tracks[0].requester),
          serversupport: String(client.config.bot.SERVER_SUPPORT_URL),
          author: tracks[0]?.author || handler.guild!.name,
          url: String(tracks[0].uri || client.config.bot.SERVER_SUPPORT_URL),
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`
      );

      handler.editReply({ content: " ", embeds: [embed] });
      if (!player.playing) player.play();
    }
  }

  checkSameVoice(client: Manager, handler: CommandHandler, language: string) {
    if (handler.member!.voice.channel !== handler.guild!.members.me!.voice.channel) {
      handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_no_same_voice", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
      return false;
    }

    return true;
  }

  getTitle(
    client: Manager,
    type: MewslinkSearchResultType,
    tracks: MewslinkTrack[],
    value?: string
  ): string {
    const title = truncateString(tracks[0].title, 25);
    const author = truncateString(tracks[0].author, 15);
    const supportUrl = client.config.bot.SERVER_SUPPORT_URL;

    if (client.config.features.HIDE_LINK) {
      if (type === "PLAYLIST") {
        return "`PLAYLIST`";
      }
      return `\`${title}\` by \`${author}\``;
    } else if (client.config.features.REPLACE_LINK) {
      if (type === "PLAYLIST") {
        return `[PLAYLIST](${supportUrl})`;
      } else {
        return `[\`${title}\`](${supportUrl}) by \`${author}\``;
      }
    } else {
      if (type === "PLAYLIST") {
        return `[PLAYLIST](${value})`;
      } else {
        return `[\`${title}\`](${tracks[0].uri}) by \`${author}\``;
      }
    }
  }

  // Autocomplete function
  async autocomplete(client: Manager, interaction: GlobalInteraction, language: string) {
    let choice: AutocompleteInteractionChoices[] = [];
    // @ts-ignore
    const url = String((interaction as CommandInteraction).options.get("search")!.value);

    const Random =
      client.config.features.AUTOCOMPLETE_SEARCH[
        Math.floor(Math.random() * client.config.features.AUTOCOMPLETE_SEARCH.length)
      ];

    const match = client.REGEX.some((match) => {
      return match.test(url) == true;
    });

    if (match == true) {
      choice.push({ name: url, value: url });
      await (interaction as AutocompleteInteraction).respond(choice).catch(() => {});
      return;
    }

    if (client.lavalinkUsing.length == 0) {
      choice.push({
        name: `${client.i18n.get(language, "commands.music", "no_node")}`,
        value: `${client.i18n.get(language, "commands.music", "no_node")}`,
      });
      return;
    }
    const engines = client.config.features.PLAY_COMMAND_ENGINE;
    const randomEngine = engines[Math.floor(Math.random() * engines.length)];
    const searchRes = await client.mewslink.search(url || Random, {
      engine: randomEngine,
    });

    if (searchRes.tracks.length == 0 || !searchRes.tracks) {
      return choice.push({ name: "Error song not matches", value: url });
    }

    for (let i = 0; i < 10; i++) {
      const x = searchRes.tracks[i];
      choice.push({
        name: x && x.title ? x.title : "Unknown track name",
        value: x && x.uri ? x.uri : url,
      });
    }

    await (interaction as AutocompleteInteraction).respond(choice).catch(() => {});
  }
}
