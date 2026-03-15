import { Manager } from "../manager.js";
import { GuildEventHandler } from "./Modlog/guildEvents.js";
import { RoleEventsHandler } from "./Modlog/roleEvents.js";
import { ChannelEventsHandler } from "./Modlog/channelEvents.js";
import { MessageEventsHandler } from "./Modlog/messageEvents.js";
import { MemberEventsHandler } from "./Modlog/memberEvents.js";
import { EmojiEventsHandler } from "./Modlog/emojiEvents.js";
import { IntegrationEventsHandler } from "./Modlog/integrationEvents.js";
import { ThreadEventsHandler } from "./Modlog/threadEvents.js";
import { VoiceEventsHandler } from "./Modlog/voiceEvents.js";
import { InviteEventsHandler } from "./Modlog/inviteEvents.js";
import { WebhookEventsHandler } from "./Modlog/webhookEvents.js";
import { ScheduledEventHandler } from "./Modlog/scheduledEventHandlers.js";
import { AutoModEventsHandler } from "./Modlog/autoModEvents.js";
import { ReactionEventsHandler } from "./Modlog/reactionEvents.js";
import { SlashCommandEventsHandler } from "./Modlog/slashCommandEvents.js";
import { StickerEventsHandler } from "./Modlog/stickerEvents.js";
import { TypingEventsHandler } from "./Modlog/typingEvents.js";
import { VoiceChannelEventsHandler } from "./Modlog/voiceChannelEvents.js";
import { VoiceRegionEventsHandler } from "./Modlog/voiceRegionEvents.js";

export class ModLogHandler {
  private client: Manager;

  private guildEventHandler: GuildEventHandler;
  private roleEventHandler: RoleEventsHandler;
  private channelEventHandler: ChannelEventsHandler;
  private messageEventHandler: MessageEventsHandler;
  private memberEventHandler: MemberEventsHandler;
  private emojiEventHandler: EmojiEventsHandler;
  private integrationEventHandler: IntegrationEventsHandler;
  private threadEventHandler: ThreadEventsHandler;
  private voiceEventHandler: VoiceEventsHandler;
  private inviteEventHandler: InviteEventsHandler;
  private webhookEventHandler: WebhookEventsHandler;
  private scheduledEventHandler: ScheduledEventHandler;
  private autoModEventHandler: AutoModEventsHandler;
  private reactionEventHandler: ReactionEventsHandler;
  private slashCommandEventHandler: SlashCommandEventsHandler;
  private stickerEventHandler: StickerEventsHandler;
  private typingEventHandler: TypingEventsHandler;
  private voiceChannelEventHandler: VoiceChannelEventsHandler;
  private voiceRegionEventHandler: VoiceRegionEventsHandler;

  constructor(client: Manager) {
    this.client = client;
    this.guildEventHandler = new GuildEventHandler(client);
    this.roleEventHandler = new RoleEventsHandler(client);
    this.channelEventHandler = new ChannelEventsHandler(client);
    this.messageEventHandler = new MessageEventsHandler(client);
    this.memberEventHandler = new MemberEventsHandler(client);
    this.emojiEventHandler = new EmojiEventsHandler(client);
    this.integrationEventHandler = new IntegrationEventsHandler(client);
    this.threadEventHandler = new ThreadEventsHandler(client);
    this.voiceEventHandler = new VoiceEventsHandler(client);
    this.inviteEventHandler = new InviteEventsHandler(client);
    this.webhookEventHandler = new WebhookEventsHandler(client);
    this.scheduledEventHandler = new ScheduledEventHandler(client);
    this.autoModEventHandler = new AutoModEventsHandler(client);
    this.reactionEventHandler = new ReactionEventsHandler(client);
    this.slashCommandEventHandler = new SlashCommandEventsHandler(client);
    this.stickerEventHandler = new StickerEventsHandler(client);
    this.typingEventHandler = new TypingEventsHandler(client);
    this.voiceChannelEventHandler = new VoiceChannelEventsHandler(client);
    this.voiceRegionEventHandler = new VoiceRegionEventsHandler(client);
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
