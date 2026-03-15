import { EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["vibrate"];
  public description = "Turning on vibrate filter";
  public category = "Filter";
  public accessableby = data.COMMANDS_ACCESS.FILTER.Vibrate;
  public usage = "";
  public aliases = ["vibrate"];
  public lavalink = true;
  public options = [];
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const player = client.mewslink.players.get(handler.guild!.id);

    if (player?.data.get("filter-mode") == this.name[0])
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.filter", "filter_already", {
                name: this.name[0],
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    player?.data.set("filter-mode", this.name[0]);
    player?.filter.setVibrato({
      frequency: 4.0,
      depth: 0.75,
    });
    player?.filter.setTremolo({
      frequency: 4.0,
      depth: 0.75,
    });

    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.filter", "filter_on", {
          name: this.name[0],
        })}`
      )
      .setColor(client.color_main);
    await handler.editReply({ content: " ", embeds: [embed] });
  }
}
