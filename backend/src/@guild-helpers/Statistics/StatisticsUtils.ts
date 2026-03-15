import { Manager } from "../../manager.js";
import { VoiceState, MessageReaction, User } from "discord.js";

// Function to update message count
export async function updateMessageCount(guildId: string, userId: string, client: Manager) {
  const stats = await client.db.UserStatistics.get(`${userId}`); // Get existing stats using key
  const today = new Date().setHours(0, 0, 0, 0); // Start of today's date (midnight)

  if (stats) {
    // Update existing stats
    stats.messageCount += 1;

    // Set the first message date if it's not already set
    if (!stats.firstMessageDate) {
      stats.firstMessageDate = Date.now();
    }

    // Check if the user has been active today
    if (stats.lastActiveDay !== today) {
      stats.daysActive = (stats.daysActive || 0) + 1; // Increment days active
      stats.lastActiveDay = today; // Update last active day to today
    }

    stats.lastUpdated = Date.now(); // Update timestamp
    await client.db.UserStatistics.set(`${userId}`, stats); // Save the updated stats
  } else {
    // Create a new entry if the user has no stats yet
    await client.db.UserStatistics.set(`${userId}`, {
      guildId,
      userId,
      messageCount: 1,
      voiceTime: 0,
      reactionCount: 0,
      topChannels: {}, // Initialize topChannels
      voiceJoinTime: null,
      lastUpdated: Date.now(),
      joinDate:
        client.guilds.cache.get(guildId)?.members.cache.get(userId)?.joinedTimestamp || Date.now(),
      daysActive: 1,
      firstMessageDate: Date.now(),
      lastActiveDay: today, // Initialize with today's date
    });
  }
}

// Function to calculate and update voice time
export async function updateVoiceTime(oldState: VoiceState, newState: VoiceState, client: Manager) {
  const userId = newState.id;
  const guildId = newState.guild?.id;

  // If the user is joining a voice channel
  if (!oldState.channelId && newState.channelId) {
    const stats = await client.db.UserStatistics.get(`${userId}`);

    if (stats) {
      // Store the join time in the database
      stats.voiceJoinTime = Date.now();
      stats.lastUpdated = Date.now();
      await client.db.UserStatistics.set(`${userId}`, stats);
    } else {
      // If no stats exist, create a new record
      await client.db.UserStatistics.set(`${userId}`, {
        guildId,
        userId,
        messageCount: 0,
        voiceTime: 0,
        reactionCount: 0,
        topChannels: {}, // Initialize topChannels
        voiceJoinTime: Date.now(), // Set the join time
        lastUpdated: Date.now(),
        joinDate:
          client.guilds.cache.get(guildId)?.members.cache.get(userId)?.joinedTimestamp ||
          Date.now(),
        daysActive: 0,
        firstMessageDate: null,
      });
    }
  }

  // If the user is leaving the voice channel
  if (oldState.channelId && !newState.channelId) {
    const stats = await client.db.UserStatistics.get(`${userId}`);

    if (stats && stats.voiceJoinTime) {
      // Calculate the time spent in the voice channel
      const timeSpent = (Date.now() - stats.voiceJoinTime) / 60000; // Convert to minutes

      // Update voice time and reset voiceJoinTime
      stats.voiceTime += timeSpent;
      stats.voiceJoinTime = null; // Reset join time
      stats.lastUpdated = Date.now();

      // Save the updated stats
      await client.db.UserStatistics.set(`${userId}`, stats);
    }
  }
}

// Function to update reaction count
export async function updateReactionStats(reaction: MessageReaction, user: User, client: Manager) {
  const guild = reaction.message.guild;
  if (!guild) return; // Exit if there's no guild (e.g., a DM)

  const guildId = guild.id;
  const userId = user.id;

  const stats = await client.db.UserStatistics.get(`${userId}`); // Get existing stats

  if (stats) {
    stats.reactionCount += 1;
    stats.lastUpdated = Date.now(); // Update timestamp
    await client.db.UserStatistics.set(`${userId}`, stats); // Save updated stats
  } else {
    // If user has no stats yet, create a new entry
    await client.db.UserStatistics.set(`${userId}`, {
      guildId,
      userId,
      messageCount: 0,
      voiceTime: 0,
      reactionCount: 1,
      topChannels: {},
      voiceJoinTime: null,
      lastUpdated: Date.now(),
      joinDate:
        client.guilds.cache.get(guildId)?.members.cache.get(userId)?.joinedTimestamp || Date.now(),
      daysActive: 0,
      firstMessageDate: null,
    });
  }
}

// Function to update top channels stats (message count per channel)
export async function updateTopChannelsStats(
  guildId: string,
  userId: string,
  channelId: string,
  client: Manager
) {
  const stats = await client.db.UserStatistics.get(`${userId}`);

  if (stats) {
    // Update the message count for the current channel
    stats.topChannels[channelId] = (stats.topChannels[channelId] || 0) + 1;
    stats.lastUpdated = Date.now(); // Update timestamp

    await client.db.UserStatistics.set(`${userId}`, stats);
  } else {
    // If user has no stats yet, create a new entry
    await client.db.UserStatistics.set(`${userId}`, {
      guildId,
      userId,
      messageCount: 0,
      voiceTime: 0,
      reactionCount: 0,
      topChannels: { [channelId]: 1 },
      voiceJoinTime: null,
      lastUpdated: Date.now(),
      joinDate:
        client.guilds.cache.get(guildId)?.members.cache.get(userId)?.joinedTimestamp || Date.now(),
      daysActive: 0,
      firstMessageDate: null,
    });
  }
}
