import { Presence, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class PresenceEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("presenceUpdate", this.handlePresenceUpdate.bind(this));
  }

  private async handlePresenceUpdate(oldPresence: Presence | null, newPresence: Presence) {
    const guild = newPresence.guild;

    // Check if guild is null
    if (!guild) return; // If there's no guild, exit early

    // Check if the event is enabled for the guild
    if (!(await isEventEnabled(guild.id, "presenceUpdate", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    const user = newPresence.user;
    const oldStatus = oldPresence?.status || "offline";
    const newStatus = newPresence.status;

    if (oldStatus !== newStatus) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("Presence Updated")
            .setDescription(`**User:** <@${user?.id}>`)
            .addFields(
              { name: "Old Status", value: oldStatus, inline: true },
              { name: "New Status", value: newStatus, inline: true }
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
