import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["rate"];
  public description = "Sets the rate of the song.";
  public category = "Filter";
  public accessableby = data.COMMANDS_ACCESS.FILTER.Rate;
  public usage = "<number>";
  public aliases = ["rate"];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [
    {
      name: "amount",
      description: "The amount of rate to set the song to.",
      type: ApplicationCommandOptionType.Integer,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const value = handler.args[0];

    if (value && isNaN(+value))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(`${client.i18n.get(handler.language, "error", "number_invalid")}`)
            .setColor(client.color_main),
        ],
      });

    const player = client.mewslink.players.get(handler.guild!.id);

    if (Number(value) < 0)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.filter", "filter_greater")}`
            )
            .setColor(client.color_main),
        ],
      });
    if (Number(value) > 10)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.filter", "filter_less")}`
            )
            .setColor(client.color_main),
        ],
      });

    player?.filter.setTimescale({ rate: Number(value) });
    player?.data.set("filter-mode", this.name[0]);

    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.filter", "rate_on", {
          amount: value,
        })}`
      )
      .setColor(client.color_main);
    await handler.editReply({ content: " ", embeds: [embed] });
  }
}
