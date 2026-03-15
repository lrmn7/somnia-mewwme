import {
  ButtonInteraction,
  CacheType,
  InteractionCollector,
  Message,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
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
  name = "autoplay";
  accessableby = data.COMMANDS_ACCESS.MUSIC.Autoplay[0];
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

    if (!client.config.features.AUTOPLAY_SUPPORT) {
      const AutoplayDisabledEmbed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(language, "commands.music", "autoplay_disabled", {
            user: `<@${message.user!.id}>`,
            botname: client.user!.username || client.user!.displayName,
            serversupport: client.config.bot.SERVER_SUPPORT_URL,
          })}`
        )
        .setColor(client.color_main);

      return message.reply({
        content: " ",
        embeds: [AutoplayDisabledEmbed],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!player) {
      collector.stop();
    }

    if (player.data.get("autoplay") === true) {
      player.data.set("autoplay", false);
      player.data.set("identifier", null);
      player.data.set("requester", null);

      await new ReplyInteractionService(
        client,
        message,
        `${client.i18n.get(language, "button.player.music", "autoplay_off", {
          mode: "Enable",
          user: String(message.user?.displayName || message.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );
    } else {
      if (!player!.queue.current) {
        await new ReplyInteractionService(
          client,
          message,
          `${client.i18n.get(language, "button.player.music", "autoplay_no_song", {
            user: String(message.user?.displayName || message.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        );
      }

      const identifier = player.queue.current!.identifier;

      player.data.set("autoplay", true);
      player.data.set("identifier", identifier);
      player.data.set("requester", message.user);
      player.data.set("source", player.queue.current?.source);
      player.data.set("author", player.queue.current?.author);
      player.data.set("title", player.queue.current?.title);

      await new ReplyInteractionService(
        client,
        message,
        `${client.i18n.get(language, "button.player.music", "autoplay_on", {
          mode: "Enable",
          user: String(message.user?.displayName || message.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );
    }
  }
}
