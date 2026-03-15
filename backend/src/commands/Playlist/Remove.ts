import { EmbedBuilder, ApplicationCommandOptionType } from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["pl", "remove"];
  public description = "Remove a song from a playlist";
  public category = "Playlist";
  public accessableby = data.COMMANDS_ACCESS.PLAYLIST.Remove;
  public usage = "<playlist_id> <song_postion>";
  public aliases = [];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public options = [
    {
      name: "id",
      description: "The id of the playlist",
      required: true,
      type: ApplicationCommandOptionType.String,
    },
    {
      name: "postion",
      description: "The position of the song",
      required: true,
      type: ApplicationCommandOptionType.Integer,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const value = handler.args[0] ? handler.args[0] : null;
    const pos = handler.args[1];

    if (value == null)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_remove_invalid")}`
            )
            .setColor(client.color_main),
        ],
      });

    if (pos && isNaN(+pos))
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_remove_number_invalid")}`
            )
            .setColor(client.color_main),
        ],
      });

    const playlist = await client.db.playlist.get(`${value}`);
    if (!playlist)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_remove_notfound")}`
            )
            .setColor(client.color_main),
        ],
      });
    if (playlist.owner !== handler.user?.id)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_remove_owner")}`
            )
            .setColor(client.color_main),
        ],
      });

    const position = pos;
    const song = playlist.tracks![Number(position) - 1];
    if (!song)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_remove_song_notfound")}`
            )
            .setColor(client.color_main),
        ],
      });
    await client.db.playlist.pull(`${value}.tracks`, playlist.tracks![Number(position) - 1]);
    const embed = new EmbedBuilder()
      .setDescription(
        `${client.i18n.get(handler.language, "commands.playlist", "pl_remove_removed", {
          name: value,
          position: pos,
        })}`
      )
      .setColor(client.color_main);
    handler.editReply({ embeds: [embed] });
  }
}
