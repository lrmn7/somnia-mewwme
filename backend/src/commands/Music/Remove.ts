import { ApplicationCommandOptionType, Message } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { ConvertTime } from "../../utilities/ConvertTime.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["remove"];
  public description = "Remove song from queue";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Remove;
  public usage = "<position>";
  public aliases = ["rm"];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [
    {
      name: "position",
      description: "The position in queue want to remove.",
      type: ApplicationCommandOptionType.Integer,
      required: true,
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

    const tracks = handler.args[0];
    if (tracks && isNaN(+tracks))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "removetrack_number_invalid", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    if (Number(tracks) == 0)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "removetrack_already", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    if (Number(tracks) > player.queue.length)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "removetrack_notfound", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const song = player.queue[Number(tracks) - 1];

    player.queue.splice(Number(tracks) - 1, 1);

    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.music", "removetrack_desc", {
          title: this.getTitle(client, song),
          duration: new ConvertTime().parse(player.position),
          request: String(song.requester),
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`
      )
      .setColor(client.color_main);

    client.wsl.get(handler.guild!.id)?.send({
      op: "playerQueueRemove",
      guild: handler.guild!.id,
      track: {
        title: song.title,
        uri: song.uri,
        length: song.duration,
        thumbnail: song.artworkUrl,
        author: song.author,
        requester: song.requester
          ? {
              id: (song.requester as any).id,
              username: (song.requester as any).username,
              globalName: (song.requester as any).globalName,
              defaultAvatarURL: (song.requester as any).defaultAvatarURL ?? null,
            }
          : null,
      },
      index: Number(tracks) - 1,
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
}
