import { Guild, Integration, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class IntegrationEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("integrationCreate", this.handleIntegrationCreate.bind(this));
    this.client.on("integrationDelete", this.handleIntegrationDelete.bind(this));
    this.client.on("integrationUpdate", this.handleIntegrationUpdate.bind(this));
  }

  // Handle integration creation event
  private async handleIntegrationCreate(integration: Integration) {
    const guild = integration.guild;
    if (!(await isEventEnabled(guild.id, "integrationCreate", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setTitle("📢 Integration Created")
          .setDescription(`**Integration:** ${integration.name}`)
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle integration deletion event
  private async handleIntegrationDelete(integration: Integration) {
    const guild = integration.guild;
    if (!(await isEventEnabled(guild.id, "integrationDelete", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setTitle("🗑️ Integration Deleted")
          .setDescription(`**Integration:** ${integration.name}`)
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle integration update event
  private async handleIntegrationUpdate(integration: Integration) {
    const guild = integration.guild;
    if (!(await isEventEnabled(guild.id, "integrationUpdate", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("🔧 Integration Updated")
          .setDescription(`**Integration:** ${integration.name}`)
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
