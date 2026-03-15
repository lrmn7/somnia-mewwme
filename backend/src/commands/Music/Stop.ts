import { Manager } from "../../manager.js";
import { EmbedBuilder } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { FormatDuration } from "../../utilities/FormatDuration.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { truncateString } from "mstg-kit";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["stop"];
  public description = "Stop music and make the bot leave the voice channel";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Stop;
  public usage = "";
  public aliases = [];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

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

    const { channel } = handler.member!.voice;

    player.data.set("sudo-destroy", true);
    const is247 = await client.db.autoreconnect.get(`${handler.guild?.id}`);
    player.stop(is247 && is247.twentyfourseven ? false : true);

    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.music", "stop_msg", {
          channel: channel!.name,
          user: handler.user!.displayName || handler.user!.tag,
          title: this.getTitle(client, currentTrack),
          botname: client.user!.username || client.user!.displayName,
        })}`
      )
      .setColor(client.color_main);

    await handler.editReply({ content: " ", embeds: [embed] });
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
