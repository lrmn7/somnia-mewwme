import { StageInstance, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class StageEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("stageInstanceCreate", this.handleStageInstanceCreate.bind(this));
    this.client.on("stageInstanceUpdate", this.handleStageInstanceUpdate.bind(this));
    this.client.on("stageInstanceDelete", this.handleStageInstanceDelete.bind(this));
  }

  // Handle stage instance creation
  private async handleStageInstanceCreate(stage: StageInstance) {
    const guild = stage.guild;

    if (!guild) return; // Exit early if there's no guild
    if (!(await isEventEnabled(guild.id, "stageInstanceCreate", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setTitle("🎤 Stage Instance Created")
          .setDescription(`**Topic:** ${stage.topic}\n**Channel:** <#${stage.channelId}>`)
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle stage instance update
  private async handleStageInstanceUpdate(oldStage: StageInstance | null, newStage: StageInstance) {
    const guild = newStage.guild;

    if (!guild) return; // Exit early if there's no guild
    if (!(await isEventEnabled(guild.id, "stageInstanceUpdate", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    const changes = [];

    // Only check for changes if oldStage exists
    if (oldStage) {
      if (oldStage.topic !== newStage.topic) {
        changes.push(`**Topic:** ${oldStage.topic} → ${newStage.topic}`);
      }
    }

    if (changes.length > 0) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("🎤 Stage Instance Updated")
            .setDescription(changes.join("\n"))
            .setTimestamp(new Date()),
        ],
      });
    }
  }

  // Handle stage instance deletion
  private async handleStageInstanceDelete(stage: StageInstance) {
    const guild = stage.guild;

    if (!guild) return; // Exit early if there's no guild
    if (!(await isEventEnabled(guild.id, "stageInstanceDelete", this.client.db))) return;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setTitle("🗑️ Stage Instance Deleted")
          .setDescription(`**Topic:** ${stage.topic}\n**Channel:** <#${stage.channelId}>`)
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
