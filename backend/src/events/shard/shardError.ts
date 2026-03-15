import { Manager } from "../../manager.js";
import chalk from "chalk";

export default class {
  async execute(client: Manager, id: number) {
    client.logger.error("ShardError", chalk.redBright(`Shard ${id} Errored!`));
  }
}
