import { Manager } from "./manager.js";
import { ConfigDataService } from "./services/ConfigDataService.js";

const configData = new ConfigDataService().data;
const mewwme = new Manager(configData, configData.features.MESSAGE_CONTENT.enable);
// Anti crash handling
process
  .on("unhandledRejection", (error) => mewwme.logger.unhandled("AntiCrash", error))
  .on("uncaughtException", (error) => mewwme.logger.unhandled("AntiCrash", error))
  .on("uncaughtExceptionMonitor", (error) => mewwme.logger.unhandled("AntiCrash", error))
  .on("exit", () =>
    mewwme.logger.info("ClientManager", `Mewwme's has shut down successfully. See you next time!`)
  )
  .on("SIGINT", () => {
    mewwme.logger.info("ClientManager", `Shutting down Mewwme's...`);
    process.exit(0);
  });
mewwme.start();
