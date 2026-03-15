import { Manager } from "../../manager.js";
import { MewslinkNode } from "../../mewslink/main.js";
import chalk from "chalk";

export default class {
  async execute(client: Manager, node: MewslinkNode, error: Error) {
    client.logger.debug(
      "NodeError",
      chalk.greenBright(`Lavalink "${node.options.name}" error ${error}`)
    );
  }
}
