export interface ModLogToggle {
  guildId: string;

  // Guild Events (guildEvents.ts)
  guildBanAdd: boolean;
  guildBanRemove: boolean;
  guildUpdate: boolean;
  guildIntegrationsUpdate: boolean;
  guildAuditLogEntryCreate: boolean;
  guildOnboardingUpdate: boolean;
  guildVanityURLUpdate: boolean;
  guildVanityURLRemove: boolean;
  guildBoostLevelRemoval: boolean;
  guildMFALevelUpdate: boolean;
  guildVerificationLevelUpdate: boolean;
  guildExplicitContentFilterUpdate: boolean;
  guildNotificationSettingsUpdate: boolean;
  guildAFKChannelUpdate: boolean;
  guildRulesChannelUpdate: boolean;
  guildWelcomeScreenUpdate: boolean;
  guildDiscoveryUpdate: boolean;
  guildSystemChannelUpdate: boolean;
  guildVoiceRegionUpdate: boolean;

  // Scheduled Event Handlers (scheduledEventHandlers.ts)
  guildScheduledEventCreate: boolean;
  guildScheduledEventDelete: boolean;
  guildScheduledEventUpdate: boolean;
  guildScheduledEventCancel: boolean;
  guildScheduledEventStartEnd: boolean;
  guildScheduledEventReschedule: boolean;

  // Role Events (roleEvents.ts)
  roleCreate: boolean;
  roleDelete: boolean;
  roleUpdate: boolean;
  rolePermissionsUpdate: boolean;
  roleMentionableUpdate: boolean;
  roleHierarchyUpdate: boolean;
  roleMentionableToggle: boolean;

  // Channel Events (channelEvents.ts)
  channelCreate: boolean;
  channelDelete: boolean;
  channelUpdate: boolean;
  channelOverwriteUpdate: boolean;
  channelPinsUpdate: boolean;
  channelNSFWToggle: boolean;
  channelSlowmodeUpdate: boolean;

  // Thread Events (threadEvents.ts)
  threadCreate: boolean;
  threadDelete: boolean;
  threadUpdate: boolean;
  threadMemberUpdate: boolean;
  threadAutoArchived: boolean;
  threadArchiveUnarchive: boolean;

  // Message Events (messageEvents.ts)
  messageDelete: boolean;
  messageUpdate: boolean;
  messageDeleteBulk: boolean;
  messagePinned: boolean;
  messageUnpinned: boolean;
  messageEmbedUpdate: boolean;

  // Emoji and Sticker Events (emojiEvents.ts)
  emojiCreate: boolean;
  emojiDelete: boolean;
  emojiUpdate: boolean;
  stickerCreate: boolean;
  stickerDelete: boolean;
  stickerUpdate: boolean;

  // Integration Events (integrationEvents.ts)
  integrationCreate: boolean;
  integrationDelete: boolean;
  integrationUpdate: boolean;
  integrationExpiration: boolean;

  // Auto Moderation Events (autoModEvents.ts)
  autoModerationRuleCreate: boolean;
  autoModerationRuleUpdate: boolean;
  autoModerationRuleDelete: boolean;
  autoModerationActionExecution: boolean;

  // Application Command Events (slashCommandEvents.ts)
  applicationCommandPermissionsUpdate: boolean;
  applicationCommandCreate: boolean;
  applicationCommandDelete: boolean;
  applicationCommandUpdate: boolean;
  applicationCommandInvocation: boolean;
  applicationCommandCooldownBypass: boolean;
  slashCommandError: boolean;

  // Presence Events (presenceEvents.ts)
  presenceUpdate: boolean;
  presenceActivityUpdate: boolean;
  guildMemberPresenceUpdate: boolean;

  // Typing and User Events (typingEvents.ts)
  typingStart: boolean;
  typingStop: boolean;
  userUpdate: boolean;

  // Member Events (memberEvents.ts)
  guildMemberAdd: boolean;
  guildMemberRemove: boolean;
  guildMemberUpdate: boolean;
  guildMemberRoleAddRemove: boolean;
  guildMemberPermissionsUpdate: boolean; // New
  guildMemberAvatarUpdate: boolean; // New
  guildMemberJoinDateUpdate: boolean; // New
  guildMemberBoost: boolean; // New
  guildMemberTimeout: boolean; // New
  guildMemberOnlineStatusUpdate: boolean; // New
  guildMemberTemporaryBanUnban: boolean; // New
  guildMemberPrune: boolean; // New
  memberTimeoutUpdate: boolean;
  guildAFKUpdate: boolean;
  guildMemberNicknameChange: boolean;
  voiceStateUpdate: boolean;

  // Moderation Events (moderationEvents.ts)
  moderationCommandInvocation: boolean;

  // Reaction Events (reactionEvents.ts)
  messageReactionAdd: boolean;
  messageReactionRemove: boolean;

  // Invite Events (inviteEvents.ts)
  inviteCreate: boolean;
  inviteDelete: boolean;

  // Webhook Events (webhookEvents.ts)
  guildWebhookCreate: boolean;
  guildWebhookDelete: boolean;
  webhookUpdate: boolean;

  // Voice Events (voiceEvents.ts)
  voiceChannelJoin: boolean;
  voiceChannelLeave: boolean;
  voiceChannelSwitch: boolean;

  // Stage Instance Events (stageEvents.ts)
  stageInstanceCreate: boolean;
  stageInstanceDelete: boolean;
  stageInstanceUpdate: boolean;

  // Other Custom Events (otherEvents.ts)
  auditLogPrune: boolean;
  guildBannerRemoval: boolean;

  // Additional missing events (if any)
  [key: string]: boolean | string;
}
