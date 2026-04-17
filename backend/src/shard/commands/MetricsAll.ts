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
        users: x.users,
        memoryUsage: x.memoryUsage,
        streams: x.streams,
        shards: x.shards,
        updatedAt: x.updatedAt,
        status: x.status,
      }));

    const totalGuilds = perCluster.reduce((sum, w) => sum + w.guilds, 0);
    const totalUsers = perCluster.reduce((sum, w) => sum + w.users, 0);

    return {
      response: {
        totalShards: manager.totalShards,
        totalClusters: manager.resolvedClusters,
        totalGuilds,
        totalUsers,
        perCluster,
      },
    };
  }
}
