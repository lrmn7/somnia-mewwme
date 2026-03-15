import { ApplicationCommandOptionType, EmbedBuilder, User } from "discord.js";
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
  public name = ["skipto"];
  public description = "Skip to a specific position";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.SkipTo;
  public usage = "";
  public aliases = ["sk"];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [
    {
      name: "position",
      description: "The position of the song",
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();
    const player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;
    const currentTrack = player.queue.current;

    if (!currentTrack) {
      const skipped = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "no_songs_playing", {
            user: handler.user!.displayName || handler.user!.tag,
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      handler.editReply({ content: " ", embeds: [skipped] });
      return;
    }

    const getPosition = Number(handler.args[0]);

    if (!handler.args[0] || isNaN(getPosition) || getPosition < 0)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "skip_number_invalid", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (player.queue.size == 0 || getPosition >= player.queue.length) {
      const skipped = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "skip_notfound", {
            user: handler.user!.displayName || handler.user!.tag,
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      handler.editReply({ content: " ", embeds: [skipped] });
    } else {
      const cuttedQueue = player.queue.splice(0, getPosition);
      const nowCurrentTrack = cuttedQueue.splice(-1)[0];
      player.queue.previous.push(...cuttedQueue);
      player.queue.current ? player.queue.previous.unshift(player.queue.current) : true;
      await player.play(nowCurrentTrack);
      player.queue.shift();
      client.wsl.get(handler.guild!.id)?.send({
        op: "playerQueueSkip",
        guild: handler.guild!.id,
        queue: player.queue.map((track) => {
          const requesterQueue = track.requester as User;
          return {
            title: track.title,
            uri: track.uri,
            length: track.duration,
            thumbnail: track.artworkUrl,
            author: track.author,
            requester: requesterQueue
              ? {
                  id: requesterQueue.id,
                  username: requesterQueue.username,
                  globalName: requesterQueue.globalName,
                  defaultAvatarURL: requesterQueue.defaultAvatarURL ?? null,
                }
              : null,
          };
        }),
      });
      const skipped = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.music", "skip_msg", {
            user: handler.user!.displayName || handler.user!.tag,
            title: this.getTitle(client, currentTrack),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);
      handler.editReply({ content: " ", embeds: [skipped] });
    }
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
