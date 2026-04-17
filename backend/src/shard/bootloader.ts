import { Manager } from "../manager.js";
import { ConfigDataService } from "../services/ConfigDataService.js";
import { ClusterManager } from "./ClusterManager.js";

export function bootBot(clusterManager?: ClusterManager): Manager {
  const configData = new ConfigDataService().data;
  const mewwme = new Manager(
    configData,
    configData.features.MESSAGE_CONTENT.enable,
    clusterManager
  );

  process
    .on("unhandledRejection", (error) => mewwme.logger.unhandled("AntiCrash", error))
    .on("uncaughtException", (error) => mewwme.logger.unhandled("AntiCrash", error))
    .on("uncaughtExceptionMonitor", (error) => mewwme.logger.unhandled("AntiCrash", error))
    .on("exit", () => mewwme.logger.info("ClientManager", `Mewwme shut down successfully.`))
    .on("SIGINT", () => {
      mewwme.logger.info("ClientManager", `Shutting down Mewwme...`);
      process.exit(0);
    });

  mewwme.start();

  return mewwme;
}
