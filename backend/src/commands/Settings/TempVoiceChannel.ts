import { Manager } from "../../manager.js";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import {
  CommandInteraction,
  ApplicationCommandOptionType,
  ChannelType,
  MessageFlags,
} from "discord.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["tempvoice"];
  public description = "Setup TempVoice channel in your guild";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.TempVoiceChannel;
  public usage = "<create> or <delete>";
  public aliases = ["tvn"];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "status",
      description: "Create or Delete Temp Voice",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Create", value: "create" },
        { name: "Delete", value: "delete" },
      ],
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;
    const guildId = interaction.guildId!;
    // @ts-ignore
    const status = interaction.options.get("status", true).value as string;
    const guildSettings = (await client.db.TempVoiceChannelSetting.get(guildId)) || {
      guildId,
      tempVoiceEnabled: false,
      createVoiceChannelId: null,
    };

    if (status === "create") {
      guildSettings.tempVoiceEnabled = true;
      const existingChannel = interaction.guild?.channels.cache.find(
        (channel) =>
          channel.name === "Create Voice Channel" && channel.type === ChannelType.GuildVoice
      );

      if (!existingChannel) {
        const createVoiceChannel = await interaction.guild?.channels.create({
          name: "Create Voice Channel",
          type: ChannelType.GuildVoice,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              allow: ["Connect"],
              deny: ["Speak"],
            },
          ],
        });

        guildSettings.createVoiceChannelId = createVoiceChannel?.id;
      }
    } else if (status === "delete") {
      guildSettings.tempVoiceEnabled = false;
      if (guildSettings.createVoiceChannelId) {
        const channel = interaction.guild?.channels.cache.get(guildSettings.createVoiceChannelId);
        if (channel) {
          await channel.delete(
            `${client.i18n.get(handler.language, "commands.settings", "tempvoice_disabled")}`
          );
        }
      }
      await client.db.TempVoiceChannelSetting.delete(guildId);
    }
    if (status === "create") {
      await client.db.TempVoiceChannelSetting.set(guildId, guildSettings);
    }

    await interaction.reply({
      content: `${client.i18n.get(handler.language, "commands.settings", "tempvoice_setup", {
        status: status === "create" ? "enabled" : "disabled",
      })}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 *  __  __            Made by Tragic              _
 * |  \/  |   L RMN - https://hi-lrmn.is-a.dev   ( )
 * | \  / | _____      ____      ___ __ ___   ___|/ ___
 * | |\/| |/ _ \ \ /\ / /\ \ /\ / / '_ ` _ \ / _ \ / __|
 * | |  | |  __/\ V  V /  \ V  V /| | | | | |  __/ \__ \
 * |_|  |_|\___| \_/\_/    \_/\_/ |_| |_| |_|\___| |___/
 *
 *     Discord Support: https://meww.me/support
 *     Community Resources: https://meww.me/premium
 */
