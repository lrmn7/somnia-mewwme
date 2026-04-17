import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  ComponentType,
  ApplicationCommandOptionType,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { Manager } from "../../manager.js";
import { computeWeb3Quota } from "../../web/route/web3Premium.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

let isCollectorActive = false;

export default class implements Command {
  public name = ["search"];
  public description = "Search for songs";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Search;
  public usage = "<artist or song name>";
  public aliases = [];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "query",
      description: "Please enter the artist name or song title",
      type: ApplicationCommandOptionType.String,
      required: true,
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

    if (isCollectorActive) {
      const responseEmbed = new EmbedBuilder()
        .setDescription(`${client.i18n.get(handler.language, "commands.music", "search_active")}`)
        .setColor(client.color_main);

      if (handler.interaction) {
        return handler.interaction.replied || handler.interaction.deferred
          ? handler.interaction.editReply({
              embeds: [responseEmbed],
            })
          : handler.interaction.reply({
              embeds: [responseEmbed],
              flags: MessageFlags.Ephemeral,
            });
      } else {
        return handler.editReply({
          embeds: [responseEmbed],
        });
      }
    }

    let player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;

    const query = handler.args.join(" ");
    if (!query)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_arg", {
                user: handler.user!.displayName || handler.user!.tag,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    if (handler.message) await handler.message.delete().catch(() => null);
    const { channel } = handler.member!.voice;
    if (!channel)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "interaction", "no_in_voice", {
                user: handler.user!.displayName || handler.user!.tag,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const emotes = (str: string) => str.match(/<a?:.+?:\d{18}>|\p{Extended_Pictographic}/gu);
    if (emotes(query) !== null)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_emoji", {
                user: handler.user!.displayName || handler.user!.tag,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const urlRegex = /^https?:\/\//;
    if (urlRegex.test(query)) {
      const isAdminOrOwner =
        handler.user?.id === client.owner ||
        client.config.bot.ADMIN.includes(handler.user?.id ?? "null");
      if (!isAdminOrOwner) {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.music", "url_no_allowed", {
                  user: handler.user!.displayName || handler.user!.tag,
                })}`
              )
              .setColor(client.color_main),
          ],
        });
      }
    }
    if (
      player &&
      player.queue &&
      player.queue.length >= client.config.features.MAX_QUEUE &&
      !userPerm.Premium
    ) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "play_queue_max", {
                limitqueue: String(client.config.features.MAX_QUEUE),
                premium: client.config.bot.PREMIUM_URL,
                user: handler.user!.displayName || handler.user!.tag,
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
        volume: client.config.bot.DEFAULT_VOLUME ?? 50,
      });
    else if (player && !this.checkSameVoice(client, handler, handler.language)) {
      return;
    }

    const engines = client.config.features.SEARCH_COMMAND_ENGINE;
    const randomEngine = engines[Math.floor(Math.random() * engines.length)];

    const searchResults = await player.search(query, {
      engine: randomEngine,
      requester: handler.user,
    });

    if (!searchResults.tracks.length) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "search_no_result", {
                username: client.user!.username,
                support: client.config.bot.SERVER_SUPPORT_URL,
                user: handler.user!.displayName || handler.user!.tag,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }
    const limitedResults = searchResults.tracks.slice(0, 15);
    const countSong = limitedResults.length;
    const options = limitedResults.map((song: MewslinkTrack, index: number) => {
      const truncatedTitle = song.title.length > 50 ? song.title.slice(0, 47) + "..." : song.title;
      const truncatedAuthor = song.author
        ? song.author.length > 50
          ? song.author.slice(0, 47) + "..."
          : song.author
        : "N/a";

      const source = song.source || "unknown";
      let src = client.config.SEARCH_COMMANDS_EMOJI.UNKNOWN; // Default to UNKNOWN if source is unknown
      if (source === "youtube") {
        src = client.config.SEARCH_COMMANDS_EMOJI.YOUTUBE;
      } else if (source === "spotify") {
        src = client.config.SEARCH_COMMANDS_EMOJI.SPOTIFY;
      } else if (source === "tidal") {
        src = client.config.SEARCH_COMMANDS_EMOJI.TIDAL;
      } else if (source === "soundcloud") {
        src = client.config.SEARCH_COMMANDS_EMOJI.SOUNDCLOUD;
      } else if (source === "deezer") {
        src = client.config.SEARCH_COMMANDS_EMOJI.DEEZER;
      } else if (source === "twitch") {
        src = client.config.SEARCH_COMMANDS_EMOJI.TWITCH;
      } else if (source === "apple") {
        src = client.config.SEARCH_COMMANDS_EMOJI.APPLE_MUSIC;
      } else if (source === "youtube_music") {
        src = client.config.SEARCH_COMMANDS_EMOJI.YOUTUBE_MUSIC;
      }

      return new StringSelectMenuOptionBuilder()
        .setLabel(`${truncatedTitle} by ${truncatedAuthor}`)
        .setValue(`${index.toString()}`)
        .setEmoji(src);
    });

    const row1 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("select_song")
        .setPlaceholder(client.i18n.get(handler.language, "commands.music", "search_placeholder"))
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options)
    );

    const EmbedHome = new EmbedBuilder()
      .setThumbnail(client.user!.displayAvatarURL())
      .setColor(client.color_second)
      .setDescription(
        `${client.i18n.get(handler.language, "commands.music", "search_desc", {
          username: client.user!.username,
          support: client.config.bot.SERVER_SUPPORT_URL,
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`
      )
      .setFooter({
        text: `${client.i18n.get(handler.language, "commands.music", "search_footer", {
          username: client.user!.username,
          countSong: String(countSong),
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`,
      });
    await handler.editReply({
      embeds: [EmbedHome],
      components: [row1],
    });

    isCollectorActive = true; // Set flag to true when collector starts
    let selectedSong: MewslinkTrack | null = null; // Variable to store the selected song

    const collector = (handler?.channel! as TextChannel).createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      filter: (message) => {
        if (
          message.guild!.members.me!.voice.channel &&
          message.guild!.members.me!.voice.channelId === message.member!.voice.channelId
        )
          return true;
        else {
          message.reply({
            content: `${client.i18n.get(handler.language, "interaction", "no_same_voice")}`,
            flags: MessageFlags.Ephemeral,
          });
          return false;
        }
      },
      time: client.config.features.SEARCH_TIMEOUT,
    });

    collector.on("collect", async (interaction: StringSelectMenuInteraction) => {
      const selectedIndex = parseInt(interaction.values[0]);
      selectedSong = limitedResults[selectedIndex];

      if (player) {
        player.queue.add(selectedSong);
        // Clear dashboard playback flag so Discord-initiated tracks show embeds
        player.data.set("dashboardPlayback", false);
        if (!player.playing) await player.play();

        const PlayTracksEmbed = new EmbedBuilder().setColor(client.color_second).setDescription(
          `${client.i18n.get(handler.language, "commands.music", "play_search_track", {
            title: selectedSong?.title
              ? (selectedSong.title.length > 15
                  ? selectedSong.title.substring(0, 15) + "..."
                  : selectedSong.title
                ).replace(/(?:https?|ftp):\/\/[\n\S]+/g, "Unknown")
              : "Unknown",
            author: selectedSong?.author || "Unknown",
            url: selectedSong?.uri || client.config.bot.SERVER_SUPPORT_URL,
            user: handler.user!.displayName || handler.user!.tag,
            search_author: `https://www.google.com/search?q=${encodeURIComponent(selectedSong?.author || selectedSong?.uri)}`,
            serversupport: client.config.bot.SERVER_SUPPORT_URL || "Unknown",
            botname: client.user!.username || client.user!.displayName,
          })}`
        );

        if (selectedSong?.uri && selectedSong?.uri.includes("soundcloud")) {
          PlayTracksEmbed.setThumbnail(client.user?.displayAvatarURL({ extension: "png" }));
        } else if (selectedSong?.artworkUrl) {
          PlayTracksEmbed.setThumbnail(selectedSong?.artworkUrl);
        }

        await interaction.update({
          embeds: [PlayTracksEmbed],
          components: [row1],
        });
      } else {
        await interaction.update({
          embeds: [
            new EmbedBuilder()
              .setDescription(`${client.i18n.get(handler.language, "interaction", "no_player")}`)
              .setColor(client.color_main),
          ],
          components: [],
        });
      }
    });

    collector.on("end", async (_, reason) => {
      isCollectorActive = false;
      row1.components[0].setDisabled(true);

      if (reason === "time" && selectedSong) {
        const embeded = new EmbedBuilder()
          .setDescription(
            `${client.i18n.get(handler.language, "commands.music", "search_end_desc1", {
              title: selectedSong?.title
                ? (selectedSong.title.length > 15
                    ? selectedSong.title.substring(0, 15) + "..."
                    : selectedSong.title
                  ).replace(/(?:https?|ftp):\/\/[\n\S]+/g, "Unknown")
                : "Unknown",
              author: selectedSong?.author || "Unknown",
              url: selectedSong?.uri || client.config.bot.SERVER_SUPPORT_URL,
              user: handler.user!.displayName || handler.user!.tag,
              search_author: `https://www.google.com/search?q=${encodeURIComponent(selectedSong?.author || selectedSong?.uri)}`,
              serversupport: client.config.bot.SERVER_SUPPORT_URL || "Unknown",
              botname: client.user!.username || client.user!.displayName,
            })}`
          )
          .setColor(client.color_second);

        if (selectedSong?.uri && selectedSong?.uri.includes("soundcloud")) {
          embeded.setThumbnail(client.user?.displayAvatarURL({ extension: "png" }));
        } else if (selectedSong?.artworkUrl) {
          embeded.setThumbnail(selectedSong.artworkUrl);
        }

        await handler.editReply({
          embeds: [embeded],
          components: [row1],
        });
      } else {
        await handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setThumbnail(client.user!.displayAvatarURL())
              .setColor(client.color_second)
              .setDescription(
                `${client.i18n.get(handler.language, "commands.music", "search_end_desc2", {
                  username: client.user!.username,
                  search_author: `https://www.google.com/search?q=${encodeURIComponent(selectedSong?.author || selectedSong?.uri)}`,
                  user: String(handler.user?.displayName || handler.user?.tag),
                  author: selectedSong?.author || "Unknown",
                  url: selectedSong?.uri || client.config.bot.SERVER_SUPPORT_URL,
                  support: client.config.bot.SERVER_SUPPORT_URL,
                  botname: client.user!.username || client.user!.displayName,
                })}`
              ),
          ],
          components: [row1],
        });
      }
    });
  }

  checkSameVoice(client: Manager, handler: CommandHandler, language: string) {
    if (handler.member!.voice.channel !== handler.guild!.members.me!.voice.channel) {
      handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "interaction", "no_same_voice", {
                user: handler.user!.displayName || handler.user!.tag,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
      return false;
    }

    return true;
  }
}
