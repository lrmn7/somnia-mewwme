import {
  EmbedBuilder,
  ApplicationCommandOptionType,
  CommandInteraction,
  Guild,
  Snowflake,
  GuildTextBasedChannel,
  Message,
  User,
} from "discord.js";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { UserStatistics } from "../../database/schema/UserStatistics.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["statistics", "user"];
  public description = "Displays your activity statistics.";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.StatisticUser;
  public usage = "<user> or <user1> <user2>";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "user1",
      type: ApplicationCommandOptionType.User,
      description: "The first user to display stats for.",
      required: false,
    },
    {
      name: "user2",
      type: ApplicationCommandOptionType.User,
      description: "The second user to compare stats with.",
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;

    // Parse the options
    // @ts-ignore
    const user1 = interaction.options.get("user1")?.user || interaction.user;
    // @ts-ignore
    const user2 = interaction.options.get("user2")?.user || null;

    await handler.deferReply();

    const guildId = handler.guild?.id;

    // Fetch stats for the first user
    const user1Stats = await fetchUserStats(client, guildId, user1.id, interaction.guild);

    if (user2) {
      // Fetch stats for the second user if provided
      const user2Stats = await fetchUserStats(client, guildId, user2.id, interaction.guild);

      // Compare stats
      const comparisonEmbed = buildComparisonEmbed(user1, user1Stats, user2, user2Stats, client);
      await handler.editReply({ embeds: [comparisonEmbed] });
    } else {
      // Display stats for the single user
      const statsEmbed = buildStatsEmbed(user1, user1Stats, client);
      await handler.editReply({ embeds: [statsEmbed] });
    }
  }
}

// Function to fetch user statistics from the database
async function fetchUserStats(client: Manager, guildId: string, userId: string, guild: Guild) {
  let stats = await client.db.UserStatistics.get(`${userId}`);

  if (!stats) {
    const today = new Date().setHours(0, 0, 0, 0);
    const member = await guild.members.fetch(userId).catch(() => null);
    stats = {
      guildId,
      userId,
      messageCount: 0,
      voiceTime: 0,
      reactionCount: 0,
      topChannels: {},
      voiceJoinTime: null,
      lastUpdated: Date.now(),
      joinDate: member?.joinedTimestamp || Date.now(),
      daysActive: 0,
      firstMessageDate: null,
      lastActiveDay: today,
    };
    await client.db.UserStatistics.set(`${userId}`, stats);
  }

  // Fetch first message date if missing
  if (!stats.firstMessageDate) {
    const firstMessageDate = await fetchFirstMessageDate(guild, userId);
    stats.firstMessageDate =
      firstMessageDate !== "N/A" ? new Date(firstMessageDate).getTime() : null;
    await client.db.UserStatistics.set(`${userId}`, stats);
  }

  return stats;
}

// Function to build an embed for a single user's stats
function buildStatsEmbed(user: User, stats: UserStatistics, client: Manager) {
  const topChannels =
    Object.entries(stats.topChannels || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([channel, count]) => `• <#${channel}>: \`${count} messages\``)
      .join("\n") || "No channel data";

  return new EmbedBuilder()
    .setDescription(`**Stats for <@${user.id}>**`) // Mention properly in description
    .setColor(client.color_main)
    .setThumbnail(user.displayAvatarURL({ size: 512 }))
    .addFields(
      { name: "Messages Sent", value: `\`${stats.messageCount}\``, inline: true },
      { name: "Time in Voice Channels", value: `\`${formatTime(stats.voiceTime)}\``, inline: true },
      { name: "Reactions", value: `\`${stats.reactionCount}\``, inline: true },
      { name: "Top Active Channels", value: topChannels, inline: true },
      { name: "Days Active", value: `\`${stats.daysActive}\``, inline: true },
      {
        name: "Join Date",
        value: stats.joinDate
          ? `<t:${Math.floor(stats.joinDate / 1000)}:F> (<t:${Math.floor(
              stats.joinDate / 1000
            )}:R>)`
          : "Unknown",
        inline: false,
      },
      {
        name: "First Message Date",
        value: stats.firstMessageDate
          ? `<t:${Math.floor(stats.firstMessageDate / 1000)}:F> (<t:${Math.floor(
              stats.firstMessageDate / 1000
            )}:R>)`
          : "N/A",
        inline: false,
      }
    );
}

