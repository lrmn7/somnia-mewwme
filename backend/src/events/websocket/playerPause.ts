import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    client.wsl.get(player.guildId)?.send({
      op: "playerPause",
      guild: player.guildId,
    });
  }
}
