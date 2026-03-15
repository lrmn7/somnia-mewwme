import { Manager } from "../../manager.js";
import chalk from "chalk";

export default class {
  async execute(client: Manager, error: Error, id: number) {
    client.logger.warn("ShardDisconnect", chalk.redBright(`Shard ${id} Shard Disconnected!`));
  }
}
