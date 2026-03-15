import { Manager } from "../../manager.js";
import { EmbedBuilder, Guild, AuditLogEvent, GuildAuditLogsEntry } from "discord.js";
import { getModLogChannel, isEventEnabled } from "../ModLogEventUtils.js";

export class GuildEventHandler {
  private client: Manager;

  constructor(client: Manager) {
    this.client = client;
    this.init();
  }

  private init() {
    this.client.on("guildUpdate", this.handleGuildUpdate.bind(this));
    this.client.on("guildAuditLogEntryCreate", this.handleGuildAuditLogEntryCreate.bind(this));
    this.client.on("guildIntegrationsUpdate", this.handleGuildIntegrationsUpdate.bind(this));
    this.client.on("guildVanityURLUpdate", this.handleGuildVanityURLUpdate.bind(this));
    this.client.on("guildBannerRemoval", this.handleGuildBannerRemoval.bind(this));
    this.client.on("guildOnboardingUpdate", this.handleGuildOnboardingUpdate.bind(this));
    this.client.on("guildMFALevelUpdate", this.handleGuildMFALevelUpdate.bind(this));
    this.client.on("guildRulesChannelUpdate", this.handleGuildRulesChannelUpdate.bind(this));
    this.client.on("guildSystemChannelUpdate", this.handleGuildSystemChannelUpdate.bind(this));
    this.client.on("guildAFKUpdate", this.handleGuildAFKUpdate.bind(this));
    this.client.on("guildDiscoveryUpdate", this.handleGuildDiscoveryUpdate.bind(this));
    this.client.on(
      "guildVerificationLevelUpdate",
      this.handleGuildVerificationLevelUpdate.bind(this)
    );
    this.client.on(
      "guildExplicitContentFilterUpdate",
      this.handleGuildExplicitContentFilterUpdate.bind(this)
    );
    this.client.on(
      "guildNotificationSettingsUpdate",
      this.handleGuildNotificationSettingsUpdate.bind(this)
    );
  }

  private async handleGuildUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildUpdate", this.client.db))) return; // Pass client.db

