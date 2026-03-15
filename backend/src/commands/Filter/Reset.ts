import { EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["reset", "filter"];
  public description = "Reset filter";
  public category = "Filter";
  public accessableby = data.COMMANDS_ACCESS.FILTER.Reset;
  public usage = "";
  public aliases = ["reset"];
  public lavalink = true;
  public options = [];
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = false;

  async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const player = client.mewslink.players.get(handler.guild!.id);

    if (!player?.data.get("filter-mode"))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.filter", "reset_already")}`
            )
            .setColor(client.color_main),
        ],
      });

    player?.data.delete("filter-mode");

    await player?.filter.clear();
    await player?.setVolume(player?.volume);

    const resetted = new EmbedBuilder()
      .setDescription(`${client.i18n.get(handler.language, "commands.filter", "reset_on")}`)
      .setColor(client.color_main);
    await handler.editReply({ content: " ", embeds: [resetted] });
  }
}
