import {
  Message,
  PartialMessage,
  MessageReaction,
  PartialMessageReaction,
  User,
  PartialUser,
  TextChannel,
  NewsChannel,
  EmbedBuilder,
} from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class ReactionEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("messageReactionAdd", this.handleMessageReactionAdd.bind(this));
    this.client.on("messageReactionRemove", this.handleMessageReactionRemove.bind(this));
    this.client.on("messageReactionRemoveAll", this.handleMessageReactionRemoveAll.bind(this)); // Correct event
  }

  // Handle reaction added
  private async handleMessageReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    if (!reaction.message.guild || !user) return;
    const guildId = reaction.message.guild.id;

    if (!(await isEventEnabled(guildId, "messageReactionAdd", this.client.db))) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Failed to fetch the reaction:", error);
        return;
      }
    }

    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error("Failed to fetch the user:", error);
        return;
      }
    }

    const channel = await getModLogChannel(guildId, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: user.username,
            iconURL: user.avatarURL(),
          })
          .setColor(0x00ff00)
          .setTitle("👍 Reaction Added")
          .setDescription(
            `**User:** <@${user.id}> added a reaction to [this message](https://discord.com/channels/${guildId}/${reaction.message.channelId}/${reaction.message.id})`
          )
          .addFields(
            { name: "Reaction", value: `${reaction.emoji.name}`, inline: true },
            { name: "Channel", value: `<#${reaction.message.channelId}>`, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user.displayAvatarURL(),
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle reaction removed
  private async handleMessageReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser
  ) {
    if (!reaction.message.guild || !user) return;
    const guildId = reaction.message.guild.id;

    if (!(await isEventEnabled(guildId, "messageReactionRemove", this.client.db))) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error("Failed to fetch the reaction:", error);
        return;
      }
    }

    if (user.partial) {
      try {
        await user.fetch();
      } catch (error) {
        console.error("Failed to fetch the user:", error);
        return;
      }
    }

    const channel = await getModLogChannel(guildId, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: user.username,
            iconURL: user.displayAvatarURL(),
          })
          .setColor(0xff0000)
          .setTitle("👎 Reaction Removed")
          .setDescription(
            `**User:** <@${user.id}> removed a reaction from [this message](https://discord.com/channels/${guildId}/${reaction.message.channelId}/${reaction.message.id})`
          )
          .addFields(
            { name: "Reaction", value: `${reaction.emoji.name}`, inline: true },
            { name: "Channel", value: `<#${reaction.message.channelId}>`, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user.displayAvatarURL(),
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle all reactions removed from a message
  private async handleMessageReactionRemoveAll(message: Message<boolean> | PartialMessage) {
    if (!message.guild) return;
    const guildId = message.guild.id;

    if (!(await isEventEnabled(guildId, "messageReactionRemoveAll", this.client.db))) return;

    const channel = await getModLogChannel(guildId, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: message.author.username,
            iconURL: message.author.displayAvatarURL(),
          })
          .setColor(0xffa500)
          .setTitle("🚫 All Reactions Removed")
          .setDescription(
            `All reactions were removed from [this message](https://discord.com/channels/${guildId}/${message.channelId}/${message.id})`
          )
          .addFields({ name: "Channel", value: `<#${message.channelId}>`, inline: true })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL: this.client.user.displayAvatarURL(),
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