    const auditLogs = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate }); // Use AuditLogEvent.GuildUpdate
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry?.executor;

    const channel = await getModLogChannel(newGuild.id, this.client);
    if (!channel) return;

    const changes = [];
    if (oldGuild.name !== newGuild.name) {
      changes.push(`**Name:** ${oldGuild.name} → ${newGuild.name}`);
    }
    if (oldGuild.icon !== newGuild.icon) {
      changes.push(`**Icon:** Updated`);
    }

    if (changes.length > 0) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("Guild Updated")
            .setDescription(changes.join("\n"))
            .addFields({
              name: "Updated By",
              value: `<@${executor?.id ?? "Unknown"}>`,
              inline: true,
            })
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

  private async handleGuildAuditLogEntryCreate(auditLog: GuildAuditLogsEntry) {
    const targetGuild = auditLog.target instanceof Guild ? auditLog.target.id : null;
    if (!(await isEventEnabled(targetGuild ?? "", "guildAuditLogEntryCreate", this.client.db)))
      return;

    const channel = await getModLogChannel(targetGuild ?? "", this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xffd700)
          .setTitle("Audit Log Entry Created")
          .setDescription(`**Action:** ${auditLog.action}`)
          .addFields({
            name: "Performed By",
            value: `<@${auditLog.executor?.id ?? "Unknown"}>`,
            inline: true,
          })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleGuildIntegrationsUpdate(guild: Guild) {
    if (!(await isEventEnabled(guild.id, "guildIntegrationsUpdate", this.client.db))) return;

    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.IntegrationUpdate }); // Use AuditLogEvent enum
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry?.executor;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("Guild Integrations Updated")
          .addFields({ name: "Updated By", value: `<@${executor?.id ?? "Unknown"}>`, inline: true })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleGuildVanityURLUpdate(guild: Guild) {
    if (!(await isEventEnabled(guild.id, "guildVanityURLUpdate", this.client.db))) return;

    // Use the correct enum value for the type
    const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate });
    const auditEntry = auditLogs.entries.first();
    const executor = auditEntry?.executor;

    const channel = await getModLogChannel(guild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("Vanity URL Updated")
          .setDescription(`**New Vanity URL:** ${guild.vanityURLCode || "None"}`)
          .addFields({ name: "Updated By", value: `<@${executor?.id}>`, inline: true })
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleGuildBannerRemoval(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildBannerRemoval", this.client.db))) return;

    if (oldGuild.banner && !newGuild.banner) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xff4500)
            .setTitle("Guild Banner Removed")
            .setDescription("The guild's banner has been removed.")
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

  private async handleGuildOnboardingUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildOnboardingUpdate", this.client.db))) return;

    const channel = await getModLogChannel(newGuild.id, this.client);
    if (!channel) return;

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x1e90ff)
          .setTitle("Guild Onboarding Updated")
          .setDescription("The guild's onboarding settings have been updated.")
          .setFooter({
            text: this.client.user?.username || this.client.user?.tag || "Mewwme",
            iconURL:
              this.client.user?.displayAvatarURL() || "https://mewwme.is-a.fun/assets/mews.gif",
          })
          .setTimestamp(new Date()),
      ],
    });
  }

  private async handleGuildMFALevelUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildMFALevelUpdate", this.client.db))) return;

    if (oldGuild.mfaLevel !== newGuild.mfaLevel) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("MFA Level Updated")
            .setDescription(
              `**Old Level:** ${oldGuild.mfaLevel}\n**New Level:** ${newGuild.mfaLevel}`
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

  private async handleGuildRulesChannelUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildRulesChannelUpdate", this.client.db))) return;

    if (oldGuild.rulesChannelId !== newGuild.rulesChannelId) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("Rules Channel Updated")
            .setDescription(
              `**Old Channel:** ${oldGuild.rulesChannel?.name || "None"}\n**New Channel:** ${newGuild.rulesChannel?.name || "None"}`
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

  private async handleGuildSystemChannelUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildSystemChannelUpdate", this.client.db))) return;

    if (oldGuild.systemChannelId !== newGuild.systemChannelId) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("System Channel Updated")
            .setDescription(
              `**Old Channel:** ${oldGuild.systemChannel?.name || "None"}\n**New Channel:** ${newGuild.systemChannel?.name || "None"}`
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

  private async handleGuildAFKUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildAFKUpdate", this.client.db))) return;

    const changes = [];
    if (oldGuild.afkChannelId !== newGuild.afkChannelId) {
      changes.push(
        `**AFK Channel:** ${oldGuild.afkChannel?.name || "None"} → ${newGuild.afkChannel?.name || "None"}`
      );
    }
    if (oldGuild.afkTimeout !== newGuild.afkTimeout) {
      changes.push(
        `**AFK Timeout:** ${oldGuild.afkTimeout} seconds → ${newGuild.afkTimeout} seconds`
      );
    }

    if (changes.length > 0) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("AFK Settings Updated")
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
  }

  private async handleGuildDiscoveryUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildDiscoveryUpdate", this.client.db))) return;

    if (oldGuild.discoverySplash !== newGuild.discoverySplash) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("Guild Discovery Updated")
            .setDescription("The server's discovery splash has been updated.")
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

  private async handleGuildVerificationLevelUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildVerificationLevelUpdate", this.client.db)))
      return;

    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("Verification Level Updated")
            .setDescription(
              `**Old Level:** ${oldGuild.verificationLevel}\n**New Level:** ${newGuild.verificationLevel}`
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

  private async handleGuildExplicitContentFilterUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildExplicitContentFilterUpdate", this.client.db)))
      return;

    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("Explicit Content Filter Updated")
            .setDescription(
              `**Old Setting:** ${oldGuild.explicitContentFilter}\n**New Setting:** ${newGuild.explicitContentFilter}`
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

  private async handleGuildNotificationSettingsUpdate(oldGuild: Guild, newGuild: Guild) {
    if (!(await isEventEnabled(newGuild.id, "guildNotificationSettingsUpdate", this.client.db)))
      return;

    if (oldGuild.defaultMessageNotifications !== newGuild.defaultMessageNotifications) {
      const channel = await getModLogChannel(newGuild.id, this.client);
      if (!channel) return;

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1e90ff)
            .setTitle("Notification Settings Updated")
            .setDescription(
              `**Old Setting:** ${oldGuild.defaultMessageNotifications}\n**New Setting:** ${newGuild.defaultMessageNotifications}`
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
