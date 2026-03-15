import {
  Channel,
  TextBasedChannel,
  EmbedBuilder,
  GuildChannel,
  OverwriteType,
  ThreadChannel,
  VoiceChannel,
  NewsChannel,
  TextChannel,
  AuditLogEvent,
} from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class ChannelEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("channelCreate", this.handleChannelCreate.bind(this));
    this.client.on("channelDelete", this.handleChannelDelete.bind(this));
    this.client.on("channelUpdate", async (oldChannel, newChannel) => {
      if (oldChannel instanceof GuildChannel && newChannel instanceof GuildChannel) {
        await this.handleChannelUpdate(oldChannel, newChannel);
        await this.handleChannelOverwriteUpdate(oldChannel, newChannel);
        await this.handleChannelSlowmodeUpdate(oldChannel, newChannel);
        await this.handleChannelNSFWToggle(oldChannel, newChannel);
      }
    });
    this.client.on("channelPinsUpdate", this.handleChannelPinsUpdate.bind(this));
    this.client.on("permissionOverwriteCreate", this.handlePermissionOverwriteCreate.bind(this));
    this.client.on("webhookUpdate", this.handleWebhookUpdate.bind(this));
    this.client.on("threadUpdate", this.handleThreadUpdate.bind(this)); // Removed typingStart event
  }

  // Handle channel creation event
  private async handleChannelCreate(channel: Channel) {
    if (!(channel instanceof GuildChannel)) return;
    if (!(await isEventEnabled(channel.guild.id, "channelCreate", this.client.db))) return;

    const logChannel = await getModLogChannel(channel.guild.id, this.client);
    if (!logChannel) return;

    let executor = null;
    try {
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelCreate,
        limit: 1,
      });
      const logEntry = auditLogs.entries.first();
      if (logEntry && logEntry.target?.id === channel.id) {
        executor = logEntry.executor;
      }
    } catch (error) {
      this.client.logger.error(ChannelEventsHandler.name, "Failed to fetch audit logs");
    }

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setAuthor({
            name: executor
              ? executor.username
              : executor.username || this.client.user.tag || "Unknown",
            iconURL: executor?.displayAvatarURL() || this.client.user.displayAvatarURL(),
          })
          .setDescription(
            `**Channel Create**\n${"name" in channel ? channel.name : "Unknown"} (${channel.id})`
          )
          .addFields({
            name: "**IDs**",
            value: `
            > ${"name" in channel ? `<#${channel.id}>` : "Unknown"} (${channel.id})
            > ${executor ? `<@${executor.id}>` : executor.username || "Unknown"} (${executor ? executor.id : executor.username || "Unknown"})`,
            inline: true,
          })
          .setFooter({
            text: this.client.user?.username || this.client.user.tag || "Unknown",
            iconURL: this.client.user.displayAvatarURL(),
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle channel deletion event
  private async handleChannelDelete(channel: Channel) {
    if (!(channel instanceof GuildChannel)) return;
    if (!(await isEventEnabled(channel.guild.id, "channelDelete", this.client.db))) return;

    const logChannel = await getModLogChannel(channel.guild.id, this.client);
    if (!logChannel) return;

    let executor = null;
    try {
      const auditLogs = await channel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelDelete,
        limit: 1,
      });
      const logEntry = auditLogs.entries.first();
      if (logEntry && logEntry.target?.id === channel.id) {
        executor = logEntry.executor;
      }
    } catch (error) {
      this.client.logger.error(ChannelEventsHandler.name, "Failed to fetch audit logs");
    }
    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setAuthor({
            name: executor
              ? executor.username
              : executor.username || this.client.user.tag || "Unknown",
            iconURL: executor?.displayAvatarURL() || this.client.user.displayAvatarURL(),
          })
          .setDescription(
            `**Channel Deleted**\n${"name" in channel ? channel.name : "Unknown"} (${channel.id})`
          )
          .addFields({
            name: "**IDs**",
            value: `
            > ${"name" in channel ? `<#${channel.id}>` : "Unknown"} (${channel.id})
            > ${executor ? `<@${executor.id}>` : executor.username || "Unknown"} (${executor ? executor.id : executor.username || "Unknown"})`,
            inline: true,
          })
          .setFooter({
            text: this.client.user?.username || this.client.user.tag || "Unknown",
            iconURL: this.client.user.displayAvatarURL(),
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle channel update event
  private async handleChannelUpdate(oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!(await isEventEnabled(newChannel.guild.id, "channelUpdate", this.client.db))) return;

    const logChannel = await getModLogChannel(newChannel.guild.id, this.client);
    if (!logChannel) return;

    let executor = null;

    try {
      const auditLogs = await newChannel.guild.fetchAuditLogs({
        type: AuditLogEvent.ChannelUpdate,
        limit: 1,
      });
      const logEntry = auditLogs.entries.first();
      executor = logEntry?.executor;
    } catch (error) {
      this.client.logger.error(ChannelEventsHandler.name, "Failed to fetch audit logs");
    }

    const changes = [];

    if (oldChannel.name !== newChannel.name) {
      changes.push(`**${oldChannel.name}** ➡️ **${newChannel.name}**`);
    }

    if (changes.length > 0) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setAuthor({
              name: executor ? executor.username : "Unknown",
              iconURL: executor?.displayAvatarURL() || null,
            })
            .setDescription(
              [
                "**Channel Edit**",
                ...changes.map((change) => `> ${change}`), // Menambahkan indentasi untuk setiap perubahan
                "",
                "**IDs**",
                `> <#${newChannel.id}> (${newChannel.id})`,
                executor
                  ? `> <@${executor.id}> (${executor.id})`
                  : `> ${this.client.user?.username || "Unknown Bot"}`,
              ].join("\n")
            )
            .setFooter({
              text: `${this.client.user?.username || "Unknown Bot"}`,
              iconURL:
                this.client.user?.displayAvatarURL() ||
                this.client.user?.displayAvatarURL({ extension: "png" }),
            })
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // Handle permission overwrites update
  private async handleChannelOverwriteUpdate(oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!(await isEventEnabled(newChannel.guild.id, "channelOverwriteUpdate", this.client.db)))
      return;

    const changes: string[] = [];
    const memberDetails: { name: string; avatar: string }[] = [];

    for (const [id, overwrite] of oldChannel.permissionOverwrites.cache) {
      const newOverwrite = newChannel.permissionOverwrites.cache.get(id);
      if (!newOverwrite) {
        changes.push(
          `**Permissions removed for:** ${
            overwrite.type === OverwriteType.Member ? `<@${id}>` : `<@&${id}>`
          }`
        );
      } else if (
        overwrite.allow.bitfield !== newOverwrite.allow.bitfield ||
        overwrite.deny.bitfield !== newOverwrite.deny.bitfield
      ) {
        changes.push(
          `**Permissions changed for:** ${
            overwrite.type === OverwriteType.Member ? `<@${id}>` : `<@&${id}>`
          }`
        );

        // Fetch user info if it's a member overwrite
        if (overwrite.type === OverwriteType.Member) {
          try {
            const member = await newChannel.guild.members.fetch(id);
            memberDetails.push({
              name: member.user.tag,
              avatar: member.user.displayAvatarURL(),
            });
          } catch {
            memberDetails.push({
              name: `Unknown User (${id})`,
              avatar: this.client.user.displayAvatarURL(),
            });
          }
        }
      }
    }

    if (changes.length > 0) {
      const logChannel = await getModLogChannel(newChannel.guild.id, this.client);
      if (!logChannel) return;

      const authorDetails = memberDetails[0] || {
        name: "Unknown",
        avatar: this.client.user.displayAvatarURL(),
      };

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setAuthor({
              name: authorDetails.name,
              iconURL: authorDetails.avatar,
            })
            .setThumbnail(authorDetails.avatar || this.client.user?.displayAvatarURL())
            .setDescription(`**Channel Permissions Updated**\n <#${newChannel.id}>`)
            .addFields({ name: "Changes", value: changes.join("\n"), inline: false })
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

  // Handle slowmode update
  private async handleChannelSlowmodeUpdate(oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!(await isEventEnabled(newChannel.guild.id, "channelSlowmodeUpdate", this.client.db)))
      return;

    if ("rateLimitPerUser" in oldChannel && "rateLimitPerUser" in newChannel) {
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) {
        const logChannel = await getModLogChannel(newChannel.guild.id, this.client);
        if (!logChannel) return;

        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x1e90ff)
              .setTitle("🐢 Slowmode Updated")
              .setDescription(
                `**Channel:** <#${newChannel.id}>\n**Old Slowmode:** ${oldChannel.rateLimitPerUser} seconds\n**New Slowmode:** ${newChannel.rateLimitPerUser} seconds`
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
  }

  // Handle NSFW toggle
  private async handleChannelNSFWToggle(oldChannel: GuildChannel, newChannel: GuildChannel) {
    if (!(await isEventEnabled(newChannel.guild.id, "channelNSFWToggle", this.client.db))) return;

    if ("nsfw" in oldChannel && "nsfw" in newChannel) {
      if (oldChannel.nsfw !== newChannel.nsfw) {
        const logChannel = await getModLogChannel(newChannel.guild.id, this.client);
        if (!logChannel) return;

        const status = newChannel.nsfw ? "marked as NSFW" : "unmarked as NSFW";

        await logChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff4500)
              .setTitle("🔞 Channel NSFW Status Updated")
              .setDescription(`**Channel:** <#${newChannel.id}> is now ${status}`)
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
  }

  // Handle channel pins update event
  private async handleChannelPinsUpdate(channel: TextBasedChannel, time: Date) {
    // Ensure it's a guild-based channel
    if (!("guild" in channel)) return;

    const guild = (channel as TextChannel | NewsChannel | ThreadChannel | VoiceChannel).guild;
    if (!guild) return;

    if (!(await isEventEnabled(guild.id, "channelPinsUpdate", this.client.db))) return;

    const logChannel = await getModLogChannel(guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle("📌 Channel Pins Updated")
          .setDescription(`Pins were updated in **<#${channel.id}>** at ${time.toISOString()}`)
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle permission overwrite creation event
  private async handlePermissionOverwriteCreate(channel: GuildChannel, overwrite: any) {
    if (!(await isEventEnabled(channel.guild.id, "channelOverwriteCreate", this.client.db))) return;

    const logChannel = await getModLogChannel(channel.guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("🔧 Permission Overwrite Created")
          .setDescription(`A permission overwrite was created for **<#${channel.id}>**`)
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle webhook update event
  private async handleWebhookUpdate(channel: GuildChannel) {
    if (!(await isEventEnabled(channel.guild.id, "webhookUpdate", this.client.db))) return;

    const logChannel = await getModLogChannel(channel.guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffa500)
          .setTitle("🔧 Webhook Updated")
          .setDescription(`A webhook in **<#${channel.id}>** was updated.`)
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle thread update event
  private async handleThreadUpdate(oldThread: ThreadChannel, newThread: ThreadChannel) {
    if (!(await isEventEnabled(newThread.guild.id, "threadUpdate", this.client.db))) return;

    const logChannel = await getModLogChannel(newThread.guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("🧵 Thread Updated")
          .setDescription(`Thread **<#${newThread.id}>** was updated.`)
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
