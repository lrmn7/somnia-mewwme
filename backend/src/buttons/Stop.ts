import {
  ButtonInteraction,
  CacheType,
  InteractionCollector,
  Message,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { FormatDuration } from "../utilities/FormatDuration.js";
import { PlayerButton } from "../@types/Button.js";
import { Manager } from "../manager.js";
import { ReplyInteractionService } from "../services/ReplyInteractionService.js";
import { MewslinkPlayer, MewslinkTrack } from "../mewslink/main.js";
import { Config } from "../@types/Config.js";
import { ConfigDataService } from "../services/ConfigDataService.js";
import { PlayerControlService } from "../services/PlayerControlService.js";
import { DjRoleService } from "../services/DjRoleService.js";
const data: Config = new ConfigDataService().data;
export default class implements PlayerButton {
  name = "stop";
  accessableby = data.COMMANDS_ACCESS.MUSIC.Stop[0];
  async run(
    client: Manager,
    message: ButtonInteraction<CacheType>,
    language: string,
    player: MewslinkPlayer,
    nplaying: Message<boolean>,
    collector: InteractionCollector<ButtonInteraction<"cached">>
  ): Promise<any> {
    const hasPermission = await new PlayerControlService().check(
      client,
      message,
      language,
      this.accessableby
    );
    if (!hasPermission) return;

    // ========================DJ ROLE CHECK================================
    const isDjAuthorized = await new DjRoleService().check(client, message, language);
    if (!isDjAuthorized) return;

    collector.stop();
    const currentTrack = player.queue.current;
    player.data.set("sudo-destroy", true);
    const is247 = await client.db.autoreconnect.get(`${message.guildId}`);
    player.stop(is247 && is247.twentyfourseven ? false : true);

    new ReplyInteractionService(
      client,
      message,
      `${client.i18n.get(language, "button.player.music", "stop_msg", {
        user: String(message.user?.displayName || message.user?.tag),
        botname: client.user!.username || client.user!.displayName,
        title: currentTrack ? this.getTitle(client, currentTrack) : "Unknown",
      })}`
    );
  }

  getTitle(client: Manager, tracks: MewslinkTrack): string {
    const truncate = (str: string, maxLength: number): string =>
      str.length > maxLength ? str.substring(0, maxLength - 3) + "..." : str;
    const title = truncate(tracks.title, 25);
    const author = truncate(tracks.author, 15);
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
