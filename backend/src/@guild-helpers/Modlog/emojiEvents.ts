import { GuildEmoji, PartialEmoji, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class EmojiEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("emojiCreate", this.handleEmojiCreate.bind(this));
    this.client.on("emojiDelete", this.handleEmojiDelete.bind(this));
    this.client.on("emojiUpdate", this.handleEmojiUpdate.bind(this));
  }

  // Handle emoji creation event
  private async handleEmojiCreate(emoji: GuildEmoji | PartialEmoji) {
    if (
      !("guild" in emoji) ||
      !(await isEventEnabled(emoji.guild.id, "emojiCreate", this.client.db))
    )
      return;

    const auditLogs = await emoji.guild.fetchAuditLogs({
      type: 60,
      limit: 1,
    });

    const logEntry = auditLogs.entries.first();
    const executor = logEntry?.executor;

    const channel = await getModLogChannel(emoji.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${executor?.username || "Unknown"}`,
            iconURL: `${executor?.displayAvatarURL() || ""}`,
          })
          .setColor(0x32cd32)
          .setThumbnail(emoji.url || "")
          .setDescription(
            `😀 **Emoji Created**\nEmoji \`:${emoji.name}:\` <:${emoji.name}:${emoji.id}> was created`
          )
          .addFields({
            name: "IDs",
            value: `
              > <:${emoji.name}:${emoji.id}> \`(${emoji.id})\`
              > <@${executor.id}> \`(${executor.id})\``,
            inline: true,
          })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle emoji deletion event
  private async handleEmojiDelete(emoji: GuildEmoji | PartialEmoji) {
    if (
      !("guild" in emoji) ||
      !(await isEventEnabled(emoji.guild.id, "emojiDelete", this.client.db))
    )
      return;

    const auditLogs = await emoji.guild.fetchAuditLogs({
      type: 62, // 'Emoji Delete' log type
      limit: 1,
    });

    const logEntry = auditLogs.entries.first();
    const executor = logEntry?.executor;

    const channel = await getModLogChannel(emoji.guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `${executor?.username || "Unknown"}`,
            iconURL: `${executor?.displayAvatarURL() || ""}`,
          })
          .setColor(0xff4500)
          .setThumbnail(emoji.url || "")
          .setDescription(`**😀 Emoji Deleted**\nEmoji \`:${emoji.name}:\` was deleted`)
          .addFields({
            name: "IDs",
            value: `
              > \`${emoji.name}\` \`(${emoji.id})\`
              > <@${executor.id}> \`(${executor.id})\``,
            inline: false,
          })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle emoji update event
  private async handleEmojiUpdate(oldEmoji: GuildEmoji, newEmoji: GuildEmoji) {
    if (
      !("guild" in newEmoji) ||
      !(await isEventEnabled(newEmoji.guild.id, "emojiUpdate", this.client.db))
    )
      return;

    const auditLogs = await newEmoji.guild.fetchAuditLogs({
      type: 61, // 'Emoji Update' log type
      limit: 1,
    });

    const logEntry = auditLogs.entries.first();
    const executor = logEntry?.executor;

    const changes: string[] = [];
    if (oldEmoji.name !== newEmoji.name) {
      changes.push(
        `**😀 Emoji Updated**\nEmoji \`:${newEmoji.name}:\` <:${newEmoji.name}:${newEmoji.id}> was updated`
      );
    }

    if (changes.length > 0) {
      const channel = await getModLogChannel(newEmoji.guild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${executor?.username || "Unknown"}`,
              iconURL: `${executor?.displayAvatarURL() || ""}`,
            })
            .setColor(0x1e90ff)
            .setThumbnail(newEmoji.url || "")
            .setDescription(changes.join("\n"))
            .setFooter({
              text: this.client.user?.username || this.client.user?.tag || "Mewwme",
              iconURL:
                this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
            })
            .addFields(
              {
                name: "Name",
                value: `> **${oldEmoji.name} ➡️ ${newEmoji.name}**`,
                inline: false,
              },
              {
                name: "IDs",
                value: `
                > <:${newEmoji.name}:${newEmoji.id}> \`(${newEmoji.id})\`
                > <@${executor.id}> \`(${executor.id})\``,
                inline: false,
              }
            )
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
