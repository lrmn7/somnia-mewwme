import * as discordTranscripts from "mewwme-transcripts";
import { Manager } from "../../manager.js";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ChannelType,
  TextChannel,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  Interaction,
  MessageFlags,
} from "discord.js";

export class TicketHandler {
  client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.execute();
  }
  async execute() {
    this.client.on("interactionCreate", async (interaction: Interaction): Promise<void> => {
      if (!interaction.guild) return;
      const guildId = interaction.guild.id;
      let guildModel = await this.client.db.language.get(guildId);
      const language = (guildModel = await this.client.db.language.set(
        guildId,
        this.client.config.bot.LANGUAGE
      ));
      const TicketSetupData = await this.client.db.TicketSetup.get(guildId);
      const roleId = TicketSetupData?.roleId;
      const closeCategoryId = TicketSetupData?.closeCategory;

      if (interaction.isButton()) {
        // Button to open ticket
        if (interaction.customId.startsWith(`ticket-setup-${interaction.guild.id}`)) {
          const id = interaction.customId.split("-")[3];

          const modal = new ModalBuilder()
            .setCustomId(`modal-${interaction.guild.id}-${id}`)
            .setTitle(`${interaction.guild.name}'s Ticket`);

          const ticketreason: TextInputBuilder = new TextInputBuilder()
            .setCustomId(`ticket-reason`)
            .setLabel("Reason")
            .setPlaceholder(`${this.client.i18n.get(language, "events.ticket", "ticket_reason")}`)
            .setStyle(TextInputStyle.Short)
            .setMinLength(10)
            .setMaxLength(500);

          const firstActionRow: ActionRowBuilder<TextInputBuilder> =
            new ActionRowBuilder<TextInputBuilder>().addComponents(ticketreason);

          modal.addComponents([firstActionRow]);

          await interaction.showModal(modal);
        }

        // Button CLOSE tiket
        if (interaction.customId.startsWith(`close-ticket`)) {
          await interaction.deferUpdate();
          const id = interaction.customId.split("-")[2];
          const ticketData = await this.client.db.TicketData.get(id);
          if (!ticketData) {
            interaction.followUp({
              content: `${this.client.i18n.get(language, "events.ticket", "ticket_already_closed", {
                id: id,
              })}`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const user = await interaction.guild.members.fetch(ticketData.userId).catch(() => null);
          const channel = interaction.guild.channels.cache.get(
            interaction.channelId
          ) as TextChannel;

          if (!channel?.permissionsFor(interaction.user.id)?.has("ManageChannels")) {
            interaction.followUp({
              content: `${this.client.i18n.get(language, "events.ticket", "ticket_close_user")}`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          const today = new Date();
          const day = today.getDate().toString().padStart(2, "0");
          const month = (today.getMonth() + 1).toString().padStart(2, "0");
          const year = today.getFullYear();
          // Remove -, . and _ characters from username
          const safeUsername = ticketData.Username.replace(/[-._]/g, "");
          // Use the ticketCount already stored in TicketData
          const ticketCount = ticketData.ticketCount || 1;
          const filename = `${ticketCount}-${safeUsername}-${day}-${month}-${year}.html`;

          const attachment = await discordTranscripts.createTranscript(channel as any, {
            limit: -1,
            returnType: discordTranscripts.ExportReturnType.Attachment,
            filename: `${filename}`,
            saveImages: true,
            footerText: "Exported {number} message{s}",
            poweredBy: true,
            hydrate: true,
          });

          const message = await channel.send({
            files: [attachment],
          });
          const attachmentUrl = message.attachments.first().url;
          const filePath = path.join("transcript", `${filename}`);
          if (!fs.existsSync(path.join("transcript"))) {
            fs.mkdirSync(path.join("transcript"));
          }

          try {
            const response = await axios.get(attachmentUrl, {
              responseType: "stream",
            });
            const writer = fs.createWriteStream(filePath);
            response.data.pipe(writer);
            writer.on("finish", () => {
              this.client.logger.info(
                TicketHandler.name,
                `Transcript saved for ticket ${ticketData.Username} at ${filePath}`
              );
            });
            writer.on("error", (err) => {
              this.client.logger.warn(TicketHandler.name, `Failed to save transcript: ${err}`);
            });
          } catch (error) {
            this.client.logger.warn(TicketHandler.name, `Failed to download transcript: ${error}`);
          }

          if (!closeCategoryId) {
            this.client.logger.warn(
              TicketHandler.name,
              `Close category not set for guild ${guildId}`
            );
            return;
          }

          try {
            // Move channel to 'Closed' category
            const closeCategory = interaction.guild.channels.cache.get(closeCategoryId);
            if (closeCategory && closeCategory.type === ChannelType.GuildCategory) {
              await channel.setParent(closeCategory);
            }
          } catch (error) {
            this.client.logger.error(TicketHandler.name, `Failed to move ticket channel: ${error}`);
          }

          // Send DM to user with transcript link
          const buttonDmUser = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setLabel(this.client.i18n.get(language, "events.ticket", "label_name_one"))
              .setURL(
                `${this.client.config.utilities.TicketSystem.TranscriptTicketExporter}?userId=${id}&timestamp=${Date.now()}&guildId=${guildId}&url=${this.client.config.features.WebServer.BaseUrl}/transcript/${filename}&send=true`
              )
              .setStyle(ButtonStyle.Link),
            new ButtonBuilder()
              .setLabel(this.client.i18n.get(language, "events.ticket", "label_name_two"))
              .setURL(attachmentUrl)
              .setStyle(ButtonStyle.Link)
          );

          const embedDmUser = new EmbedBuilder()
            .setColor(this.client.color_main)
            .setTitle(
              `${this.client.i18n.get(language, "events.ticket", "ticket_closed_dm_title")}`
            )
            .setDescription(
              `${this.client.i18n.get(language, "events.ticket", "ticket_closed_dm_desc", {
                bot: this.client.user!.username,
              })}`
            );

          if (user) {
            try {
              await user.send({
                content: " ",
                components: [buttonDmUser],
                embeds: [embedDmUser],
              });
              this.client.logger.info(
                TicketHandler.name,
                `Successfully sent DM to user ${user.user.tag} for closing the ticket.`
              );
            } catch (error) {
              this.client.logger.info(
                TicketHandler.name,
                `Failed to send message to user ${user.user.tag}: ${error}`
              );
            }
          } else {
            this.client.logger.info(
              TicketHandler.name,
              `User with ID ${ticketData.userId} was not found on the server. Continue closing the ticket.`
            );
          }

          // Update permissions and rename the ticket channel, and send a message with the DELETE button
          try {
            await channel.permissionOverwrites.set([
              {
                id: interaction.guild.roles.everyone.id,
                deny: ["ViewChannel"],
              },
              {
                id: roleId,
                allow: ["ViewChannel", "SendMessages"],
              },
              {
                id: interaction.client.user.id,
                allow: ["ManageChannels"],
              },
            ]);

            const newName = `closed-${ticketData.Username}`;
            await channel.setName(newName);

            // Send a new message with the DELETE button for staff
            const deleteButton = new ButtonBuilder()
              .setCustomId(`delete-ticket-${ticketData.userId}`)
              .setLabel(`${this.client.i18n.get(language, "events.ticket", "ticket_delete_label")}`)
              .setStyle(ButtonStyle.Danger);

            const deleteRow = new ActionRowBuilder<ButtonBuilder>().addComponents(deleteButton);

            const closedEmbed = new EmbedBuilder()
              .setTitle(`${this.client.i18n.get(language, "events.ticket", "ticket_closed_title")}`)
              .setDescription(
                `${this.client.i18n.get(language, "events.ticket", "ticket_closed_desc")}`
              )
              .setColor(this.client.color_main);
            const closedButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setLabel(this.client.i18n.get(language, "events.ticket", "label_name_one"))
                .setURL(
                  `${this.client.config.utilities.TicketSystem.TranscriptTicketExporter}?userId=${id}&timestamp=${Date.now()}&guildId=${guildId}&url=${this.client.config.features.WebServer.BaseUrl}/transcript/${filename}&send=true`
                )
                .setStyle(ButtonStyle.Link),
              new ButtonBuilder()
                .setLabel(this.client.i18n.get(language, "events.ticket", "label_name_two"))
                .setURL(attachmentUrl)
                .setStyle(ButtonStyle.Link)
            );

            await channel.send({
              embeds: [closedEmbed],
              components: [deleteRow, closedButton],
            });

            await this.client.db.TicketData.delete(id);
          } catch (error) {
            this.client.logger.info(TicketHandler.name, `Failed to update channel: ${error}`);
          }
        }

        // Button DELETE ticket
        if (interaction.customId.startsWith("delete-ticket")) {
          // Ensure that only staff (with ManageChannels) can delete tickets.
          if (!interaction.channel) return;
          const channel = interaction.channel as TextChannel;
          if (!channel.permissionsFor(interaction.user.id)?.has("ManageChannels")) {
            interaction.reply({
              content: `${this.client.i18n.get(language, "events.ticket", "ticket_delete_user")}`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }

          await interaction.reply({
            content: `${this.client.i18n.get(language, "events.ticket", "ticket_deleting_action")}`,
            flags: MessageFlags.Ephemeral,
          });
          try {
            await channel.delete();
          } catch (error) {
            this.client.logger.warn(
              TicketHandler.name,
              `Failed to delete ticket channel: ${error}`
            );
          }
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith(`modal-${interaction.guild.id}`)) {
          // Check if the user already has an active ticket
          const existingTicket = await this.client.db.TicketData.get(interaction.user.id);
          if (existingTicket) {
            await interaction.reply({
              content: `${this.client.i18n.get(language, "events.ticket", "ticket_already_open", {
                channel: `<#${existingTicket.ChannelId}>`,
              })}`,
              flags: MessageFlags.Ephemeral,
            });
            return;
          }
          const id = interaction.customId.split("-")[2];
          const reason = interaction.fields.getTextInputValue("ticket-reason");
          const category = interaction.guild.channels.cache.get(id);

          // Retrieve the saved ticket count for the guild
          let ticketCount = await this.client.db.TicketCount.get(interaction.guild.id);
          if (!ticketCount) ticketCount = 0;
          ticketCount++; // Add count for new ticket

          // Save new ticket count for guild
          await this.client.db.TicketCount.set(interaction.guild.id, ticketCount);
          // Use ticketCount and username for channel name
          const channelName = `${ticketCount}-${interaction.user.username}`;
          await interaction.guild.channels
            .create({
              parent: category!.id,
              name: `ticket-${channelName}`,
              permissionOverwrites: [
                {
                  id: interaction.user.id,
                  allow: ["SendMessages", "ViewChannel"],
                },
                {
                  id: interaction.guild.roles.everyone,
                  deny: ["ViewChannel"],
                },
                {
                  id: interaction.client.user.id,
                  allow: ["ManageChannels"],
                },
              ],
              type: ChannelType.GuildText,
            })
            .then(async (c: TextChannel) => {
              await this.client.db.TicketData.set(interaction.user.id, {
                userId: interaction.user.id,
                Username: interaction.user.username,
                ChannelId: c.id,
                ticketCount, // save count ticket for user
              });

              interaction.reply({
                content: `${this.client.i18n.get(language, "events.ticket", "ticket_create", {
                  channel: `<#${c.id}>`,
                })}`,
                flags: MessageFlags.Ephemeral,
              });

              const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                  .setCustomId(`close-ticket-${interaction.user.id}`)
                  .setLabel(
                    `${this.client.i18n.get(language, "events.ticket", "ticket_closed_label")}`
                  )
                  .setStyle(ButtonStyle.Danger)
              );

              const embed = new EmbedBuilder()
                .setTitle(
                  `${this.client.i18n.get(language, "events.ticket", "ticket_create_title")}`
                )
                .setAuthor({
                  name: `${interaction.user.username}'s Ticket`,
                  iconURL: interaction.user.displayAvatarURL(),
                })
                .setDescription(
                  `${this.client.i18n.get(language, "events.ticket", "ticket_create_desc")}`
                )
                .setTimestamp()
                .addFields({ name: "Reason", value: `${reason}` })
                .setColor(this.client.color_main);

              c.send({
                content: `${interaction.user} <@&${roleId}>`,
                components: [row],
                embeds: [embed],
              });
            });
        }
      }
    });
  }
}
