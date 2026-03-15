import { Manager } from "../../manager.js";
import { EmbedBuilder } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["prefix"];
  public description = "Change the prefix for the bot";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.Prefix;
  public usage = "<input>";
  public aliases = ["setprefix"];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public options = [];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    if (!handler.args[0])
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.settings", "prefix_arg", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    if (handler.args[0].length > 10)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.settings", "prefix_length", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const newPrefix = await client.db.prefix.get(`${handler.guild!.id}`);

    if (!newPrefix) {
      await client.db.prefix.set(`${handler.guild!.id}`, handler.args[0]);

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "prefix_set", {
            prefix: handler.args[0],
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      return handler.editReply({ embeds: [embed] });
    } else if (newPrefix) {
      await client.db.prefix.set(`${handler.guild!.id}`, handler.args[0]);

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "prefix_change", {
            prefix: handler.args[0],
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .setColor(client.color_main);

      return handler.editReply({ embeds: [embed] });
    }
  }
}
