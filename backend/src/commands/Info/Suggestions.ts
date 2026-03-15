import { EmbedBuilder, Attachment, ApplicationCommandOptionType } from "discord.js";
import moment from "moment";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";

const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["suggestions"];
  public description = "Send a suggestion to the server support";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.Suggestions;
  public usage = "";
  public aliases = ["suggest", "sgt"];
  public lavalink = false;
  public djRole = false;
  public options = [
    {
      name: "description",
      description: "Suggest something for the bot",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
    {
      name: "images",
      description: "An image related to your suggestion",
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

      const SuggestionChannelID = client.config.logchannel.SuggestionChannelID;

      if (!SuggestionChannelID || SuggestionChannelID.length === 0) {
        // Jika SuggestionChannelID tidak ditemukan
        return handler.editReply({
          embeds: [
            new EmbedBuilder().setColor(client.color_main).setDescription(
              `${client.i18n.get(handler.language, "commands.info", "suggestions_failure", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            ),
          ],
        });
      }

      const channel = await client.channels.fetch(SuggestionChannelID).catch(() => undefined);
      if (!channel || !channel.isTextBased()) {
        // Jika channel tidak ditemukan atau bukan channel teks
        return handler.editReply({
          embeds: [
            new EmbedBuilder().setColor(client.color_main).setDescription(
              `${client.i18n.get(handler.language, "commands.info", "suggestions_failure", {
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
        return handler.editReply({
          embeds: [
            new EmbedBuilder().setColor(client.color_main).setDescription(
              `${client.i18n.get(handler.language, "commands.info", "suggestions_provide_desc", {
                user: String(handler.user?.displayName || handler.user?.tag),
                botname: client.user!.username || client.user!.displayName,
              })}`
            ),
          ],
        });
      }

      const truncatedDescription =
        description.length > 2048 ? `${description.slice(0, 2045)}...` : description;

      const suggestionEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${handler.user?.displayName} | Suggestion!`,
          iconURL: handler.user?.displayAvatarURL(),
        })
        .setDescription(`**Description**\n\`\`\`${truncatedDescription}\`\`\``)
        .addFields(
          {
            name: `Suggested by`,
            value: `<@${handler.user?.id}>` || handler.user?.displayName || "Unknown User",
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
        suggestionEmbed.setImage(images.url);
      }

      await channel.send({ embeds: [suggestionEmbed] });

      const successEmbed = new EmbedBuilder().setColor(client.color_main).setDescription(
        `${client.i18n.get(handler.language, "commands.info", "suggestions_success", {
          user: String(handler.user?.displayName || handler.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );

      return handler.editReply({ embeds: [successEmbed] });
    } catch (error) {
      client.logger.warn("Suggestion", "Error executing suggestions command");
      return handler.editReply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `${client.i18n.get(handler.language, "commands.info", "suggestions_failure", {
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            })}`
          ),
        ],
      });
    }
  }
}
