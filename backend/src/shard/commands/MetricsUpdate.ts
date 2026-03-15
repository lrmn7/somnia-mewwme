import { ClusterCommand, WorkerMessage, WorkerResponse } from "../../@types/Cluster.js";
import { ClusterManager, ClusterMetrics } from "../ClusterManager.js";
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
      const clusterId = manager.getClusterId(worker);

      manager.log(
        "INFO",
        `Received metrics from Cluster ${clusterId}: ${guilds} guilds, ${channels} channels`
      );

      const metrics: ClusterMetrics = {
        clusterId,
        guilds,
        channels,
        updatedAt: Date.now(),
      };

      manager.workerMetrics.set(clusterId, metrics);

      manager.log(
        "INFO",
        `Stored metrics - Total clusters with data: ${manager.workerMetrics.size}`
      );

      return { response: { success: true } };
    } catch (err) {
      manager.log("ERROR", `MetricsUpdate failed: ${err}`);
      return { response: { success: false, error: String(err) } };
    }
  }
}
