import {
  EmbedBuilder,
  ApplicationCommandOptionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["pl", "delete"];
  public description = "Delete a playlist";
  public category = "Playlist";
  public accessableby = data.COMMANDS_ACCESS.PLAYLIST.Delete;
  public usage = "<playlist_id>";
  public aliases = [];
  public lavalink = false;
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
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const value = handler.args[0] ? handler.args[0] : null;
    if (value == null)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_delete_invalid")}`
            )
            .setColor(client.color_main),
        ],
      });

    const playlist = await client.db.playlist.get(value);

    if (!playlist)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_delete_notfound")}`
            )
            .setColor(client.color_main),
        ],
      });
    if (playlist.owner !== handler.user?.id)
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.playlist", "pl_delete_owner")}`
            )
            .setColor(client.color_main),
        ],
      });

    const action = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder().setStyle(ButtonStyle.Danger).setCustomId("yes").setLabel("Yes"),
      new ButtonBuilder().setStyle(ButtonStyle.Secondary).setCustomId("no").setLabel("No"),
    ]);

    const msg = await handler.editReply({
      embeds: [
        new EmbedBuilder().setDescription(
          `${client.i18n.get(handler.language, "commands.playlist", "pl_delete_confirm", {
            playlist_id: value,
          })}`
        ),
      ],
      components: [action],
    });

    const collector = msg?.createMessageComponentCollector({
      filter: (m) => m.user.id == handler.user?.id,
      time: 20000,
    });

    collector?.on("collect", async (interaction) => {
      const id = interaction.customId;
      if (id == "yes") {
        await client.db.playlist.delete(value);
        const embed = new EmbedBuilder()
          .setDescription(
            `${client.i18n.get(handler.language, "commands.playlist", "pl_delete_deleted", {
              name: value,
            })}`
          )
          .setColor(client.color_main);
        interaction.reply({ embeds: [embed] });
        collector.stop();
        msg?.delete().catch(() => null);
      } else if (id == "no") {
        const embed = new EmbedBuilder()
          .setDescription(
            `${client.i18n.get(handler.language, "commands.playlist", "pl_delete_no")}`
          )
          .setColor(client.color_main);
        interaction.reply({ embeds: [embed] });
        collector.stop();
        msg?.delete().catch(() => null);
      }
    });

    collector?.on("end", async () => {
      const checkMsg = await handler.channel?.messages
        .fetch(String(msg?.id))
        .catch(() => undefined);
      const embed = new EmbedBuilder()
        .setDescription(`${client.i18n.get(handler.language, "commands.playlist", "pl_delete_no")}`)
        .setColor(client.color_main);
      checkMsg ? checkMsg.edit({ embeds: [embed], components: [] }) : true;
      // @ts-ignore
      collector?.removeAllListeners();
    });
  }
}
