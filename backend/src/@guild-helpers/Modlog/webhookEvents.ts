import {
  NewsChannel,
  TextChannel,
  VoiceChannel,
  ForumChannel,
  MediaChannel,
  EmbedBuilder,
  Webhook,
} from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class WebhookEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("webhookUpdate", this.handleWebhookUpdate.bind(this));
  }

  // Handle webhook update event
  private async handleWebhookUpdate(
    channel: NewsChannel | TextChannel | VoiceChannel | ForumChannel | MediaChannel
  ) {
    const guild = channel.guild;
    if (!guild || !(await isEventEnabled(guild.id, "webhookUpdate", this.client.db))) return;

    const modLogChannel = await getModLogChannel(guild.id, this.client);
    if (!modLogChannel) return;

    // Fetch webhooks from the channel
    const webhooks = await channel.fetchWebhooks();
    const webhookDetails = webhooks.map((webhook: Webhook) => ({
      name: webhook.name,
      id: webhook.id,
      channel: `<#${webhook.channelId}>`,
      creator: webhook.owner ? `<@${webhook.owner.id}>` : "Unknown",
      tokenStatus: webhook.token ? "Available" : "Unavailable",
    }));

    const webhookInfo = webhookDetails
      .map(
        (w) =>
          `**Webhook:** ${w.name} (${w.id})\n**Channel:** ${w.channel}\n**Creator:** ${w.creator}\n**Token:** ${w.tokenStatus}`
      )
      .join("\n\n");

    if (!webhookInfo) return;

    await modLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setAuthor({
            name: this.client.user.username || this.client.user.tag,
            iconURL: this.client.user?.displayAvatarURL(),
          })
          .setDescription(
            `🔗 **Webhook Updated**\n A webhook has been updated in <#${channel.id}>.`
          )
          .addFields({
            name: "Webhook Info",
            value: webhookInfo || "No webhook information available",
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
