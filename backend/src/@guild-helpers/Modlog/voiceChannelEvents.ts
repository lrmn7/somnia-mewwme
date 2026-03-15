import { VoiceState, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class VoiceChannelEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("voiceStateUpdate", this.handleVoiceStateUpdate.bind(this));
  }

  // Voice Channel Join/Leave/Switch
  private async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const guild = oldState.guild || newState.guild;
    if (!guild) return;

    const event =
      oldState.channelId && !newState.channelId
        ? "voiceChannelLeave"
        : newState.channelId && !oldState.channelId
          ? "voiceChannelJoin"
          : oldState.channelId !== newState.channelId
            ? "voiceChannelSwitch"
            : null;

    if (event && (await isEventEnabled(guild.id, event, this.client.db))) {
      const channel = await getModLogChannel(guild.id, this.client);
      if (channel) {
        const member = newState.member || oldState.member;
        const targetChannel = newState.channel || oldState.channel;

        // Define colors for each event
        const colors = {
          voiceChannelJoin: 0x00ff00, // Green
          voiceChannelLeave: 0xff0000, // Red
          voiceChannelSwitch: 0x1e90ff, // Blue
        };

        const embed = new EmbedBuilder()
          .setColor(colors[event as keyof typeof colors])
          .setAuthor({
            name: `${member?.user.username}`,
            iconURL: `${member?.user.displayAvatarURL()}`,
          })
          .setFooter({
            text: `${this.client.user?.username}`,
            iconURL: `${this.client.user?.displayAvatarURL()}`,
          })
          .setTimestamp();

        if (event === "voiceChannelSwitch") {
          const oldChannel = oldState.channel;
          embed
            .setDescription(
              `**<@${member?.user.id}>** was moved.\n\n > ${oldChannel ? `**<#${oldChannel.id}>**` : "Unknown"} → ${targetChannel ? `**<#${targetChannel.id}>**` : "Unknown"}`
            )
            .addFields({
              name: "IDs",
              value: `
              > <@${member?.id}> (${member?.id})
              > ${oldChannel ? `**<#${oldChannel.id}>** (${oldChannel.id})` : "Unknown"}
              > ${targetChannel ? `**<#${targetChannel.id}>** (${targetChannel.id})` : "Unknown"}`,
            });
        } else {
          embed
            .setDescription(
              `${
                event === "voiceChannelJoin"
                  ? "📥 **Joined Voice Channel**"
                  : "📤 **Left Voice Channel**"
              } ${targetChannel ? `**<#${targetChannel.id}>**` : "Unknown"}`
            )
            .addFields({
              name: "IDs",
              value: `
              > <@${member?.id}> (${member?.id})
              > ${targetChannel ? `**<#${targetChannel.id}>** (${targetChannel.id})` : "Unknown"}`,
            });
        }

        await channel.send({ embeds: [embed] });
      }
    }

    // Self Mute/Unmute
    if (oldState.selfMute !== newState.selfMute) {
      const muteEvent = newState.selfMute ? "voiceSelfMute" : "voiceSelfUnmute";
      if (await isEventEnabled(guild.id, muteEvent, this.client.db)) {
        const channel = await getModLogChannel(guild.id, this.client);
        if (channel) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xffa500)
                .setTitle(`🔇 ${newState.selfMute ? "Self Muted" : "Self Unmuted"}`)
                .setDescription(`**User:** <@${newState.member?.id}>`)
                .setTimestamp(new Date()),
            ],
          });
        }
      }
    }

    // Server Mute/Unmute
    if (oldState.serverMute !== newState.serverMute) {
      const muteEvent = newState.serverMute ? "voiceServerMute" : "voiceServerUnmute";
      if (await isEventEnabled(guild.id, muteEvent, this.client.db)) {
        const channel = await getModLogChannel(guild.id, this.client);
        if (channel) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xff4500)
                .setTitle(`🔇 ${newState.serverMute ? "Server Muted" : "Server Unmuted"}`)
                .setDescription(`**User:** <@${newState.member?.id}>`)
                .setTimestamp(new Date()),
            ],
          });
        }
      }
    }

    // Self Deaf/Undeaf
    if (oldState.selfDeaf !== newState.selfDeaf) {
      const deafEvent = newState.selfDeaf ? "voiceSelfDeaf" : "voiceSelfUndeaf";
      if (await isEventEnabled(guild.id, deafEvent, this.client.db)) {
        const channel = await getModLogChannel(guild.id, this.client);
        if (channel) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xff69b4)
                .setTitle(`🔇 ${newState.selfDeaf ? "Self Deafened" : "Self Undeafened"}`)
                .setDescription(`**User:** <@${newState.member?.id}>`)
                .setTimestamp(new Date()),
            ],
          });
        }
      }
    }

    // Server Deaf/Undeaf
    if (oldState.serverDeaf !== newState.serverDeaf) {
      const deafEvent = newState.serverDeaf ? "voiceServerDeaf" : "voiceServerUndeaf";
      if (await isEventEnabled(guild.id, deafEvent, this.client.db)) {
        const channel = await getModLogChannel(guild.id, this.client);
        if (channel) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0xff69b4)
                .setTitle(`🔇 ${newState.serverDeaf ? "Server Deafened" : "Server Undeafened"}`)
                .setDescription(`**User:** <@${newState.member?.id}>`)
                .setTimestamp(new Date()),
            ],
          });
        }
      }
    }

    // Streaming/Stop Streaming
    if (oldState.streaming !== newState.streaming) {
      const streamEvent = newState.streaming ? "voiceStartStreaming" : "voiceStopStreaming";
      if (await isEventEnabled(guild.id, streamEvent, this.client.db)) {
        const channel = await getModLogChannel(guild.id, this.client);
        if (channel) {
          await channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor(0x9400d3)
                .setTitle(`🎥 ${newState.streaming ? "Started Streaming" : "Stopped Streaming"}`)
                .setDescription(`**User:** <@${newState.member?.id}>`)
                .setTimestamp(new Date()),
            ],
          });
        }
      }
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
