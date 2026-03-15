import {
  GuildScheduledEvent,
  PartialGuildScheduledEvent,
  EmbedBuilder,
  GuildScheduledEventStatus,
} from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class ScheduledEventHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("guildScheduledEventCreate", this.handleScheduledEventCreate.bind(this));
    this.client.on("guildScheduledEventUpdate", this.handleScheduledEventUpdate.bind(this));
    this.client.on("guildScheduledEventDelete", this.handleScheduledEventDelete.bind(this));
  }

  // Handle scheduled event creation
  private async handleScheduledEventCreate(event: GuildScheduledEvent<GuildScheduledEventStatus>) {
    if (!event.guild) return; // Check for null guild
    if (!(await isEventEnabled(event.guild.id, "guildScheduledEventCreate", this.client.db)))
      return;

    const modLogChannel = await getModLogChannel(event.guild.id, this.client);
    if (!modLogChannel) return;

    await modLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("📅 Scheduled Event Created")
          .setDescription(`**Event:** ${event.name}`)
          .addFields(
            {
              name: "Scheduled Start Time",
              value: `${event.scheduledStartTimestamp ? new Date(event.scheduledStartTimestamp).toISOString() : "N/A"}`,
            },
            {
              name: "Scheduled End Time",
              value: `${event.scheduledEndTimestamp ? new Date(event.scheduledEndTimestamp).toISOString() : "N/A"}`,
            },
            { name: "Privacy Level", value: `${event.privacyLevel}` },
            {
              name: "Location",
              value: `${event.channel ? `<#${event.channel.id}>` : event.entityMetadata?.location || "Unknown"}`,
            },
            { name: "Description", value: `${event.description || "No description provided"}` }
          )
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle scheduled event updates
  private async handleScheduledEventUpdate(
    oldEvent: GuildScheduledEvent<GuildScheduledEventStatus> | PartialGuildScheduledEvent | null,
    newEvent: GuildScheduledEvent<GuildScheduledEventStatus>
  ) {
    if (!newEvent.guild) return; // Check for null guild
    if (!(await isEventEnabled(newEvent.guild.id, "guildScheduledEventUpdate", this.client.db)))
      return;

    const modLogChannel = await getModLogChannel(newEvent.guild.id, this.client);
    if (!modLogChannel) return;

    const changes: string[] = [];

    if (oldEvent?.scheduledStartTimestamp !== newEvent.scheduledStartTimestamp) {
      changes.push(
        `**Scheduled Start Time:** ${oldEvent?.scheduledStartTimestamp ? new Date(oldEvent.scheduledStartTimestamp).toISOString() : "N/A"} → ${newEvent.scheduledStartTimestamp ? new Date(newEvent.scheduledStartTimestamp).toISOString() : "N/A"}`
      );
    }
    if (oldEvent?.scheduledEndTimestamp !== newEvent.scheduledEndTimestamp) {
      changes.push(
        `**Scheduled End Time:** ${oldEvent?.scheduledEndTimestamp ? new Date(oldEvent.scheduledEndTimestamp).toISOString() : "N/A"} → ${newEvent.scheduledEndTimestamp ? new Date(newEvent.scheduledEndTimestamp).toISOString() : "N/A"}`
      );
    }
    if (oldEvent?.name !== newEvent.name) {
      changes.push(`**Name:** ${oldEvent?.name || "N/A"} → ${newEvent.name}`);
    }
    if (oldEvent?.description !== newEvent.description) {
      changes.push(`**Description:** Updated`);
    }
    if (oldEvent?.privacyLevel !== newEvent.privacyLevel) {
      changes.push(`**Privacy Level:** ${oldEvent?.privacyLevel} → ${newEvent.privacyLevel}`);
    }

    if (changes.length > 0) {
      await modLogChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("📅 Scheduled Event Updated")
            .setDescription(changes.join("\n"))
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // Handle scheduled event deletion
  private async handleScheduledEventDelete(
    event: GuildScheduledEvent<GuildScheduledEventStatus> | PartialGuildScheduledEvent
  ) {
    if (!event.guild) return; // Check for null guild
    if (!(await isEventEnabled(event.guild.id, "guildScheduledEventDelete", this.client.db)))
      return;

    const modLogChannel = await getModLogChannel(event.guild.id, this.client);
    if (!modLogChannel) return;

    await modLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setTitle("🗑️ Scheduled Event Deleted")
          .setDescription(`**Event:** ${event.name || "N/A"}`) // Check for null `event.name`
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
