import * as discordTranscripts from "mewwme-transcripts";
import { Manager } from "../../manager.js";
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
      if (!guildModel) {
        guildModel = await this.client.db.language.set(
          guildId,
          this.client.config.bot.LANGUAGE
        );
      }
      const language = guildModel;
      const TicketSetupData = await this.client.db.TicketSetup.get(guildId);
      if (!TicketSetupData) return;
      TicketSetupData.activeTickets = TicketSetupData.activeTickets ?? {};
      TicketSetupData.history = TicketSetupData.history ?? [];
      TicketSetupData.ticketCount = TicketSetupData.ticketCount ?? 0;
      if (!TicketSetupData.enabled) {
        if (interaction.isButton() || interaction.isModalSubmit()) {
          await interaction.reply({
            content: "🎫 The ticket system is currently unavailable.",
            flags: MessageFlags.Ephemeral,
          });
        }
        return;
      }
      const roleId = TicketSetupData.roleId;
      const closeCategoryId = TicketSetupData.closeCategory;

      if (interaction.isButton()) {
        if (interaction.customId.startsWith(`ticket-setup-${guildId}`)) {
          const id = interaction.customId.split("-")[3];

          const modal = new ModalBuilder()
            .setCustomId(`modal-${guildId}-${id}`)
            .setTitle(`${interaction.guild.name}'s Ticket`);

          const ticketreason = new TextInputBuilder()
            .setCustomId("ticket-reason")
            .setLabel("Reason")
            .setPlaceholder(
              `${this.client.i18n.get(language, "events.ticket", "ticket_reason")}`
            )
            .setStyle(TextInputStyle.Short)
            .setMinLength(10)
            .setMaxLength(500);

          modal.addComponents([
            new ActionRowBuilder<TextInputBuilder>().addComponents(ticketreason),
          ]);

          await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith("close-ticket")) {
          await interaction.deferUpdate();
          const id = interaction.customId.split("-")[2];
          const ticketData = TicketSetupData.activeTickets[id];
          if (!ticketData) {
            interaction.followUp({
              content: `${this.client.i18n.get(language, "events.ticket", "ticket_already_closed", { id })}`,
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
          const safeUsername = ticketData.Username.replace(/[-._]/g, "");
          const ticketCount = ticketData.ticketCount || 1;
          const filename = `${ticketCount}-${safeUsername}-${day}-${month}-${year}.html`;

          const attachment = await discordTranscripts.createTranscript(channel as any, {
            limit: -1,
            returnType: discordTranscripts.ExportReturnType.Attachment,
            filename,
            saveImages: true,
            footerText: "Exported {number} message{s}",
            poweredBy: true,
            hydrate: true,
          });

          const message = await channel.send({ files: [attachment] });
          const attachmentUrl = message.attachments.first()!.url;

          if (closeCategoryId) {
            try {
              const closeCategory = interaction.guild.channels.cache.get(closeCategoryId);
              if (closeCategory && closeCategory.type === ChannelType.GuildCategory) {
                await channel.setParent(closeCategory);
              }
            } catch (error) {
              this.client.logger.error(TicketHandler.name, `Failed to move ticket channel: ${error}`);
            }
          }

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
                embeds: [embedDmUser],
                components: [],
                files: [attachment],
              });
              this.client.logger.info(
                TicketHandler.name,
                `Sent transcript DM to ${user.user.tag}`
              );
            } catch (error) {
              this.client.logger.info(
                TicketHandler.name,
                `Failed to DM user ${user.user.tag}: ${error}`
              );
            }
          }

          try {
            const historyEntry = TicketSetupData.history.find(
              (h) => h.userId === ticketData.userId && h.ticketCount === ticketCount
            );
            if (historyEntry) {
              historyEntry.status = "closed";
              historyEntry.closedAt = Date.now();
              historyEntry.closedBy = interaction.user.id;
              historyEntry.transcriptUrl = attachmentUrl;
              await this.client.db.TicketSetup.set(guildId, TicketSetupData);
            }
          } catch (err) {
            this.client.logger.warn(TicketHandler.name, `Failed to update ticket history: ${err}`);
          }

          try {
            await channel.permissionOverwrites.set([
              { id: interaction.guild.roles.everyone.id, deny: ["ViewChannel"] },
              { id: roleId, allow: ["ViewChannel", "SendMessages"] },
              { id: interaction.client.user.id, allow: ["ManageChannels"] },
            ]);

            await channel.setName(`closed-${ticketData.Username}`);

            const deleteButton = new ButtonBuilder()
              .setCustomId(`delete-ticket-${ticketData.userId}`)
              .setLabel(
                `${this.client.i18n.get(language, "events.ticket", "ticket_delete_label")}`
              )
              .setStyle(ButtonStyle.Danger);

            const closedEmbed = new EmbedBuilder()
              .setTitle(
                `${this.client.i18n.get(language, "events.ticket", "ticket_closed_title")}`
              )
              .setDescription(
                `${this.client.i18n.get(language, "events.ticket", "ticket_closed_desc")}`
              )
              .setColor(this.client.color_main);

            await channel.send({
              embeds: [closedEmbed],
              components: [],
            });

            delete TicketSetupData.activeTickets[id];
            await this.client.db.TicketSetup.set(guildId, TicketSetupData);
          } catch (error) {
            this.client.logger.info(TicketHandler.name, `Failed to update channel: ${error}`);
          }
        }

        if (interaction.customId.startsWith("delete-ticket")) {
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
            this.client.logger.warn(TicketHandler.name, `Failed to delete ticket channel: ${error}`);
          }
        }
      }

      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith(`modal-${guildId}`)) {
          const existingTicket = TicketSetupData.activeTickets[interaction.user.id];
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

          TicketSetupData.ticketCount++;
          const ticketCount = TicketSetupData.ticketCount;

          const channelName = `ticket-${ticketCount}-${interaction.user.username}`;

          await interaction.guild.channels
            .create({
              parent: category!.id,
              name: channelName,
              permissionOverwrites: [
                { id: interaction.user.id, allow: ["SendMessages", "ViewChannel"] },
                { id: interaction.guild.roles.everyone, deny: ["ViewChannel"] },
                { id: interaction.client.user.id, allow: ["ManageChannels"] },
              ],
              type: ChannelType.GuildText,
            })
            .then(async (c: TextChannel) => {
              TicketSetupData.activeTickets[interaction.user.id] = {
                userId: interaction.user.id,
                Username: interaction.user.username,
                ChannelId: c.id,
                ticketCount,
              };

              TicketSetupData.history.push({
                ticketCount,
                guildId,
                userId: interaction.user.id,
                Username: interaction.user.username,
                ChannelId: c.id,
                reason,
                status: "open",
                openedAt: Date.now(),
              });

              await this.client.db.TicketSetup.set(guildId, TicketSetupData);

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
                .addFields({ name: "Reason", value: reason })
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
