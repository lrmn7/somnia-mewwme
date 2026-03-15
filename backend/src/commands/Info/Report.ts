import { EmbedBuilder, WebhookClient, Attachment, ApplicationCommandOptionType } from "discord.js";
import moment from "moment";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["report"];
  public description = "Send a report bugs to the server support";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.Report;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public djRole = false;
  public options = [
    {
      name: "description",
      description: "The description of your bugs report",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "images",
      description: "The image of your bugs report",
      type: ApplicationCommandOptionType.Attachment,
      required: false,
    },
  ];
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];

  public async execute(client: Manager, handler: CommandHandler) {
    try {
      await handler.deferReply();

      const BugReportChannelID = client.config.logchannel.BugReportChannelID;

      if (!BugReportChannelID || BugReportChannelID.length === 0) {
        // Jika SuggestionChannelID tidak ditemukan
        return handler.editReply({
          embeds: [
            new EmbedBuilder().setColor(client.color_main).setDescription(
              `${client.i18n.get(handler.language, "commands.info", "report_failure", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            ),
          ],
        });
      }

      const channel = await client.channels.fetch(BugReportChannelID).catch(() => undefined);
      if (!channel || !channel.isTextBased()) {
        // Jika channel tidak ditemukan atau bukan channel teks
        return handler.editReply({
          embeds: [
            new EmbedBuilder().setColor(client.color_main).setDescription(
              `${client.i18n.get(handler.language, "commands.info", "report_failure", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            ),
          ],
        });
      }

      const images: Attachment = handler.attactments[0] || null;
      const description = handler.args.join(" ");

      if (!description || description.length === 0) {
        const errorEmbed = new EmbedBuilder().setColor(client.color_main).setDescription(
          `${client.i18n.get(handler.language, "commands.info", "report_provide_desc", {
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          })}`
        );
        await handler.editReply({
          embeds: [errorEmbed],
        });
        return;
      }

      const truncatedDescription =
        description.length > 2048 ? description.slice(0, 2045) + "..." : description;

      const reportEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${handler.user?.displayName} | Report!`,
          iconURL: handler.user?.displayAvatarURL(),
        })
        .setDescription(`**Description**\n\`\`\`${truncatedDescription}\`\`\``)
        .addFields(
          {
            name: `Report by`,
            value: `<@${handler.user?.id ?? ""}>` || handler.user?.displayName || "Unknown User",
            inline: true,
          },
          {
            name: `Time`,
            value: `\`${moment(new Date()).format("dddd, Do MMMM YYYY")}\``,
            inline: true,
          }
        )
        .setColor(client.color_main);

      if (images && images.contentType === "image/png") {
        const attachmentURL = images.url;
        reportEmbed.setImage(attachmentURL);
      }

      await channel.send({ embeds: [reportEmbed] });

      const successEmbed = new EmbedBuilder().setColor(client.color_main).setDescription(
        `${client.i18n.get(handler.language, "commands.info", "report_success", {
          user: String(handler.user?.displayName || handler.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );

      return handler.editReply({ embeds: [successEmbed] });
    } catch (error) {
      client.logger.warn("Report", "Error executing Report command");
      return handler.editReply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `${client.i18n.get(handler.language, "commands.info", "report_failure", {
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            })}`
          ),
        ],
      });
    }
  }
}
