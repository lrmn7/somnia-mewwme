import { AutoModerationActionExecution, AutoModerationRule, EmbedBuilder } from "discord.js";
import { isEventEnabled, getModLogChannel } from "../ModLogEventUtils.js";
import { Manager } from "../../manager.js";

export class AutoModEventsHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on(
      "autoModerationActionExecution",
      this.handleAutoModerationActionExecution.bind(this)
    );
    this.client.on("autoModerationRuleCreate", this.handleAutoModerationRuleCreate.bind(this));
    this.client.on("autoModerationRuleUpdate", this.handleAutoModerationRuleUpdate.bind(this));
    this.client.on("autoModerationRuleDelete", this.handleAutoModerationRuleDelete.bind(this));
  }

  // Handle AutoModerationActionExecution event
  private async handleAutoModerationActionExecution(action: AutoModerationActionExecution) {
    const guild = action.guild;
    if (!guild) return;
    if (!(await isEventEnabled(guild.id, "autoModerationActionExecution", this.client.db))) return;

    const modLogChannel = await getModLogChannel(guild.id, this.client);
    if (!modLogChannel) return;

    const rule = await guild.autoModerationRules.fetch(action.ruleId).catch(() => null);
    const ruleName = rule ? rule.name : "Unknown Rule";

    const userMention = action.user ? `<@${action.user.id}>` : "Unknown User";

    await modLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setTitle("🚨 Auto Moderation Action Executed")
          .setDescription(`**Action Type:** ${action.action.type}`)
          .addFields(
            { name: "Rule", value: ruleName, inline: true },
            { name: "User", value: userMention, inline: true },
            {
              name: "Channel",
              value: action.channel ? `<#${action.channel.id}>` : "Direct Message",
              inline: true,
            },
            { name: "Content", value: action.content || "No content", inline: false }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle AutoModerationRuleCreate event
  private async handleAutoModerationRuleCreate(rule: AutoModerationRule) {
    const guild = rule.guild;
    if (!guild) return;
    if (!(await isEventEnabled(guild.id, "autoModerationRuleCreate", this.client.db))) return;

    const modLogChannel = await getModLogChannel(guild.id, this.client);
    if (!modLogChannel) return;

    await modLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x32cd32)
          .setTitle("✅ Auto Moderation Rule Created")
          .addFields(
            { name: "Rule Name", value: rule.name, inline: true },
            { name: "Enabled", value: rule.enabled ? "Yes" : "No", inline: true },
            { name: "Creator", value: `<@${rule.creatorId}>`, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle AutoModerationRuleUpdate event
  private async handleAutoModerationRuleUpdate(
    oldRule: AutoModerationRule | null,
    newRule: AutoModerationRule
  ) {
    const guild = newRule.guild;
    if (!guild) return;
    if (!(await isEventEnabled(guild.id, "autoModerationRuleUpdate", this.client.db))) return;

    const modLogChannel = await getModLogChannel(guild.id, this.client);
    if (!modLogChannel) return;

    const changes: string[] = [];

    if (oldRule) {
      if (oldRule.name !== newRule.name)
        changes.push(`**Name:** ${oldRule.name} → ${newRule.name}`);
      if (oldRule.enabled !== newRule.enabled)
        changes.push(
          `**Enabled:** ${oldRule.enabled ? "Yes" : "No"} → ${newRule.enabled ? "Yes" : "No"}`
        );
    } else {
      // Handle the case where oldRule is null (rule might have been newly created or updated without prior state)
      changes.push(`**Rule Created/Updated:** ${newRule.name}`);
    }

    // Add other fields you want to track for changes...

    if (changes.length === 0) return; // No changes to log

    await modLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("🛠️ Auto Moderation Rule Updated")
          .setDescription(changes.join("\n"))
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  // Handle AutoModerationRuleDelete event
  private async handleAutoModerationRuleDelete(rule: AutoModerationRule) {
    const guild = rule.guild;
    if (!guild) return;
    if (!(await isEventEnabled(guild.id, "autoModerationRuleDelete", this.client.db))) return;

    const modLogChannel = await getModLogChannel(guild.id, this.client);
    if (!modLogChannel) return;

    await modLogChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff4500)
          .setTitle("🗑️ Auto Moderation Rule Deleted")
          .addFields(
            { name: "Rule Name", value: rule.name, inline: true },
            { name: "Deleted By", value: `<@${rule.creatorId}>`, inline: true }
          )
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
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
