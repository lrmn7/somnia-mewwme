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
import { PlayerButton } from "../@types/Button.js";
import { Manager } from "../manager.js";
import { ReplyInteractionService } from "../services/ReplyInteractionService.js";
import { MewslinkPlayer } from "../mewslink/main.js";
import { Config } from "../@types/Config.js";
import { ConfigDataService } from "../services/ConfigDataService.js";
import { PlayerControlService } from "../services/PlayerControlService.js";
import { DjRoleService } from "../services/DjRoleService.js";
const data: Config = new ConfigDataService().data;
export default class implements PlayerButton {
  name = "voldown";
  accessableby = data.COMMANDS_ACCESS.MUSIC.Volume[0];
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

    if (!player) {
      collector.stop();
    }

    const reply_msg = `${client.i18n.get(language, "button.player.music", "voldown_msg", {
      volume: `${player.volume - 10}`,
      user: String(message.user?.displayName || message.user?.tag),
      botname: client.user!.username || client.user!.displayName,
    })}`;

    if (player.volume <= 0.1) {
      new ReplyInteractionService(
        client,
        message,
        `${client.i18n.get(language, "button.player.music", "volume_min", {
          user: String(message.user?.displayName || message.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );
      return;
    }

    player.setVolume(player.volume - 10);

    client.wsl.get(message.guild!.id)?.send({
      op: "playerVolume",
      guild: message.guild!.id,
      volume: player.volume,
    });

    new ReplyInteractionService(client, message, reply_msg);
    return;
  }
}