// Function to build an embed for comparing two users' stats
function buildComparisonEmbed(
  user1: User,
  stats1: UserStatistics,
  user2: User,
  stats2: UserStatistics,
  client: Manager
) {
  const topChannelsUser1 =
    Object.entries(stats1.topChannels || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([channel, count]) => `• <#${channel}>: \`${count} messages\``)
      .join("\n") || "No channel data";

  const topChannelsUser2 =
    Object.entries(stats2.topChannels || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([channel, count]) => `• <#${channel}>: \`${count} messages\``)
      .join("\n") || "No channel data";

  return new EmbedBuilder()
    .setColor(client.color_main)
    .setThumbnail(client.user?.displayAvatarURL({ size: 512 }))
    .addFields(
      {
        name: `Stats`,
        value: `**<@${user1.id}>'s Stats**`,
        inline: false,
      }, // Move mention to the value for proper rendering
      { name: "Messages Sent", value: `\`${stats1.messageCount}\``, inline: true },
      {
        name: "Time in Voice Channels",
        value: `\`${formatTime(stats1.voiceTime)}\``,
        inline: true,
      },
      { name: "Reactions", value: `\`${stats1.reactionCount}\``, inline: true },
      { name: "Top Active Channels", value: topChannelsUser1, inline: true },
      { name: "Days Active", value: `\`${stats1.daysActive}\``, inline: true },
      {
        name: "Join Date",
        value: stats1.joinDate
          ? `<t:${Math.floor(stats1.joinDate / 1000)}:F> (<t:${Math.floor(
              stats1.joinDate / 1000
            )}:R>)`
          : "Unknown",
        inline: false,
      },
      {
        name: "First Message Date",
        value: stats1.firstMessageDate
          ? `<t:${Math.floor(stats1.firstMessageDate / 1000)}:F> (<t:${Math.floor(
              stats1.firstMessageDate / 1000
            )}:R>)`
          : "N/A",
        inline: false,
      },
      {
        name: "\u200b",
        value: "\u200b",
        inline: false,
      },
      {
        name: `Stats`,
        value: `**<@${user2.id}>'s Stats**`,
        inline: false,
      },
      { name: "Messages Sent", value: `\`${stats2.messageCount}\``, inline: true },
      {
        name: "Time in Voice Channels",
        value: `\`${formatTime(stats2.voiceTime)}\``,
        inline: true,
      },
      { name: "Reactions", value: `\`${stats2.reactionCount}\``, inline: true },
      { name: "Top Active Channels", value: topChannelsUser2, inline: true },
      { name: "Days Active", value: `\`${stats2.daysActive}\``, inline: true },
      {
        name: "Join Date",
        value: stats2.joinDate
          ? `<t:${Math.floor(stats2.joinDate / 1000)}:F> (<t:${Math.floor(
              stats2.joinDate / 1000
            )}:R>)`
          : "Unknown",
        inline: false,
      },
      {
        name: "First Message Date",
        value: stats2.firstMessageDate
          ? `<t:${Math.floor(stats2.firstMessageDate / 1000)}:F> (<t:${Math.floor(
              stats2.firstMessageDate / 1000
            )}:R>)`
          : "N/A",
        inline: false,
      }
    );
}

// Utility functions
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  return `${hours}h ${remainingMinutes}m`;
}

async function fetchFirstMessageDate(guild: Guild, userId: Snowflake): Promise<string> {
  const channels = guild.channels.cache.filter((channel): channel is GuildTextBasedChannel =>
    channel.isTextBased()
  );
  let earliestMessageDate: number | null = null;

  for (const channel of channels.values()) {
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter((msg: Message) => msg.author.id === userId);

      const firstMessage = userMessages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .first();

      if (firstMessage) {
        if (!earliestMessageDate || firstMessage.createdTimestamp < earliestMessageDate) {
          earliestMessageDate = firstMessage.createdTimestamp;
        }
      }
    } catch (error) {
      console.error(error);
      continue;
    }
  }

  return earliestMessageDate ? new Date(earliestMessageDate).toLocaleDateString() : "N/A";
}
