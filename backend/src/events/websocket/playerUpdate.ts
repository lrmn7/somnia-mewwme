import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    try {
      client.wsl.get(player.guildId)?.send({
        op: "playerUpdate",
        guild: player.guildId,
        position: player.position,
      });
    } catch (err) {
      client.logger.error("WebSocket:playerUpdate", `Failed to emit event: ${String(err)}`);
    }
  }
}
