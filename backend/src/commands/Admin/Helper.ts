import { Manager } from "../../manager.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  TextChannel,
  ChannelType,
  MessageFlags,
} from "discord.js";
import { Command, Accessableby } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["helper"];
  public description = "Sets up a channel for bot setup assistance";
  public category = "Admin";
  public accessableby = data.COMMANDS_ACCESS.ADMIN.Helper;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "channel",
      description: "provide channel to be setup assistance",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    // @ts-ignore
    const data = await (handler.interaction.options as CommandInteractionOptionResolver).getChannel(
      "channel"
    );

    const channel = handler.interaction.guild?.channels.cache.get(data?.id!);

    if (!client.config.HELPER_SETUP.Enable) {
      await handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.helper", "disable_helper")}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!channel || channel.type !== ChannelType.GuildText) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.helper", "invalid_channel_helper")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!channel.viewable) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.helper", "channel_viewable_helper")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const AboutButton = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("rule")
          .setLabel(client.config.HELPER_SETUP.NAME1)
          .setStyle(ButtonStyle.Secondary)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("role")
          .setLabel(client.config.HELPER_SETUP.NAME2)
          .setStyle(ButtonStyle.Secondary)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("support-us")
          .setLabel(client.config.HELPER_SETUP.NAME3)
          .setStyle(ButtonStyle.Secondary)
      );

    // Send confirm reply
    await handler.interaction.reply({
      content: `${client.i18n.get(handler.language, "events.helper", "setup_helper_succes", {
        channel: `${channel}`,
        bot: `<@${client.user!.id}>`,
        bots: client.user!.username,
        guild: handler.guild!.name,
        serversupport: client.config.HELPER_SETUP.SERVER_SUPPORT_URL,
      })}`,
      flags: MessageFlags.Ephemeral,
    });

    const textChannel = channel as TextChannel;
    textChannel.send({
      content: `${client.i18n.get(handler.language, "events.helper", "setup_helper_content", {
        bot: `<@${client.user!.id}>`,
        bots: client.user!.username,
        guild: handler.guild!.name,
        serversupport: client.config.HELPER_SETUP.SERVER_SUPPORT_URL,
      })}`,
      embeds: [],
      components: [AboutButton],
    });
  }
}
