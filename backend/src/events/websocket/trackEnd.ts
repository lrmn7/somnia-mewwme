import { User } from "discord.js";
import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    try {
      const song = player.queue.previous.at(-1);
      if (!song) return;
      const requesterQueue = song.requester as User;

      const currentData = {
        title: song.title,
        uri: song.uri,
        length: song.duration,
        thumbnail: song.artworkUrl,
        author: song.author,
        requester: requesterQueue
          ? {
              id: requesterQueue.id,
              username: requesterQueue.username,
              globalName: requesterQueue.globalName,
              defaultAvatarURL: requesterQueue.defaultAvatarURL ?? null,
            }
          : null,
      };

      client.wsl.get(player.guildId)?.send({
        op: "playerEnd",
        guild: player.guildId,
        data: currentData,
        mode: player.data.get("endMode") ?? "normal",
      });
    } catch (err) {
      client.logger.error("WebSocket:trackEnd", `Failed to emit event: ${String(err)}`);
    }
  }
}
