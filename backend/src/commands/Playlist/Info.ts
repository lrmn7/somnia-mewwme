import { ApplicationCommandOptionType, EmbedBuilder, Message } from "discord.js";
import humanizeDuration from "humanize-duration";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["pl", "info"];
  public description = "Check the playlist infomation";
  public category = "Playlist";
  public accessableby = data.COMMANDS_ACCESS.PLAYLIST.Info;
  public usage = "<playlist_id>";
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
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const value = handler.args[0] ? handler.args[0] : null;

    if (value == null)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_info_invalid")}`
            )
            .setColor(client.color_main),
        ],
      });

    const info = await client.db.playlist.get(value);

    if (!info)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_info_invalid")}`
            )
            .setColor(client.color_main),
        ],
      });

    const created = humanizeDuration(Date.now() - Number(info.created), {
      largest: 1,
    });

    const name = await client.users.fetch(info.owner);

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${client.user!.username} Playlist Info!`,
        iconURL: client.user!.displayAvatarURL(),
        url: `https://discord.com/oauth2/authorize?client_id=${client.user!.id}&permissions=8&scope=bot`,
      })
      .setTitle(info.name)
      .addFields([
        {
          name: `${client.i18n.get(handler.language, "commands.playlist", "pl_info_owner")}`,
          value: `${name.username}`,
        },
        {
          name: `${client.i18n.get(handler.language, "commands.playlist", "pl_info_id")}`,
          value: `${info.id}`,
        },
        {
          name: `${client.i18n.get(handler.language, "commands.playlist", "pl_info_des")}`,
          value: `${
            info.description === null || info.description === "null"
              ? client.i18n.get(handler.language, "commands.playlist", "pl_info_no_des")
              : info.description
          }`,
        },
        {
          name: `${client.i18n.get(handler.language, "commands.playlist", "pl_info_private")}`,
          value: `${
            info.private
              ? client.i18n.get(handler.language, "commands.playlist", "pl_public")
              : client.i18n.get(handler.language, "commands.playlist", "pl_private")
          }`,
        },
        {
          name: `${client.i18n.get(handler.language, "commands.playlist", "pl_info_created")}`,
          value: `${created}`,
        },
        {
          name: `${client.i18n.get(handler.language, "commands.playlist", "pl_info_total")}`,
          value: `${info.tracks!.length}`,
        },
      ])
      .setColor(client.color_main);
    handler.editReply({ embeds: [embed] });
  }
}
