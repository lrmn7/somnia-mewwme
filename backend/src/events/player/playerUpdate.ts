import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer, data: unknown) {
    client.emit("playerUpdate", player);
  }
}
