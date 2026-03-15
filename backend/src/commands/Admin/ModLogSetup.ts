import { Manager } from "../../manager.js";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import {
  EmbedBuilder,
  ApplicationCommandOptionType,
  CommandInteraction,
  TextChannel,
  ChannelType,
} from "discord.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["modlogs", "setup"];
  public description = "Set the channel for mod logs";
  public category = "Admin";
  public accessableby = data.COMMANDS_ACCESS.ADMIN.ModLogSetup;
  public usage = "<text channel>";
  public aliases = ["sml"];
  public lavalink = false;
  public usingInteraction = true;
  public playerCheck = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "channel",
      description: "The channel to send mod logs to",
      type: ApplicationCommandOptionType.Channel,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;
    // @ts-ignore
    const channelOption = interaction.options.get("channel");
    const channel = channelOption?.channel as TextChannel;

    if (!channel || channel.type !== ChannelType.GuildText) {
      return handler.interaction?.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${client.i18n.get(handler.language, "commands.admin", "modlogs_invalid_channel", {
                user: handler.user!.displayName || handler.user!.tag,
                botname: client.user!.username || client.user!.displayName,
              })}`
            )
            .setColor(client.color_main),
        ],
      });
    }

    const new_data = {
      guildId: handler.guild!.id,
      guildName: handler.guild!.name,
      channelId: channel.id,
    };
    await client.db.ModLogChannel.set(`${handler.guild!.id}`, new_data);

    return handler.interaction?.reply({
      embeds: [
        new EmbedBuilder()
          .setDescription(
            `${client.i18n.get(handler.language, "commands.admin", "modlogs_setup_channel", {
              user: handler.user!.displayName || handler.user!.tag,
              botname: client.user!.username || client.user!.displayName,
              channel: `<#${channel.id}>`,
            })}`
          )
          .setColor(client.color_main),
      ],
    });
  }
}
