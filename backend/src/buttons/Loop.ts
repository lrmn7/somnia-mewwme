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
import { MewslinkLoopMode, MewslinkPlayer, MewslinkTrack } from "../mewslink/main.js";
import { Config } from "../@types/Config.js";
import { ConfigDataService } from "../services/ConfigDataService.js";
import { PlayerControlService } from "../services/PlayerControlService.js";
import { DjRoleService } from "../services/DjRoleService.js";
const data: Config = new ConfigDataService().data;
import axios from "axios";
export default class implements PlayerButton {
  name = "loop";
  accessableby = data.COMMANDS_ACCESS.MUSIC.Loop[0];
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

    async function setLoop247(loop: string) {
      if (await client.db.autoreconnect.get(player.guildId)) {
        await client.db.autoreconnect.set(`${player.guildId}.config.loop`, loop);
      }
    }
    const currentTrack = player.queue.current;
    switch (player.loop) {
      case "none":
        player.setLoop(MewslinkLoopMode.SONG);

        if (client.config.features.AUTO_RESUME) setLoop247(MewslinkLoopMode.SONG);

        new ReplyInteractionService(
          client,
          message,
          `${client.i18n.get(language, "button.player.music", "loop_current", {
            user: String(message.user?.displayName || message.user?.tag),
            botname: client.user!.username || client.user!.displayName,
            title: currentTrack ? this.getTitle(client, currentTrack) : "Unknown",
          })}`
        );

        client.wsl.get(message.guild!.id)?.send({
          op: "playerLoop",
          guild: message.guild!.id,
          mode: "song",
        });

        break;

      case "song":
        player.setLoop(MewslinkLoopMode.QUEUE);

        if (client.config.features.AUTO_RESUME) setLoop247(MewslinkLoopMode.QUEUE);

        new ReplyInteractionService(
          client,
          message,
          `${client.i18n.get(language, "button.player.music", "loop_all", {
            user: String(message.user?.displayName || message.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        );

        client.wsl.get(message.guild!.id)?.send({
          op: "playerLoop",
          guild: message.guild!.id,
          mode: "queue",
        });

        break;

      case "queue":
        player.setLoop(MewslinkLoopMode.NONE);

        if (client.config.features.AUTO_RESUME) setLoop247(MewslinkLoopMode.NONE);

        new ReplyInteractionService(
          client,
          message,
          `${client.i18n.get(language, "button.player.music", "unloop_all", {
            user: String(message.user?.displayName || message.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        );

        client.wsl.get(message.guild!.id)?.send({
          op: "playerLoop",
          guild: message.guild!.id,
          mode: "none",
        });

        break;
    }
  }

  getTitle(client: Manager, tracks: MewslinkTrack): string {
    const truncate = (str: string, maxLength: number): string =>
      str.length > maxLength ? str.substring(0, maxLength - 3) + "..." : str;
    const title = truncate(tracks.title, 25);
    const author = truncate(tracks.author, 15);
    const supportUrl = client.config.bot.SERVER_SUPPORT_URL;

    if (client.config.features.HIDE_LINK) {
      return `\`${title}\` by \`${author}\``;
    } else if (client.config.features.REPLACE_LINK) {
      return `[\`${title}\`](${supportUrl}) by \`${author}\``;
    } else {
      return `[\`${title}\`](${tracks.uri || supportUrl}) by \`${author}\``;
    }
  }
}
