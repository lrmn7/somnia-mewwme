import { Invite, EmbedBuilder, AuditLogEvent } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class InviteEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("inviteCreate", this.handleInviteCreate.bind(this));
    this.client.on("inviteDelete", this.handleInviteDelete.bind(this));
  }

  // Handle invite creation
  private async handleInviteCreate(invite: Invite) {
    if (!(await isEventEnabled(invite.guild?.id || "", "inviteCreate", this.client.db))) return;

    const channel = await getModLogChannel(invite.guild!.id, this.client);
    if (!channel) return;

    const creator = invite.inviter ? `<@${invite.inviter.id}>` : "Unknown";
    const maxUses = invite.maxUses ? invite.maxUses : "Unlimited";
    const expiration = invite.expiresAt
      ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>`
      : "Never";

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: invite.inviter?.username || "Unknown User",
            iconURL: invite.inviter.displayAvatarURL(),
          })
          .setColor(0x32cd32)
          .setTitle("Invite Created")
          .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: `<#${invite.channel!.id}>`, inline: true },
            { name: "Created By", value: creator, inline: true },
            { name: "Max Uses", value: maxUses.toString(), inline: true },
            { name: "Expires", value: expiration, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle invite deletion
  private async handleInviteDelete(invite: Invite) {
    if (!(await isEventEnabled(invite.guild?.id || "", "inviteDelete", this.client.db))) return;

    const channel = await getModLogChannel(invite.guild!.id, this.client);
    if (!channel) return;

    let executor = null;
    try {
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.InviteDelete,
        limit: 1,
      });
      const logEntry = auditLogs.entries.first();
      if (logEntry && logEntry.target?.code === invite.code) {
        executor = logEntry.executor;
      }
    } catch (error) {
      this.client.logger.error("handleInviteDelete", "Failed to fetch audit logs");
    }
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: executor ? executor.username : "Unknown User",
            iconURL: executor?.displayAvatarURL(),
          })
          .setColor(0xff4500)
          .setTitle("Invite Deleted")
          .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: `<#${invite.channel!.id}>`, inline: true },
            { name: "Deleted By", value: `<@${executor.id}>`, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
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
