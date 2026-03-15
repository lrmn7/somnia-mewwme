import { Manager } from "../../manager.js";
import {
  EmbedBuilder,
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
  public name = ["helpdesk"];
  public description = "Create the help desk channel for the bot";
  public category = "Admin";
  public accessableby = data.COMMANDS_ACCESS.ADMIN.Helpdesk;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public djRole = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public options = [
    {
      name: "channel",
      description: "provide channel to be setup helpdesk",
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

    if (!client.config.HELPDESK.Enable) {
      await handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.helpdesk", "disable_helpdesk")}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!channel || channel.type !== ChannelType.GuildText) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.helpdesk", "invalid_channel_helpdesk")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!channel.viewable) {
      return handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "events.helpdesk", "channel_viewable_helpdesk")}`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed1 = new EmbedBuilder();
    embed1.setAuthor({
      name: client.i18n.get(handler.language, "events.helpdesk", "embed1_title", {
        bot: client.user!.username,
      }),
    });
    embed1.setDescription(
      client.i18n.get(handler.language, "events.helpdesk", "embed1_desc", {
        bot: client.user!.username,
      })
    );
    embed1.setFooter({
      text: client.i18n.get(handler.language, "events.helpdesk", "embed1_footer", {
        bot: client.user!.username,
      }),
    });
    embed1.setColor(client.color_main);

    const embed2 = new EmbedBuilder();
    embed2.setAuthor({
      name: client.i18n.get(handler.language, "events.helpdesk", "embed2_title", {
        bot: client.user!.username,
      }),
    });
    embed2.setDescription(
      client.i18n.get(handler.language, "events.helpdesk", "embed2_desc", {
        bot: client.user!.username,
        button1: client.config.HELPDESK.EMOJI1,
        button2: client.config.HELPDESK.EMOJI2,
        button3: client.config.HELPDESK.EMOJI3,
        button4: client.config.HELPDESK.EMOJI4,
        button5: client.config.HELPDESK.EMOJI5,
        button6: client.config.HELPDESK.EMOJI6,
        button7: client.config.HELPDESK.EMOJI7,
        button8: client.config.HELPDESK.EMOJI8,
        button9: client.config.HELPDESK.EMOJI9,
        button10: client.config.HELPDESK.EMOJI10,
      })
    );
    embed2.addFields(
      {
        name: client.i18n.get(handler.language, "events.helpdesk", "embed2_field1_name"),
        value: client.i18n.get(handler.language, "events.helpdesk", "embed2_field1_value", {
          website: client.config.HELPDESK.WEBSITE_URL,
        }),
        inline: true,
      },
      {
        name: client.i18n.get(handler.language, "events.helpdesk", "embed2_field2_name"),
        value: client.i18n.get(handler.language, "events.helpdesk", "embed2_field2_value"),
        inline: true,
      },
      {
        name: client.i18n.get(handler.language, "events.helpdesk", "embed2_field3_name"),
        value: client.i18n.get(handler.language, "events.helpdesk", "embed2_field3_value", {
          vote: `https://top.gg/bot/${client.user?.id}/vote`,
          premium: client.config.HELPDESK.PREMIUM_URL,
        }),
        inline: true,
      }
    );
    embed2.setColor(client.color_main);

    const row1 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk1")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI1)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk2")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI2)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk3")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI3)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk4")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI4)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk5")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI5)
      );

    const row2 = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk6")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI6)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk7")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI7)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk8")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI8)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk9")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI9)
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId("helpdesk10")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji(client.config.HELPDESK.EMOJI10)
      );

    await handler.interaction.reply({
      content: `${client.i18n.get(handler.language, "events.helpdesk", "setup_helpdesk_succes", {
        channel: `${channel}`,
      })}`,
      flags: MessageFlags.Ephemeral,
    });

    const textChannel = channel as TextChannel;
    textChannel.send({
      embeds: [embed1, embed2],
      components: [row1, row2],
    });
  }
}
