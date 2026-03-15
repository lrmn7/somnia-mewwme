import { Manager } from "../../manager.js";
import { EmbedBuilder, ApplicationCommandOptionType, Message } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["bassboost"];
  public description = "Turning on bassboost filter";
  public category = "Filter";
  public accessableby = data.COMMANDS_ACCESS.FILTER.Bassboost;
  public usage = "<number>";
  public aliases = ["bassboost"];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [
    {
      name: "amount",
      description: "The amount of the bassboost",
      type: ApplicationCommandOptionType.Number,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.SilentDeferReply();

    const value = handler.args[0];

    if (value && isNaN(+value))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.filter", "filter_number")}`
            )
            .setColor(client.color_main),
        ],
      });

    const player = client.mewslink.players.get(handler.guild!.id);

    if (!value) {
      player?.filter.set("bass");

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.filter", "filter_on", {
            name: "Bassboost",
          })}`
        )
        .setColor(client.color_main);

      return handler.editReply({ content: " ", embeds: [embed] });
    }

    if (Number(value) > 10 || Number(value) < -10)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.filter", "bassboost_limit")}`
            )
            .setColor(client.color_main),
        ],
      });

    player?.filter.setEqualizer([
      { band: 0, gain: Number(value) / 10 },
      { band: 1, gain: Number(value) / 10 },
      { band: 2, gain: Number(value) / 10 },
      { band: 3, gain: Number(value) / 10 },
      { band: 4, gain: Number(value) / 10 },
      { band: 5, gain: Number(value) / 10 },
      { band: 6, gain: Number(value) / 10 },
      { band: 7, gain: 0 },
      { band: 8, gain: 0 },
      { band: 9, gain: 0 },
      { band: 10, gain: 0 },
      { band: 11, gain: 0 },
      { band: 12, gain: 0 },
      { band: 13, gain: 0 },
    ]);
    player?.data.set("filter-mode", this.name[0]);

    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.filter", "bassboost_set", {
          amount: value,
        })}`
      )
      .setColor(client.color_main);

    return handler.editReply({ content: " ", embeds: [embed] });
  }
}
