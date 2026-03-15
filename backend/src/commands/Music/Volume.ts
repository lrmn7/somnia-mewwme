import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["volume"];
  public description = "Adjusts the volume of the bot";
  public category = "Music";
  public accessableby = data.COMMANDS_ACCESS.MUSIC.Volume;
  public usage = "<number>";
  public aliases = ["vol"];
  public lavalink = true;
  public playerCheck = true;
  public usingInteraction = true;
  public sameVoiceCheck = true;
  public permissions = [];
  public djRole = true;
  public options = [
    {
      name: "amount",
      description: "The amount of volume to set the bot to.",
      type: ApplicationCommandOptionType.Number,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const value = handler.args[0];
    if (value && isNaN(+value))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "volume_number_invalid", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    const player = client.mewslink.players.get(handler.guild!.id) as MewslinkPlayer;

    if (!value)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "volume_number_invalid", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    if (Number(value) <= 0 || Number(value) > 100)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.music", "volume_invalid", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });

    await player.setVolume(Number(value));

    client.wsl.get(handler.guild!.id)?.send({
      op: "playerVolume",
      guild: handler.guild!.id,
      volume: player.volume,
    });

    const changevol = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.music", "volume_msg", {
          volume: value,
          user: handler.user!.displayName || handler.user!.tag,
          botname: client.user!.username || client.user!.displayName,
        })}`
      )
      .setColor(client.color_main);

    handler.editReply({ content: " ", embeds: [changevol] });
  }
}
