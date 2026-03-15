import {
  Message,
  PartialMessage,
  EmbedBuilder,
  ReadonlyCollection,
  GuildTextBasedChannel,
  Snowflake,
  MessageReaction,
  User,
  PartialUser,
  PartialMessageReaction,
  AuditLogEvent,
} from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class MessageEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("messageDelete", this.handleMessageDelete.bind(this));
    this.client.on("messageUpdate", this.handleMessageUpdate.bind(this));
    this.client.on("messageDeleteBulk", this.handleMessageDeleteBulk.bind(this));
    this.client.on("messageReactionAdd", this.handleMessageReactionAdd.bind(this));
    this.client.on("messageReactionRemove", this.handleMessageReactionRemove.bind(this));
    this.client.on("messagePinned", this.handleMessagePinned.bind(this));
    this.client.on("messageUnpinned", this.handleMessageUnpinned.bind(this));
  }

  // Handle individual message deletion
  private async handleMessageDelete(message: Message<boolean> | PartialMessage) {
    if (!(await isEventEnabled(message.guild?.id || "", "messageDelete", this.client.db))) return;
    if (!message.guild || message.author?.bot) return;

    const logChannel = await getModLogChannel(message.guild.id, this.client);
    if (!logChannel) return;

    const content = message.partial
      ? "Message content not available (partial message)."
      : message.content || "No content (possibly an embed or file).";

    const embed = new EmbedBuilder()
      .setColor(0xff0000) // color red
      .setAuthor({
        name: `${message.author?.username || this.client.user?.username}`,
        iconURL: `${message.author?.displayAvatarURL() || this.client.user?.displayAvatarURL()}`,
      })
      .setTitle("Message Deleted")
      .setDescription(content.slice(0, 1024))
      .addFields(
        {
          name: "Message Date",
          value: message.createdTimestamp
            ? `<t:${Math.floor(message.createdTimestamp / 1000)}:F> (<t:${Math.floor(
                message.createdTimestamp / 1000
              )}:R>)`
            : "Unknown",
          inline: false,
        },
        {
          name: "IDs",
          value: `
  > Message (${message.id})
  > <#${message.channel.id}> (${message.channel.id})
  > <@${message.author?.id}> (${message.author?.id})
          `,
          inline: false,
        }
      )
      .setFooter({
        text: `${this.client.user?.username}`,
        iconURL: `${this.client.user?.displayAvatarURL()}`,
      })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  }

  // Handle bulk message deletion
  private async handleMessageDeleteBulk(
    messages: ReadonlyCollection<Snowflake, Message<boolean> | PartialMessage>,
    channel: GuildTextBasedChannel
  ) {
    const guild = channel.guild;
    if (!(await isEventEnabled(guild.id, "messageDeleteBulk", this.client.db))) return;

    const logChannel = await getModLogChannel(guild.id, this.client);
    if (!logChannel) return;

    const messageCount = messages.size;

    // Fetch Audit Log
    const auditLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MessageBulkDelete,
    });
    const auditEntry = auditLogs.entries.first();

    const executor = auditEntry?.executor;
    const reason = auditEntry?.reason || "No reason provided";

    // Send embed to log channel
    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000) // Red color
          .setAuthor({
            name: executor?.username || this.client.user?.username,
            iconURL: executor?.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setTitle("Multiple Messages Deleted")
          .setDescription(`**${messageCount}** messages were deleted in <#${channel.id}>`)
          .addFields(
            { name: "Reason", value: reason, inline: false },
            {
              name: "IDs",
              value: `> <#${channel.id}> (${channel.id})\n> ${executor ? `<@${executor.id}>` : "Unknown"} (${executor?.id || "Unknown"})`,
              inline: true,
            }
          )
          .setFooter({
            text: `${this.client.user?.tag}`,
            iconURL: `${this.client.user?.displayAvatarURL()}`,
          })
          .setTimestamp(),
      ],
    });
  }

  // Handle message updates/edits
  private async handleMessageUpdate(
    oldMessage: Message<boolean> | PartialMessage,
    newMessage: Message<boolean> | PartialMessage
  ) {
    if (!(await isEventEnabled(oldMessage.guild?.id || "", "messageUpdate", this.client.db)))
      return;
    if (!oldMessage.guild || oldMessage.author?.bot) return;

    const logChannel = await getModLogChannel(oldMessage.guild.id, this.client);
    if (!logChannel) return;

    const oldContent = oldMessage.partial
      ? "Message content not available (partial message)."
      : oldMessage.content || "No content";
    const newContent = newMessage.partial
      ? "Message content not available (partial message)."
      : newMessage.content || "No content";

    if (oldContent === newContent) return;
    const messageLink = `https://discord.com/channels/${oldMessage.guild.id}/${oldMessage.channel.id}/${oldMessage.id}`;

    const embed = new EmbedBuilder()
      .setColor(0x1e90ff) // Warna biru
      .setAuthor({
        name: `${oldMessage.author?.tag || "Unknown"}`,
        iconURL: `${oldMessage.author?.displayAvatarURL() || ""}`,
      })
      .addFields(
        { name: "📝 Message Edited", value: `${messageLink}`, inline: false },
        { name: "Old message", value: oldContent.slice(0, 1024), inline: false },
        { name: "New message", value: newContent.slice(0, 1024), inline: false },
        {
          name: "Message Date",
          value: `<t:${Math.floor(oldMessage.createdTimestamp / 1000)}:F> (<t:${Math.floor(
            oldMessage.createdTimestamp / 1000
          )}:R>)`,
          inline: false,
        },
        {
          name: "IDs",
          value: `
  > Message (${oldMessage.id})
  > <#${oldMessage.channel.id}> (${oldMessage.channel.id})
  > <@${oldMessage.author?.id}> (${oldMessage.author?.id})
          `,
          inline: false,
        }
      )
      .setFooter({
        text: `${this.client.user?.username || this.client.user?.tag}`,
        iconURL: `${this.client.user?.displayAvatarURL()}`,
      })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });
  }

  // Handle message reaction add (with partials)
  private async handleMessageReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    if (reaction.partial) await reaction.fetch(); // Fetch full reaction if partial
    if (user.partial) await user.fetch(); // Fetch full user if partial

    const guild = reaction.message.guild;
    if (!guild || !(await isEventEnabled(guild.id, "messageReactionAdd", this.client.db))) return;

    const logChannel = await getModLogChannel(guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setAuthor({
            name: user?.username || this.client.user?.username,
            iconURL: user?.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setTitle("Reaction Added")
          .setDescription(
            `**User:** <@${user.id}> added a reaction in <#${reaction.message.channel.id}>`
          )
          .addFields({ name: "Message", value: `[Jump to Message](${reaction.message.url})` })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle message reaction remove (with partials)
  private async handleMessageReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    if (reaction.partial) await reaction.fetch(); // Fetch full reaction if partial
    if (user.partial) await user.fetch(); // Fetch full user if partial

    const guild = reaction.message.guild;
    if (!guild || !(await isEventEnabled(guild.id, "messageReactionRemove", this.client.db)))
      return;

    const logChannel = await getModLogChannel(guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setAuthor({
            name: user?.username || this.client.user?.username,
            iconURL: user?.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setTitle("Reaction Removed")
          .setDescription(
            `**User:** <@${user.id}> removed a reaction in <#${reaction.message.channel.id}>`
          )
          .addFields({ name: "Message", value: `[Jump to Message](${reaction.message.url})` })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle message pinned
  private async handleMessagePinned(message: Message<boolean> | PartialMessage) {
    const guild = message.guild;
    if (!guild || !(await isEventEnabled(guild.id, "messagePinned", this.client.db))) return;

    const logChannel = await getModLogChannel(guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: message.author.username || this.client.user?.username,
            iconURL: message.author.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setColor(0xffd700)
          .setTitle("Message Pinned")
          .setDescription(`A message in <#${message.channel.id}> was pinned.`)
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle message unpinned
  private async handleMessageUnpinned(message: Message<boolean> | PartialMessage) {
    const guild = message.guild;
    if (!guild || !(await isEventEnabled(guild.id, "messageUnpinned", this.client.db))) return;

    const logChannel = await getModLogChannel(guild.id, this.client);
    if (!logChannel) return;

    await logChannel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: message.author.username || this.client.user?.username,
            iconURL: message.author.displayAvatarURL() || this.client.user?.displayAvatarURL(),
          })
          .setColor(0xffd700)
          .setTitle("Message Unpinned")
          .setDescription(`A message in <#${message.channel.id}> was unpinned.`)
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
