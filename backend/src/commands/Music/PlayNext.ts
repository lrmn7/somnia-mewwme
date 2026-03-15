import {
  ApplicationCommandOptionType,
  AutocompleteInteraction,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { ConvertTime } from "../../utilities/ConvertTime.js";
import { AutocompleteInteractionChoices, GlobalInteraction } from "../../@types/Interaction.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["playnext"];
  public description = "Add the song to play next in queue";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.PlayNext;
  public usage = "";
  public aliases = [];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
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

    const player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;
    const currentTrack = player.queue.current;

    if (!currentTrack) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "no_songs_playing", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    const song = handler.args.join(" ");
    if (!song || song.length === 0)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "playnext_notfound", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const isYouTubeLink = (value: string): boolean => {
      const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube|youtu)\.(?:com|be)\/(?:[^ ]+)/i;
      return youtubeRegex.test(value);
    };
    if (isYouTubeLink(song) && !client.config.features.YOUTUBE_LINK) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "youtube_disabled", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
                serversupport: client.config.bot.SERVER_SUPPORT_URL,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    const engines = client.config.features.PLAY_COMMAND_ENGINE;
    const randomEngine = engines[Math.floor(Math.random() * engines.length)];

    const result = await player.search(song, {
      engine: randomEngine,
      requester: handler.user,
    });
    const track = result.tracks[0];

    if (!result.tracks.length)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "playnext_notfound", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (player.queue.length === 0) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "playnext_queue_empty", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    player.queue.unshift(track);

    const embed = new EmbedBuilder();
    embed.setDescription(
      `${client.i18n.get(handler.language, "commands.music", "playnext_desc", {
        name: this.getTitle(client, track),
        duration: new ConvertTime().parse(player.position),
        request: String(track.requester),
        user: handler.user!.displayName || handler.user!.tag,
      })}`
    );
    if (track?.uri && track.uri.includes("soundcloud")) {
      embed.setThumbnail(client.user?.displayAvatarURL({ size: 512 }));
    } else if (track?.artworkUrl) {
      embed.setThumbnail(track?.artworkUrl);
    }
    embed.setColor(client.color_second);

    client.wsl.get(handler.guild!.id)?.send({
      op: "playerQueueInsert",
      guild: handler.guild!.id,
      track: {
        title: track.title,
        uri: track.uri,
        length: track.duration,
        thumbnail: track.artworkUrl,
        author: track.author,
        requester: track.requester
          ? {
              id: (track.requester as any).id,
              username: (track.requester as any).username,
              globalName: (track.requester as any).globalName,
              defaultAvatarURL: (track.requester as any).defaultAvatarURL ?? null,
            }
          : null,
      },
      index: 0,
    });

    return handler.editReply({ embeds: [embed] });
  }

  getTitle(client: Manager, tracks: MewslinkTrack): string {
    const title = truncateString(tracks.title, 25);
    const author = truncateString(tracks.author, 15);
    const supportUrl = client.config.bot.SERVER_SUPPORT_URL;

    if (new FormatDuration().parse(tracks.duration) === "Live Stream") {
      return `${author}`;
    }

    if (client.config.features.HIDE_LINK) {
      return `\`${title}\` by \`${author}\``;
    } else if (client.config.features.REPLACE_LINK) {
      return `[\`${title}\`](${supportUrl}) by \`${author}\``;
    } else {
      return `[\`${title}\`](${tracks.uri || supportUrl}) by \`${author}\``;
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
