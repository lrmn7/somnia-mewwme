import { Manager } from "../manager.js";
import { Checker } from "./loadCheck.js";
import { CommandAndButtonLoader } from "./loadCommand.js";
import { ClientEventsLoader } from "./loadEvents.js";
import { PlayerLoader } from "./loadPlayer.js";
import { SomniaReactivityService } from "../services/SomniaReactivityService.js";
import { PremiumExpiryService } from "../services/PremiumExpiryService.js";

export class initHandler {
  constructor(client: Manager) {
    if (client.config.features.AUTOFIX_LAVALINK.enable) new Checker(client);
    new ClientEventsLoader(client);
    new PlayerLoader(client);
    new CommandAndButtonLoader(client);

    // Start Somnia Reactivity Service for Web3 event listening
    if (client.config.Somnia?.Enable) {
      const somniaService = new SomniaReactivityService(client);
      somniaService.start().catch((err) => {
        client.logger.error("initHandler", `SomniaReactivityService failed to start: ${err}`);
      });
    }

    // Start Premium Expiry Service (hourly check for expired subscriptions)
    const expiryService = new PremiumExpiryService(client);
    expiryService.start();
  }
}
