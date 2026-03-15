import { Manager } from "../manager.js";
import { AutoReconnectLavalinkService } from "./setup/lavalink.js";
import { PremiumScheduleSetup } from "./setup/premium.js";
import { SongRequesterCleanSetup } from "./setup/setup.js";
import { GameHistoryCleanUp } from "./setup/GameHistoryCleanUp.js";
import { TranscriptCleanUp } from "./setup/TranscriptCleanUp.js";
import { ReactivityService } from "../services/ReactivityService.js";

export class Handler {
  constructor(client: Manager) {
    new SongRequesterCleanSetup(client);
    new AutoReconnectLavalinkService(client);
    new PremiumScheduleSetup(client);
    new GameHistoryCleanUp(client);
    new TranscriptCleanUp(client);

    // Somnia Reactivity — WebSocket subscriber for on-chain events
    const web3Config = (client.config as any).Web3;
    if (web3Config?.Enable) {
      client.reactivityService = new ReactivityService(client);
    }
  }
}
