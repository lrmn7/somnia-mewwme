import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import {
  ApplicationCommandOptionType,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  CommandInteractionOptionResolver,
  ChannelType,
  TextChannel,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from "discord.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["ticket", "setup"];
  public description = "Setup a ticket in your server";
  public category = "Admin";
  public accessableby = data.COMMANDS_ACCESS.ADMIN.TicketSetup;
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
      name: "channel",
      description: "Provide channel to setup ticket",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
    {
      name: "open_category",
      description: "Provide the category for open tickets",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
    {
      name: "close_category",
      description: "Provide the category for closed tickets",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
    {
      name: "role",
      description: "Provide the role to be assigned for tickets",
      type: ApplicationCommandOptionType.Role,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;

    const guildId = handler.interaction.guild!.id;
    const existingSetup = await client.db.TicketSetup.get(guildId);

    if (existingSetup) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "ticket_already_setup")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!client.config.utilities.TicketSystem.Enable) {
      await handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "disable_ticket_system")}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    // @ts-ignore
    const options = handler.interaction.options as CommandInteractionOptionResolver;
    const dataChannel = await options.getChannel("channel");
    const openCategoryData = await options.getChannel("open_category");
    const closeCategoryData = await options.getChannel("close_category");
    const roleData = await options.getRole("role");

    const channel = handler.interaction.guild?.channels.cache.get(dataChannel?.id!);
    const openCategory = handler.interaction.guild?.channels.cache.get(openCategoryData?.id!);
    const closeCategory = handler.interaction.guild?.channels.cache.get(closeCategoryData?.id!);
    const role = handler.interaction.guild?.roles.cache.get(roleData?.id!);

    if (!channel || !openCategory || !closeCategory || !role) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "invalid_channel_category")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!channel.viewable) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "channel_viewable")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (openCategory.type !== ChannelType.GuildCategory) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "invalid_open_category")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (closeCategory.type !== ChannelType.GuildCategory) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "invalid_close_category")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!openCategory.viewable || !closeCategory.viewable) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "category_viewable")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Save ticket setup configuration to database
    const new_data = {
      channelId: channel.id,
      openCategory: openCategory.id,
      closeCategory: closeCategory.id,
      roleId: role.id,
    };

    await client.db.TicketSetup.set(`${handler.interaction.guild!.id}`, new_data);

    // create ticket button
    const button = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`ticket-setup-${handler.interaction.guild?.id}-${openCategory.id}`)
        .setLabel("Create Ticket")
        .setStyle(ButtonStyle.Success)
    );

    // --- Modal to fill in embed details ---
    const modal = new ModalBuilder()
      .setCustomId(`ticket-embed-modal-${handler.interaction.guild!.id}`)
      .setTitle("Ticket Embed Setup");

    // Input 1: Embed Title (optional)
    const titleInput = new TextInputBuilder()
      .setCustomId("embed_title")
      .setLabel("Embed Title")
      .setLabel(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_label_embed_title")}`
      )
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_placeholder_embed_title")}`
      )
      .setRequired(false);

    // Input 2: Embed Description (optional)
    const descriptionInput = new TextInputBuilder()
      .setCustomId("embed_description")
      .setLabel(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_label_embed_description")}`
      )
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_placeholder_embed_description")}`
      )
      .setRequired(false);

    // Input 3: Thumbnail URL (optional)
    const thumbnailInput = new TextInputBuilder()
      .setCustomId("embed_thumbnail")
      .setLabel(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_label_embed_thumbnail_url")}`
      )
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_placeholder_embed_thumbnail_url")}`
      )
      .setRequired(false);

    // Input 4: Embed Image URL (optional)
    const imageInput = new TextInputBuilder()
      .setCustomId("embed_image")
      .setLabel(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_label_embed_image_url")}`
      )
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_placeholder_embed_image_url")}`
      )
      .setRequired(false);

    // Input 5: Footer Text (optional)
    const footerInput = new TextInputBuilder()
      .setCustomId("embed_footer")
      .setLabel(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_label_embed_footer")}`
      )
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(
        `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_placeholder_embed_footer")}`
      )
      .setRequired(false);

    const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput);
    const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput);
    const row3 = new ActionRowBuilder<TextInputBuilder>().addComponents(thumbnailInput);
    const row4 = new ActionRowBuilder<TextInputBuilder>().addComponents(imageInput);
    const row5 = new ActionRowBuilder<TextInputBuilder>().addComponents(footerInput);

    modal.addComponents(row1, row2, row3, row4, row5);

    await handler.interaction.showModal(modal);

    try {
      const submitted = await handler.interaction
        .awaitModalSubmit({
          time: 60000,
          filter: (i) => {
            return (
              i.customId === `ticket-embed-modal-${handler.interaction.guild!.id}` &&
              i.user.id === handler.interaction.user.id
            );
          },
        })
        .catch(() => null);

      if (!submitted) {
        await handler.interaction.followUp({
          content: `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_timeout")}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const embedTitle = submitted.fields.getTextInputValue("embed_title");
      const embedDescription = submitted.fields.getTextInputValue("embed_description");
      const thumbnailURL = submitted.fields.getTextInputValue("embed_thumbnail");
      const embedImage = submitted.fields.getTextInputValue("embed_image");
      const footerText = submitted.fields.getTextInputValue("embed_footer");

      const isValidUrl = (url) => {
        try {
          new URL(url);
          return true;
        } catch (e) {
          return false;
        }
      };

      const embed = new EmbedBuilder().setColor(client.color_main);
      if (embedTitle) embed.setTitle(embedTitle);
      if (embedDescription) embed.setDescription(embedDescription);
      if (isValidUrl(thumbnailURL)) embed.setThumbnail(thumbnailURL);
      if (isValidUrl(embedImage)) embed.setImage(embedImage);
      if (footerText) embed.setFooter({ text: footerText });

      if (thumbnailURL && !isValidUrl(thumbnailURL)) {
        return submitted.reply({
          content: `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_invalid_url_thumbnail")}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      if (embedImage && !isValidUrl(embedImage)) {
        return submitted.reply({
          content: `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_invalid_url_image")}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await (channel as TextChannel).send({
        embeds: [embed],
        components: [button],
      });

      await submitted.reply({
        content: `${client.i18n.get(handler.language, "events.ticket", "setup_ticket_succes", {
          channel: `${channel}`,
        })}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      await handler.interaction.followUp({
        content: `${client.i18n.get(handler.language, "events.ticket", "ticket_setup_modal_error")}`,
        flags: MessageFlags.Ephemeral,
      });
    } finally {
      handler.interaction.client.removeAllListeners("modalSubmit");
    }
  }
}
