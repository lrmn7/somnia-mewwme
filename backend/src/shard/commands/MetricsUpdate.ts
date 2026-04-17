import { ClusterCommand, WorkerMessage, WorkerResponse } from "../../@types/Cluster.js";
import { ClusterManager, ClusterMetrics, ShardInfo } from "../ClusterManager.js";
import { Worker } from "node:cluster";

export default class MetricsUpdate implements ClusterCommand {
  public name = "metrics_update";

  public async execute(
    manager: ClusterManager,
    worker: Worker,
    message: WorkerMessage
  ): Promise<WorkerResponse> {
    try {
      const guilds = (message.args?.guilds as number) ?? 0;
      const channels = (message.args?.channels as number) ?? 0;
      const users = (message.args?.users as number) ?? 0;
      const memoryUsage = (message.args?.memoryUsage as number) ?? 0;
      const streams = (message.args?.streams as number) ?? 0;
      const shards = (message.args?.shards as ShardInfo[]) ?? [];
      const clusterId = manager.getClusterId(worker);

      const metrics: ClusterMetrics = {
        clusterId,
        guilds,
        channels,
        users,
        memoryUsage,
        streams,
        shards,
        updatedAt: Date.now(),
        status: "healthy",
      };

      manager.workerMetrics.set(clusterId, metrics);

      return { response: { success: true } };
    } catch (err) {
      manager.log("ERROR", `MetricsUpdate failed: ${err}`);
      return { response: { success: false, error: String(err) } };
    }
  }
}
