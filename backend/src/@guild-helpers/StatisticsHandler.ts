import { Manager } from "../manager.js";
import { handleActivityStats } from "./Statistics/activityStatsUtils.js";
import { handleMessageStats } from "./Statistics/messageStatsUtils.js";
import { handleReactionStats } from "./Statistics/reactionStatsUtils.js";
import { handleTopChannelsStats } from "./Statistics/topChannelsStatsUtils.js";
import { handleVoiceStats } from "./Statistics/voiceStatsUtils.js";

export class StatisticsHandler {
  constructor(client: Manager) {
    new handleActivityStats(client);
    new handleMessageStats(client);
    new handleReactionStats(client);
    new handleTopChannelsStats(client);
    new handleVoiceStats(client);
  }
}
