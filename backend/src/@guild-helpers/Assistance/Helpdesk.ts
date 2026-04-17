import { Manager } from "../../manager.js";
import {
  ActionRowBuilder,
  EmbedBuilder,
  ButtonStyle,
  ButtonBuilder,
  Interaction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import chalk from "chalk";

export class Helpdesk {
  client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.execute();
  }
  async execute() {
    this.client.on("interactionCreate", async (interaction: Interaction): Promise<void> => {
      if (!interaction.isButton()) return;

      const guildId = interaction.guild?.id;
      if (!guildId) return;

      let language = this.client.config.bot.LANGUAGE;

      const member = await interaction.guild?.members.fetch({
        user: interaction.user.id,
        force: true,
      });

      const customId = interaction.customId;
      if (!customId) return;

      if (customId.startsWith("helpdesk")) {
        const helpdeskNumber = customId.slice(8);
        this.client.logger.info(
          Helpdesk.name,
          `Click ${chalk.hex("#00D100").bold("button " + helpdeskNumber)} used by ${chalk
            .hex("#00D100")
            .bold(
              interaction.user.displayName
            )} from ${chalk.hex("#00D100").bold(`${interaction.guild.name} / ${interaction.guild.id}`)}`
        );
        const helpdeskEmbed = new EmbedBuilder()
          .setTitle(
            this.client.i18n.get(language, "events.helpdesk", `helpdesk${helpdeskNumber}_title`, {
              bot: this.client.user!.username,
              vote: `https://top.gg/bot/${this.client.user?.id}/vote`,
              invite: `https://discord.com/oauth2/authorize?client_id=${this.client.user!.id}&permissions=8&scope=bot`,
              website: this.client.config.HELPDESK.WEBSITE_URL,
              server: this.client.config.HELPDESK.SERVER_SUPPORT_URL,
              premium: this.client.config.HELPDESK.PREMIUM_URL,
            })
          )
          .setDescription(
            this.client.i18n.get(language, "events.helpdesk", `helpdesk${helpdeskNumber}_desc`, {
              bot: this.client.user!.username,
              vote: `https://top.gg/bot/${this.client.user?.id}/vote`,
              invite: `https://discord.com/oauth2/authorize?client_id=${this.client.user!.id}&permissions=8&scope=bot`,
              website: this.client.config.HELPDESK.WEBSITE_URL,
              server: this.client.config.HELPDESK.SERVER_SUPPORT_URL,
              premium: this.client.config.HELPDESK.PREMIUM_URL,
            })
          )
          .setColor(this.client.color_main);

        if (customId === "helpdesk10") {
          helpdeskEmbed.setFooter({
            text: `${this.client.i18n.get(
              language,
              "events.helpdesk",
              `helpdesk${helpdeskNumber}_footer`,
              {
                support: this.client.config.HELPDESK.SERVER_SUPPORT_URL,
                bot: this.client.user!.username,
                guild: interaction.guild!.name,
              }
            )}`,
          });
        }

        if (customId === "helpdesk10") {
          const helpdeskButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(this.client.config.HELPDESK.BUTTON_HELPDESK10.NAME1)
              .setStyle(ButtonStyle.Link)
              .setURL(this.client.config.HELPDESK.BUTTON_HELPDESK10.URL1),

            new ButtonBuilder()
              .setLabel(this.client.config.HELPDESK.BUTTON_HELPDESK10.NAME2)
              .setStyle(ButtonStyle.Link)
              .setURL(this.client.config.HELPDESK.BUTTON_HELPDESK10.URL2),

            new ButtonBuilder()
              .setLabel(this.client.config.HELPDESK.BUTTON_HELPDESK10.NAME3)
              .setStyle(ButtonStyle.Link)
              .setURL(this.client.config.HELPDESK.BUTTON_HELPDESK10.URL3)
          );

          interaction.reply({
            content: " ",
            embeds: [helpdeskEmbed],
            components: [helpdeskButton],
            flags: MessageFlags.Ephemeral,
          });
        } else {
          interaction.reply({
            content: " ",
            embeds: [helpdeskEmbed],
            components: [],
            flags: MessageFlags.Ephemeral,
          });
        }

        if (this.client.config.HELPDESK.HELPDESK_LOGS_CHANNEL_ID) {
          const channel = this.client.channels.cache.get(
            this.client.config.HELPDESK.HELPDESK_LOGS_CHANNEL_ID
          );
          if (!channel || !(channel instanceof TextChannel)) return;
          channel.send({
            content: `**${interaction.user.displayName}** (\`${interaction.user.id}\`) used button ${helpdeskNumber} at ${new Date().toLocaleString()}`,
          });
        }
      }
    });
  }
}
