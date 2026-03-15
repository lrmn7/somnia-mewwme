import { Manager } from "../../manager.js";
import { MewslinkNode } from "../../mewslink/main.js";
import chalk from "chalk";

export default class {
  execute(client: Manager, node: MewslinkNode, code: number, reason: Buffer) {
    client.mewslink.players.forEach((player, index) => {
      if (player.node.options.name == node.options.name) player.destroy().catch(() => {});
    });
    client.logger.debug(
      "NodeDisconnect",
      chalk.red(`Lavalink ${node.options.name}: Disconnected, Code: ${code}, Reason: ${reason}`)
    );
  }
}
