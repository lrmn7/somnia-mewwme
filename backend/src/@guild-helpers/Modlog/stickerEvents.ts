import { Sticker, EmbedBuilder, AuditLogEvent } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class StickerEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("stickerCreate", this.handleStickerCreate.bind(this));
    this.client.on("stickerDelete", this.handleStickerDelete.bind(this));
    this.client.on("stickerUpdate", this.handleStickerUpdate.bind(this));
  }

  private async handleStickerCreate(sticker: Sticker) {
    if (!(await isEventEnabled(sticker.guild?.id || "", "stickerCreate", this.client.db))) return;

    const channel = await getModLogChannel(sticker.guild!.id, this.client);
    if (!channel) return;

    let executor = null;
    try {
      const auditLogs = await sticker.guild!.fetchAuditLogs({
        type: AuditLogEvent.StickerCreate,
        limit: 1,
      });

      const logEntry = auditLogs.entries.find((entry) => entry.target?.id === sticker.id);

      if (logEntry) {
        executor = logEntry.executor;
      }
    } catch (error) {
      this.client.logger.error("StickerCreateHandler", "Failed to fetch audit logs");
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setAuthor({
            name: executor ? executor.username : this.client.user?.username || "Unknown",
            iconURL: executor?.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setDescription(`**Sticker Created**\n${sticker.url}`)
          .setThumbnail(sticker.url)
          .addFields(
            {
              name: "Name",
              value: `> **${sticker.name}**`,
              inline: false,
            },
            {
              name: "Descriptions",
              value: `> *${sticker.description || "No description"}*`,
              inline: false,
            },
            {
              name: "IDs",
              value: `
              > **${sticker.name}** \`(${sticker.id})\`
              > <@${executor.id}> \`(${executor.id})\``,
              inline: false,
            }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user?.displayAvatarURL() || "",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleStickerDelete(sticker: Sticker) {
    if (!(await isEventEnabled(sticker.guild?.id || "", "stickerDelete", this.client.db))) return;

    const channel = await getModLogChannel(sticker.guild!.id, this.client);
    if (!channel) return;

    let executor = null;
    try {
      const auditLogs = await sticker.guild!.fetchAuditLogs({
        type: AuditLogEvent.StickerDelete,
        limit: 1,
      });

      const logEntry = auditLogs.entries.find((entry) => entry.target?.id === sticker.id);

      if (logEntry) {
        executor = logEntry.executor;
      }
    } catch (error) {
      this.client.logger.error("StickerDeleteHandler", "Failed to fetch audit logs");
    }

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setAuthor({
            name: executor ? executor.username : this.client.user?.username || "Unknown",
            iconURL: executor?.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setDescription(`**Sticker Deleted**\n${sticker.url}`)
          .setThumbnail(sticker.url)
          .addFields(
            {
              name: "Name",
              value: `> **${sticker.name}**`,
              inline: false,
            },
            {
              name: "Descriptions",
              value: `> *${sticker.description || "No description"}*`,
              inline: false,
            },
            {
              name: "IDs",
              value: `
              > **${sticker.name}** \`(${sticker.id})\`
              > <@${executor.id}> \`(${executor.id})\``,
              inline: false,
            }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user?.displayAvatarURL() || "",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleStickerUpdate(oldSticker: Sticker, newSticker: Sticker) {
    if (!(await isEventEnabled(newSticker.guild?.id || "", "stickerUpdate", this.client.db)))
      return;

    const channel = await getModLogChannel(newSticker.guild!.id, this.client);
    if (!channel) return;

    let executor = null;
    try {
      const auditLogs = await newSticker.guild!.fetchAuditLogs({
        type: AuditLogEvent.StickerUpdate,
        limit: 1,
      });

      const logEntry = auditLogs.entries.find((entry) => entry.target?.id === newSticker.id);

      if (logEntry) {
        executor = logEntry.executor;
      }
    } catch (error) {
      this.client.logger.error("StickerUpdateHandler", "Failed to fetch audit logs");
    }
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: executor ? executor.username : this.client.user?.username || "Unknown",
            iconURL: executor?.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setColor(0x1e90ff)
          .setDescription(`**Sticker Updated**\n${newSticker.url}`)
          .addFields(
            {
              name: "Name",
              value: `> **${oldSticker.name} ➡️ ${newSticker.name}**`,
              inline: false,
            },
            {
              name: "Descriptions",
              value: `> *${newSticker.description || "No description"}*`,
              inline: false,
            },
            {
              name: "IDs",
              value: `
              > **${newSticker.name}** \`(${newSticker.id})\`
              > <@${executor.id}> \`(${executor.id})\``,
              inline: false,
            }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user?.displayAvatarURL() || "",
          })
          .setThumbnail(newSticker.url)
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
