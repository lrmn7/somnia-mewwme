import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { emitPlayerState } from "../../utilities/EmitPlayerState.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    // Send the lightweight create signal so the dashboard knows a player now exists,
    // then immediately follow with a full playerState snapshot so the frontend can
    // render the queue/current track without a separate REST poll.
    client.wsl.get(player.guildId)?.send({
      op: "playerCreate",
      guild: player.guildId,
    });
    emitPlayerState(client, player);
  }
}
