import { ConfigDataService } from "../services/ConfigDataService.js";
import { ClusterManager } from "./ClusterManager.js";

const configData = new ConfigDataService().data;

const { shardsPerClusters, totalClusters } = configData.bot.SHARDING_SYSTEM;
const manager = new ClusterManager({ shardsPerClusters, totalClusters });

manager.start();
