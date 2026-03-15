import { ModLogToggle } from "../database/schema/ModLogToggle.js";
import { ModLogChannel } from "../database/schema/ModLogChannel.js";
import { DatabaseTable } from "../database/@types.js";
import { TextChannel } from "discord.js";
import { Manager } from "../manager.js";

export async function initializeModLogToggles(guildId: string, database: DatabaseTable) {
  const defaultToggles: ModLogToggle = {
    guildId: guildId,

    // Guild Events
    guildBanAdd: true,
    guildBanRemove: true,
    guildUpdate: true,
    guildIntegrationsUpdate: false,
    guildAuditLogEntryCreate: false,
    guildOnboardingUpdate: false,
    guildVanityURLUpdate: true,
    guildVanityURLRemove: true,
    guildBoostLevelRemoval: true,
    guildMFALevelUpdate: false,
    guildVerificationLevelUpdate: false,
    guildExplicitContentFilterUpdate: false,
    guildNotificationSettingsUpdate: false,
    guildAFKChannelUpdate: false,
    guildRulesChannelUpdate: false,
    guildWelcomeScreenUpdate: false,
    guildDiscoveryUpdate: false,
    guildSystemChannelUpdate: false,
    guildVoiceRegionUpdate: false,

    // Scheduled Event Handlers
    guildScheduledEventCreate: false,
    guildScheduledEventDelete: false,
    guildScheduledEventUpdate: false,
    guildScheduledEventCancel: false,
    guildScheduledEventStartEnd: false,
    guildScheduledEventReschedule: false,

    // Role Events
    roleCreate: true,
    roleDelete: true,
    roleUpdate: true,
    rolePermissionsUpdate: true,
    roleMentionableUpdate: true,
    roleHierarchyUpdate: true,
    roleMentionableToggle: true,

    // Channel Events
    channelCreate: true,
    channelDelete: true,
    channelUpdate: true,
    channelOverwriteUpdate: true,
    channelPinsUpdate: false,
    channelNSFWToggle: false,
    channelSlowmodeUpdate: false,

    // Thread Events
    threadCreate: false,
    threadDelete: false,
    threadUpdate: false,
    threadMemberUpdate: false,
    threadAutoArchived: false,
    threadArchiveUnarchive: false,

    // Message Events
    messageDelete: true,
    messageUpdate: true,
    messageDeleteBulk: true,
    messagePinned: false,
    messageUnpinned: false,
    messageEmbedUpdate: false,

    // Reaction Events
    messageReactionAdd: true,
    messageReactionRemove: true,
    messageReactionRemoveAll: true,

    // Emoji and Sticker Events
    emojiCreate: true,
    emojiDelete: true,
    emojiUpdate: true,
    stickerCreate: true,
    stickerDelete: true,
    stickerUpdate: true,

    // Integration Events
    integrationCreate: false,
    integrationDelete: false,
    integrationUpdate: false,
    integrationExpiration: false,

    // Auto Moderation Events
    autoModerationRuleCreate: false,
    autoModerationRuleUpdate: false,
    autoModerationRuleDelete: false,
    autoModerationActionExecution: false,

    // Application Command Events
    applicationCommandPermissionsUpdate: false,
    applicationCommandCreate: false,
    applicationCommandDelete: false,
    applicationCommandUpdate: false,
    applicationCommandInvocation: false,
    applicationCommandCooldownBypass: false,
    slashCommandError: false,

    // Presence Events
    presenceUpdate: false,
    presenceActivityUpdate: false,
    guildMemberPresenceUpdate: false,

    // Typing and User Events
    typingStart: false,
    typingStop: false,
    userUpdate: false,

    // Member Events
    guildMemberAdd: true,
    guildMemberRemove: true,
    guildMemberUpdate: true,
    guildMemberRoleAddRemove: true,
    guildMemberPermissionsUpdate: true,
    guildMemberAvatarUpdate: true,
    guildMemberJoinDateUpdate: true,
    guildMemberBoost: true,
    guildMemberTimeout: false,
    guildMemberOnlineStatusUpdate: true,
    guildMemberTemporaryBanUnban: false,
    guildMemberPrune: true,
    memberTimeoutUpdate: false,
    guildAFKUpdate: false,
    guildMemberNicknameChange: true,
    voiceStateUpdate: false,

    // Voice Channel Events
    voiceChannelJoin: true,
    voiceChannelLeave: true,
    voiceChannelSwitch: true,
    voiceChannelMuteToggle: false, // Added if needed for mute/unmute
    voiceChannelDeafToggle: false, // Added if needed for deaf/undeaf

    // Moderation Events
    moderationCommandInvocation: false,

    // Invite Events
    inviteCreate: true,
    inviteDelete: true,

    // Webhook Events
    guildWebhookCreate: false,
    guildWebhookDelete: false,
    webhookUpdate: false,

    // Stage Instance Events
    stageInstanceCreate: false,
    stageInstanceDelete: false,
    stageInstanceUpdate: false,

    // Other Custom Events
    auditLogPrune: false,
    guildBannerRemoval: false,
  };

  await database.ModLogToggle.set(guildId, defaultToggles);
}

export async function getModLogToggles(
  guildId: string,
  database: DatabaseTable
): Promise<ModLogToggle> {
  let toggles = await database.ModLogToggle.get(guildId);
  if (!toggles) {
    await initializeModLogToggles(guildId, database);
    toggles = await database.ModLogToggle.get(guildId);
  }
  return toggles as ModLogToggle;
}

export async function toggleModLogEvent(
  guildId: string,
  event: keyof ModLogToggle,
  state: boolean,
  database: DatabaseTable
) {
  const toggles: ModLogToggle = await getModLogToggles(guildId, database);

  if (event in toggles) {
    toggles[event] = state;
    await database.ModLogToggle.set(guildId, toggles);
  }
}

export async function isEventEnabled(
  guildId: string,
  event: keyof ModLogToggle,
  database: DatabaseTable
): Promise<boolean> {
  const toggles = await getModLogToggles(guildId, database);
  return !!toggles[event];
}

export async function getModLogChannel(
  guildId: string,
  client: Manager,
  database: DatabaseTable
): Promise<TextChannel | null> {
  const modLogChannel = (await database.ModLogChannel.get(guildId)) as ModLogChannel;
  if (!modLogChannel || !modLogChannel.channelId) return null;
  const guild = await client.guilds.fetch(guildId);
  if (!guild) return null;

  const channel = await guild.channels.fetch(modLogChannel.channelId);
  return channel instanceof TextChannel ? channel : null;
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
