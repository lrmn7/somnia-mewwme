import { Role, AuditLogEvent, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class RoleEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("roleCreate", this.handleRoleCreate.bind(this));
    this.client.on("roleDelete", this.handleRoleDelete.bind(this));
    this.client.on("roleUpdate", async (oldRole, newRole) => {
      await this.handleRoleUpdate(oldRole, newRole);
      await this.handleRolePermissionsUpdate(oldRole, newRole);
      await this.handleRoleMentionableUpdate(oldRole, newRole);
    });
  }

  // Handle role creation event
  private async handleRoleCreate(role: Role) {
    if (!(await isEventEnabled(role.guild.id, "roleCreate", this.client.db))) return;

    const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleCreate });
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry?.executor;

    const channel = await getModLogChannel(role.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: executor?.username,
            iconURL: executor?.displayAvatarURL(),
          })
          .setColor(0x32cd32)
          .setTitle("Role Created")
          .setDescription(`**Role:** ${role.name} (${role.id})`)
          .addFields(
            { name: "Created By", value: `<@${executor?.id}>`, inline: true },
            { name: "Color", value: `${role.hexColor}`, inline: true },
            { name: "Permissions", value: `${role.permissions.bitfield}`, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user.displayAvatarURL(),
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle role deletion event
  private async handleRoleDelete(role: Role) {
    if (!(await isEventEnabled(role.guild.id, "roleDelete", this.client.db))) return;

    const auditLogs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete });
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry?.executor;

    const channel = await getModLogChannel(role.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setAuthor({
            name: executor?.username,
            iconURL: executor?.displayAvatarURL(),
          })
          .setTitle("Role Deleted")
          .setDescription(`**Role:** ${role.name} (${role.id})`)
          .addFields(
            { name: "Deleted By", value: `<@${executor?.id}>`, inline: true },
            { name: "Color", value: `${role.hexColor}`, inline: true },
            { name: "Permissions", value: `${role.permissions.bitfield}`, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user.displayAvatarURL(),
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle role update event
  private async handleRoleUpdate(oldRole: Role, newRole: Role) {
    if (!(await isEventEnabled(newRole.guild.id, "roleUpdate", this.client.db))) return;

    const auditLogs = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate });
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry?.executor;

    const channel = await getModLogChannel(newRole.guild.id, this.client);
    if (!channel) return;

    const changes = [];
    if (oldRole.name !== newRole.name) {
      changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    }
    if (oldRole.hexColor !== newRole.hexColor) {
      changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    }

    if (changes.length > 0) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: executor?.username,
              iconURL: executor?.displayAvatarURL(),
            })
            .setColor(0x1e90ff)
            .setTitle("🛠️ Role Updated")
            .setDescription(changes.join("\n"))
            .addFields({ name: "Updated By", value: `<@${executor?.id}>`, inline: true })
            .setFooter({
              text: this.client.user?.username || this.client.user?.tag || "Mewwme",
              iconURL: this.client.user.displayAvatarURL(),
            })
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // Handle role permissions update
  private async handleRolePermissionsUpdate(oldRole: Role, newRole: Role) {
    if (!(await isEventEnabled(newRole.guild.id, "rolePermissionsUpdate", this.client.db))) return;

    if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
      const auditLogs = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate });
      const auditEntry = auditLogs.entries.first();
      const executor = auditEntry?.executor;

      const channel = await getModLogChannel(newRole.guild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: executor?.username,
              iconURL: executor?.displayAvatarURL(),
            })
            .setColor(0x1e90ff)
            .setTitle("🛠️ Role Permissions Updated")
            .setDescription(`**Role:** ${newRole.name}`)
            .addFields(
              {
                name: "Old Permissions",
                value: oldRole.permissions.toArray().join(", "),
                inline: true,
              },
              {
                name: "New Permissions",
                value: newRole.permissions.toArray().join(", "),
                inline: true,
              }
            )
            .setFooter({
              text: this.client.user?.username || this.client.user?.tag || "Mewwme",
              iconURL: this.client.user.displayAvatarURL(),
            })
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // Handle role mentionable update
  private async handleRoleMentionableUpdate(oldRole: Role, newRole: Role) {
    if (!(await isEventEnabled(newRole.guild.id, "roleMentionableUpdate", this.client.db))) return;

    if (oldRole.mentionable !== newRole.mentionable) {
      const auditLogs = await newRole.guild.fetchAuditLogs({ type: AuditLogEvent.RoleUpdate });
      const auditEntry = auditLogs.entries.first();
      const executor = auditEntry?.executor;

      const channel = await getModLogChannel(newRole.guild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: executor?.username,
              iconURL: executor?.displayAvatarURL(),
            })
            .setColor(0x1e90ff) // Blue for updates
            .setTitle("🔧 Role Mentionable Status Updated")
            .setDescription(`**Role:** ${newRole.name}`)
            .addFields(
              { name: "Old Mentionable", value: oldRole.mentionable ? "Yes" : "No", inline: true },
              { name: "New Mentionable", value: newRole.mentionable ? "Yes" : "No", inline: true }
            )
            .setFooter({
              text: this.client.user?.username || this.client.user?.tag || "Mewwme",
              iconURL: this.client.user.displayAvatarURL(),
            })
            .setTimestamp(new Date()),
        ],
      });
    }
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
