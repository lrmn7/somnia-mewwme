import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { emitPlayerState } from "../../utilities/EmitPlayerState.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    try {
      client.wsl.get(player.guildId)?.send({
        op: "playerCreate",
        guild: player.guildId,
      });
      emitPlayerState(client, player);
    } catch (err) {
      client.logger.error("WebSocket:playerCreate", `Failed to emit event: ${String(err)}`);
    }
  }
}
