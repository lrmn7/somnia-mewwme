import { Manager } from "../../manager.js";
import chalk from "chalk";

export default class {
  async execute(client: Manager, id: number) {
    client.logger.info("ShardReady", chalk.greenBright(`Shard ${id} Ready!`));
  }
}
