import {
  Typing,
  EmbedBuilder,
  Guild,
  TextChannel,
  NewsChannel,
  ThreadChannel,
  VoiceChannel,
} from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class TypingEventsHandler {
  private client: Manager;
  private typingTimers: Map<string, NodeJS.Timeout>;

  constructor(client: Manager) {
    this.client = client;
    this.typingTimers = new Map();
    this.init();
  }

  private init() {
    this.client.on("typingStart", this.handleTypingStart.bind(this));
  }

  // Handle typing start event
  private async handleTypingStart(typing: Typing) {
    const channel = typing.channel;
    const user = typing.user;
    if (channel.isTextBased() && "guild" in channel) {
      const guild = (channel as TextChannel | NewsChannel | ThreadChannel | VoiceChannel).guild;
      if (!(await isEventEnabled(guild.id, "typingStart", this.client.db))) return;

      const logChannel = await getModLogChannel(guild.id, this.client);
      if (!logChannel) return;

      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("⌨️ Typing Started")
            .setDescription(`**User:** <@${user.id}> started typing in <#${channel.id}>.`)
            .setTimestamp(new Date()),
        ],
      });
      if (this.typingTimers.has(user.id)) {
        clearTimeout(this.typingTimers.get(user.id)!);
      }
      this.typingTimers.set(
        user.id,
        setTimeout(async () => {
          await this.handleTypingStop(typing);
        }, 10000)
      );
    } else {
      this.client.logger.info(TypingEventsHandler.name, `${user.username} started typing in a DM.`);
    }
  }

  // Handle simulated typing stop event
  private async handleTypingStop(typing: Typing) {
    const channel = typing.channel;
    const user = typing.user;
    if (channel.isTextBased() && "guild" in channel) {
      const guild = (channel as TextChannel | NewsChannel | ThreadChannel | VoiceChannel).guild;
      if (!(await isEventEnabled(guild.id, "typingStop", this.client.db))) return;

      const logChannel = await getModLogChannel(guild.id, this.client);
      if (!logChannel) return;
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4500)
            .setTitle("⌨️ Typing Stopped")
            .setDescription(`**User:** <@${user.id}> stopped typing in <#${channel.id}>.`)
            .setTimestamp(new Date()),
        ],
      });
      this.typingTimers.delete(user.id);
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
