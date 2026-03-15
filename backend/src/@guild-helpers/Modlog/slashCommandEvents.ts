import { CommandInteraction, EmbedBuilder, PermissionsBitField } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class SlashCommandEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("slashCommandError", this.handleSlashCommandError.bind(this));
    this.client.on("slashCommandSuccess", this.handleSlashCommandSuccess.bind(this));
    this.client.on(
      "slashCommandPermissionError",
      this.handleSlashCommandPermissionError.bind(this)
    );
    this.client.on(
      "slashCommandCooldownViolation",
      this.handleSlashCommandCooldownViolation.bind(this)
    );
    this.client.on("interactionTimeout", this.handleInteractionTimeout.bind(this));
  }

  // Handle Slash Command Error
  private async handleSlashCommandError(interaction: CommandInteraction, error: Error) {
    const guild = interaction.guild;
    if (!guild || !(await isEventEnabled(guild.id, "slashCommandError", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setTitle("❌ Slash Command Error")
          .setDescription(`**Error:** ${error.message}\n**Command:** ${interaction.commandName}`)
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle Slash Command Success
  private async handleSlashCommandSuccess(interaction: CommandInteraction) {
    const guild = interaction.guild;
    if (!guild || !(await isEventEnabled(guild.id, "slashCommandSuccess", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32) // Green color for success
          .setTitle("✅ Slash Command Executed")
          .setDescription(
            `**Command:** ${interaction.commandName}\n**User:** <@${interaction.user.id}>`
          )
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle Slash Command Permission Error
  private async handleSlashCommandPermissionError(interaction: CommandInteraction) {
    const guild = interaction.guild;
    if (!guild || !(await isEventEnabled(guild.id, "slashCommandPermissionError", this.client.db)))
      return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    const requiredPermissions = new PermissionsBitField(BigInt(0));

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffa500) // Orange for warning
          .setTitle("⚠️ Slash Command Permission Denied")
          .setDescription(
            `**Command:** ${interaction.commandName}\n**User:** <@${interaction.user.id}>\n**Required Permissions:** ${requiredPermissions.toArray().join(", ")}`
          )
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle Slash Command Cooldown Violation
  private async handleSlashCommandCooldownViolation(interaction: CommandInteraction) {
    const guild = interaction.guild;
    if (
      !guild ||
      !(await isEventEnabled(guild.id, "slashCommandCooldownViolation", this.client.db))
    )
      return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500) // Red for error
          .setTitle("❗ Slash Command Cooldown Violated")
          .setDescription(
            `**Command:** ${interaction.commandName}\n**User:** <@${interaction.user.id}>`
          )
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle Interaction Timeout
  private async handleInteractionTimeout(interaction: CommandInteraction) {
    const guild = interaction.guild;
    if (!guild || !(await isEventEnabled(guild.id, "interactionTimeout", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500) // Red for error
          .setTitle("⏳ Interaction Timeout")
          .setDescription(`The interaction for command **${interaction.commandName}** timed out.`)
          .setTimestamp(new Date()),
      ],
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
