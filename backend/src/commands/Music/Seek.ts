import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;
const time_regex = /(^[0-9][\d]{0,3}):(0[0-9]{1}$|[1-5]{1}[0-9])/;

export default class implements Command {
  public name = ["seek"];
  public description = "Seek timestamp in the song!";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Seek;
  public usage = "<time_format. Ex: 999:59>";
  public aliases = [];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [
    {
      name: "time",
      description: "Set the position of the playing track. Example: 0:10 or 120:10",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    let value;
    const time = handler.args[0];

    if (!time_regex.test(time))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "seek_invalid", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    else {
      const [m, s] = time.split(/:/);
      const min = Number(m) * 60;
      const sec = Number(s);
      value = min + sec;
    }

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

    if (value * 1000 >= player.queue.current!.duration! || value < 0)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "seek_beyond", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (!currentTrack || !currentTrack.isSeekable) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "seek_not_seekable", {
                user: handler.user!.displayName || handler.user!.tag,
                title: this.getTitle(client, currentTrack),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    await player.seek(value * 1000);

    const song_position = player.position;

    let final_res;

    if (song_position < value * 1000) final_res = song_position + value * 1000;
    else final_res = value * 1000;

    const Duration = new FormatDuration().parse(final_res);

    const seeked = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.music", "seek_msg", {
          duration: Duration,
          user: handler.user!.displayName || handler.user!.tag,
          title: this.getTitle(client, currentTrack),
          botname: client.user!.username || client.user!.displayName,
        })}`
      )
      .setColor(client.color_main);

    handler.editReply({ content: " ", embeds: [seeked] });
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
