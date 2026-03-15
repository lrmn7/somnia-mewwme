import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { ApplicationCommandOptionType, EmbedBuilder, WebhookClient } from "discord.js";
import moment from "moment";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["rating"];
  public description = "Rating of the bot";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.Rating;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public usingInteraction = true;
  public playerCheck = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "rated",
      description: "Choose the rate you want to give",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "⭐⭐⭐⭐⭐", value: "⭐⭐⭐⭐⭐" },
        { name: "⭐⭐⭐⭐", value: "⭐⭐⭐⭐" },
        { name: "⭐⭐⭐", value: "⭐⭐⭐" },
        { name: "⭐⭐", value: "⭐⭐" },
        { name: "⭐", value: "⭐" },
      ],
    },
    {
      name: "category",
      description: "Select the category for your rating",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Audio Quality", value: "Audio Quality" },
        { name: "Responsiveness", value: "Responsiveness" },
        { name: "Features", value: "Features" },
        { name: "User Interface (UI)", value: "User Interface (UI)" },
        { name: "Stability", value: "Stability" },
        { name: "Support and Maintenance", value: "Support and Maintenance" },
        { name: "Performance", value: "Performance" },
        { name: "User Satisfaction", value: "User Satisfaction" },
      ],
    },
    {
      name: "description",
      description: "The description of the rating",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    try {
      if (!handler.interaction) return;
      await handler.deferReply();

      const RatingChannelID = client.config.logchannel.RatingChannelID;

      // Buat Embed untuk kesalahan
      const errorEmbed = new EmbedBuilder().setColor(client.color_main).setDescription(
        `${client.i18n.get(handler.language, "commands.info", "rating_failure", {
          user: String(handler.user?.displayName || handler.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );

      if (!RatingChannelID || RatingChannelID.length === 0) {
        // Jika RatingChannelID tidak diketahui
        return handler.editReply({ embeds: [errorEmbed] });
      }

      const channel = await client.channels.fetch(RatingChannelID).catch(() => undefined);

      if (!channel || (channel && !channel.isTextBased())) {
        // Jika channel tidak ditemukan atau bukan channel teks
        return handler.editReply({ embeds: [errorEmbed] });
      }

      const rating = handler.args[0];
      const category = handler.args[1];
      const description = handler.args[2] || "No description provided";

      if (!rating || !category || !description) {
        return handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.info", "rating_failure", {
                  prefix: client.prefix,
                  user: String(handler.user?.displayName || handler.user?.tag),
                  botname: client.user!.username || client.user!.displayName,
                })}`
              )
              .setColor(client.color_main),
          ],
        });
      }

      const RatingEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${handler.user?.displayName} | Rating!`,
          iconURL: handler.user?.displayAvatarURL(),
        })
        .setDescription(
          `${client.i18n.get(handler.language, "commands.info", "rating_desc", {
            rating: rating,
            user: `<@${handler.user?.id ?? ""}>` || handler.user?.displayName || "Unknown User",
            botname: client.user!.username || client.user!.displayName,
          })}`
        )
        .addFields(
          {
            name: `Rating`,
            value: rating,
            inline: true,
          },
          {
            name: `Category`,
            value: category,
            inline: true,
          },
          {
            name: `Time`,
            value: `\`${moment(new Date()).format("dddd, Do MMMM YYYY")}\``,
            inline: true,
          },
          {
            name: `Description`,
            value: `\`\`\`${description}\`\`\``,
            inline: false,
          }
        )
        .setColor(client.color_main);

      // Mengirim Embed ke channel
      channel.send({ embeds: [RatingEmbed] });

      const successEmbed = new EmbedBuilder().setColor(client.color_main).setDescription(
        `${client.i18n.get(handler.language, "commands.info", "rating_succes", {
          user: String(handler.user?.displayName || handler.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );
      handler.editReply({ embeds: [successEmbed] });
    } catch (error) {
      client.logger.warn("Rating", "Error executing Rating command");
      const errorEmbed = new EmbedBuilder().setColor(client.color_main).setDescription(
        `${client.i18n.get(handler.language, "commands.info", "rating_failure", {
          user: String(handler.user?.displayName || handler.user?.tag),
          botname: client.user!.username || client.user!.displayName,
        })}`
      );

      handler.editReply({ embeds: [errorEmbed] });
    }
  }
}
