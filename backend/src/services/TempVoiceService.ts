import { Manager } from "../manager.js";
import {
  VoiceState,
  ChannelType,
  VoiceChannel,
  StageChannel,
  PermissionsBitField,
} from "discord.js";
import { TempVoiceChannel } from "../database/schema/TempVoiceChannel.js";

export default class TempVoiceService {
  private static readonly MAX_CHANNELS_PER_USER = 1; // Maximum number of channels a user can create

  public async init(client: Manager) {
    // Load all active temporary voice channels from the database
    const allChannels = await client.db.TempVoiceChannel.all();

    for (const entry of allChannels) {
      const tempVoiceChannel = entry.value;
      const guild = client.guilds.cache.get(tempVoiceChannel.guildId);
      if (!guild) continue;

      const tempChannel = guild.channels.cache.get(tempVoiceChannel.channelId);

      if (tempChannel instanceof VoiceChannel) {
        if (tempChannel.members.size === 0) {
          // If the channel is empty, delete it and remove it from the database
          await tempChannel.delete("Temporary voice channel expired");
          await client.db.TempVoiceChannel.delete(tempVoiceChannel.id);
        } else {
          // Otherwise, re-establish monitoring for the channel
          this.monitorChannel(tempChannel, tempVoiceChannel.id, client);
        }
      } else {
        // If the channel no longer exists, remove it from the database
        await client.db.TempVoiceChannel.delete(tempVoiceChannel.id);
      }
    }
  }

  private async monitorChannel(channel: VoiceChannel, channelId: string, client: Manager) {
    const checkEmpty = async () => {
      const updatedChannel = channel.guild.channels.cache.get(channel.id); // Refresh channel cache
      if (
        updatedChannel &&
        updatedChannel instanceof VoiceChannel &&
        updatedChannel.members.size === 0
      ) {
        try {
          await updatedChannel.delete("Temporary voice channel expired");
          await client.db.TempVoiceChannel.delete(channelId);
        } catch (error) {
          if ((error as Error).message !== "Unknown Channel") {
            client.logger.error(TempVoiceService.name, `Error deleting temp channel`);
          }
        }
      }
    };

    // Monitor the channel periodically and immediately after each state update
    setInterval(checkEmpty, 5 * 60 * 1000); // Check every 5 minutes
    channel.guild.client.on(
      "voiceStateUpdate",
      async (oldState: VoiceState, newState: VoiceState) => {
        if (oldState.channelId === channel.id && oldState.channel?.members.size === 0) {
          await checkEmpty();
        }
      }
    );
  }

  public async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState, client: Manager) {
    const guildId = newState.guild.id;
    const userId = newState.member?.id;

    // Check if Temp Voice is enabled
    const guildSettings = await client.db.TempVoiceChannelSetting.get(guildId);
    if (!guildSettings?.tempVoiceEnabled || !guildSettings.createVoiceChannelId) return;

    // Check if the user joined the "Create Voice Channel"
    if (newState.channelId === guildSettings.createVoiceChannelId) {
      // Get all active channels for this user in this guild
      const allChannels = await client.db.TempVoiceChannel.all();
      const userChannels = allChannels.filter(
        (entry) => entry.value.guildId === guildId && entry.value.ownerId === userId
      );

      // If the user already has an active channel
      if (userChannels.length >= TempVoiceService.MAX_CHANNELS_PER_USER) {
        const existingChannelId = userChannels[0].value.channelId;
        const existingChannel = newState.guild.channels.cache.get(existingChannelId);

        if (existingChannel instanceof VoiceChannel || existingChannel instanceof StageChannel) {
          // Move the user to the existing channel
          await newState.member?.voice.setChannel(existingChannel);
        }
        return;
      }

      // Ensure a valid channel name is used
      const channelName = `${newState.member?.displayName || "User"}'s Channel`;

      // Create a new temporary voice channel with the correct permissions
      const tempChannel = await newState.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: newState.channel?.parentId,
        permissionOverwrites: [
          {
            id: newState.guild.roles.everyone,
            allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak], // Allow everyone to connect and speak
          },
          {
            id: userId!, // Allow the channel creator to manage the channel
            allow: [
              PermissionsBitField.Flags.ManageChannels,
              PermissionsBitField.Flags.MuteMembers,
              PermissionsBitField.Flags.DeafenMembers,
            ],
          },
        ],
      });

      // Move the user to the new channel
      await newState.member?.voice.setChannel(tempChannel);

      // Store the temp channel in the database
      const tempVoiceChannel: TempVoiceChannel = {
        id: `${guildId}-${userId}-${Date.now()}`,
        ownerId: userId!,
        guildId,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour expiration
        channelId: tempChannel.id,
      };

      await client.db.TempVoiceChannel.set(tempVoiceChannel.id, tempVoiceChannel);

      // Start monitoring the newly created channel
      this.monitorChannel(tempChannel, tempVoiceChannel.id, client);
    }

    // Check if the user left a temporary voice channel and if it's empty
    if (oldState.channelId && !newState.channelId) {
      const allChannels = await client.db.TempVoiceChannel.all();
      const tempVoiceChannel = allChannels.find(
        (channel) => channel.value.channelId === oldState.channelId
      );
      const tempChannel = oldState.guild.channels.cache.get(oldState.channelId);

      if (
        tempVoiceChannel &&
        tempChannel instanceof VoiceChannel &&
        tempChannel.members.size === 0
      ) {
        try {
          await tempChannel.delete("Temporary voice channel expired");
          await client.db.TempVoiceChannel.delete(tempVoiceChannel.id);
        } catch (error) {
          if ((error as Error).message !== "Unknown Channel") {
            client.logger.error(TempVoiceService.name, `Error deleting temp channel`);
          }
        }
      }
    }
  }
}
