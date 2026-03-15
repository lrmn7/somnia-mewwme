import { ClusterManager } from "./ClusterManager.js";

export class ClusterHealthReporter {
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private manager: ClusterManager,
    private intervalMs: number = 60_000
  ) {}

  public start() {
    if (this.interval) return;
    this.manager.sendHealthReport(); // immediate
    this.interval = setInterval(() => this.manager.sendHealthReport(), this.intervalMs);
  }

  public stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
  }
}
