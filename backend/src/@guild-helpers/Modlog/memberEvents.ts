import { GuildMember, PartialGuildMember, Presence, EmbedBuilder, AuditLogEvent } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class MemberEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("guildMemberAdd", this.handleGuildMemberAdd.bind(this));
    this.client.on("guildMemberRemove", this.handleGuildMemberRemove.bind(this));
    this.client.on("guildMemberUpdate", this.handleGuildMemberUpdate.bind(this));
    this.client.on("guildMemberBoost", this.handleGuildMemberBoost.bind(this));
    this.client.on("presenceUpdate", this.handlePresenceUpdate.bind(this));
  }

  // Handle presence update (online status update)
  private async handlePresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
    const member = newPresence.member as GuildMember;
    if (
      !member ||
      !(await isEventEnabled(member.guild.id, "guildMemberOnlineStatusUpdate", this.client.db))
    )
      return;

    const logChannel = await getModLogChannel(member.guild.id, this.client);
    if (!logChannel) return;

    const oldStatus = oldPresence?.status || "offline"; // 'offline' is default if no previous presence
    const newStatus = newPresence.status;

    if (oldStatus !== newStatus) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("🟢 Status Updated")
            .setDescription(
              `**Member:** <@${member.id}> changed their status from **${oldStatus}** to **${newStatus}**.`
            )
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // Handle guildMemberAdd event
  private async handleGuildMemberAdd(member: GuildMember | PartialGuildMember) {
    if (!(await isEventEnabled(member.guild.id, "guildMemberAdd", this.client.db))) return;

    const channel = await getModLogChannel(member.guild.id, this.client);
    if (!channel) return;

    const memberInfo =
      member instanceof GuildMember ? `<@${member.id}> (${member.id})` : `${member.user.tag}`;
    const accountCreationTimestamp = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`;
    const accountCreationRelative = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x00ff00)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setThumbnail(
            member.user.displayAvatarURL({ size: 512 }) ||
              this.client.user?.displayAvatarURL({ size: 512 })
          )
          .setDescription(`📥 <@${member.id}> **Join the server.**`)
          .addFields(
            {
              name: "Account Creation",
              value: `${accountCreationTimestamp} (${accountCreationRelative})`,
              inline: false,
            },
            {
              name: "IDs",
              value: `> ${memberInfo}`,
              inline: false,
            }
          )
          .setFooter({
            text: this.client.user?.username || "Unknown",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle guildMemberRemove event
  private async handleGuildMemberRemove(member: GuildMember | PartialGuildMember) {
    if (!(await isEventEnabled(member.guild.id, "guildMemberRemove", this.client.db))) return;

    const channel = await getModLogChannel(member.guild.id, this.client);
    if (!channel) return;

    const memberInfo =
      member instanceof GuildMember ? `<@${member.id}> (${member.id})` : `${member.user.tag}`;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
          .setThumbnail(
            member.user.displayAvatarURL({ size: 512 }) ||
              this.client.user?.displayAvatarURL({ size: 512 })
          )
          .setDescription(`📤 <@${member.id}> **Left the server.**`)
          .addFields({
            name: "IDs",
            value: `> ${memberInfo}`,
            inline: true,
          })
          .setFooter({
            text: this.client.user?.username || "Unknown",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle guildMemberUpdate event
  private async handleGuildMemberUpdate(
    oldMember: GuildMember | PartialGuildMember,
    newMember: GuildMember
  ) {
    if (!(await isEventEnabled(newMember.guild.id, "guildMemberUpdate", this.client.db))) return;

    const logChannel = await getModLogChannel(newMember.guild.id, this.client);
    if (!logChannel) return;

    // Track nickname changes
    if (oldMember.nickname !== newMember.nickname) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL() })
            .setThumbnail(newMember.user.displayAvatarURL({ size: 512 }) || null)
            .setDescription(
              `🔢 **Nickname Changed**\n ${oldMember.nickname || oldMember.user.username} ➡️ ${newMember.nickname || "None"}`
            )
            .addFields({
              name: "IDs",
              value: `> <@${newMember.id}> (${newMember.id})`,
              inline: true,
            })
            .setFooter({
              text: this.client.user.username || this.client.user.tag,
              iconURL: this.client.user?.displayAvatarURL(),
            })
            .setTimestamp(new Date()),
        ],
      });
    }

    // Track role changes (additions and removals)
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
    const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));

    // Fetch audit logs for role updates
    const auditLogs = await newMember.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MemberRoleUpdate,
    });
    const entry = auditLogs.entries.first();
    const executor = entry?.executor;

    // If there are roles added,
    if (addedRoles.size > 0) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x32cd32)
            .setAuthor({
              name: newMember.user.tag,
              iconURL: newMember.user.displayAvatarURL(),
            })
            .setThumbnail(newMember.user.displayAvatarURL({ size: 512 }) || null)
            .setDescription(
              `**Roles Given\n+ ${addedRoles.map((role) => `<@&${role.id}>`).join("\n+ ")}**`
            )
            .addFields({
              name: "IDs",
              value: `
                > <@${newMember.id}> (${newMember.id})
                > <@${executor.id}> (${executor.id})`,
              inline: true,
            })
            .setFooter({
              text: this.client.user.username || this.client.user.tag,
              iconURL: this.client.user?.displayAvatarURL(),
            })
            .setTimestamp(new Date()),
        ],
      });
    }

    // If there are roles removed
    if (removedRoles.size > 0) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4500)
            .setAuthor({
              name: newMember.user.username,
              iconURL: newMember.user.displayAvatarURL(),
            })
            .setThumbnail(newMember.user.displayAvatarURL({ size: 512 }) || null)
            .setDescription(
              `**Roles Removed\n– ${removedRoles.map((role) => `<@&${role.id}>`).join("\n- ")}**`
            )
            .addFields({
              name: "IDs",
              value: `
                > <@${newMember.id}> (${newMember.id})
                > <@${executor.id}> (${executor.id})`,
              inline: true,
            })
            .setFooter({
              text: this.client.user.username || this.client.user.tag,
              iconURL: this.client.user?.displayAvatarURL(),
            })
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // Handle guildMemberBoost event
  private async handleGuildMemberBoost(member: GuildMember) {
    if (!(await isEventEnabled(member.guild.id, "guildMemberBoost", this.client.db))) return;

    const logChannel = await getModLogChannel(member.guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: member.user.tag,
            iconURL: member.user.displayAvatarURL(),
          })
          .setThumbnail(member.user.displayAvatarURL({ size: 512 }) || null)
          .setColor(0xff69b4)
          .setTitle("💎 Server Boosted")
          .setDescription(`> **<@${member.id}> (${member.user.id}) boosted the server.**`)
          .setFooter({
            text: this.client.user.username || this.client.user.tag,
            iconURL: this.client.user?.displayAvatarURL(),
          })
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
