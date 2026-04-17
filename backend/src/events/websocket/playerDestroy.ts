import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    try {
      client.wsl.get(player.guildId)?.send({
        op: "playerDestroy",
        guild: player.guildId,
      });
    } catch (err) {
      client.logger.error("WebSocket:playerDestroy", `Failed to emit event: ${String(err)}`);
    }
  }
}
