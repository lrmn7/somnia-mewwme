import { VoiceState, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class VoiceEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("voiceStateUpdate", this.handleVoiceStateUpdate.bind(this));
  }

  private async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState) {
    const guild = newState.guild;
    if (!(await isEventEnabled(guild.id, "voiceStateUpdate", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    const changes: string[] = [];

    if (oldState.channelId !== newState.channelId) {
      changes.push(
        `**Voice Channel:** ${
          oldState.channelId ? `<#${oldState.channelId}>` : "Left Voice Channel"
        } → ${newState.channelId ? `<#${newState.channelId}>` : "Joined Voice Channel"}`
      );
    }

    if (changes.length > 0) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("🎙️ Voice State Updated")
            .setDescription(changes.join("\n"))
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
