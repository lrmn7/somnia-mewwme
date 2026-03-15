import { ClusterCommand, WorkerMessage, WorkerResponse } from "../../@types/Cluster.js";
import { ClusterManager } from "../ClusterManager.js";
import { Worker } from "node:cluster";

export default class MetricsAll implements ClusterCommand {
  public name = "metrics_all";

  public async execute(
    manager: ClusterManager,
    _worker: Worker,
    _message: WorkerMessage
  ): Promise<WorkerResponse> {
    const perCluster = Array.from(manager.workerMetrics.values())
      .sort((a, b) => a.clusterId - b.clusterId)
      .map((x) => ({
        clusterId: x.clusterId,
        guilds: x.guilds,
        channels: x.channels,
        updatedAt: x.updatedAt,
      }));

    const totalGuilds = perCluster.reduce((sum, w) => sum + w.guilds, 0);

    return {
      response: {
        totalGuilds,
        perCluster,
      },
    };
  }
}
