import { User } from "discord.js";
import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    try {
      const song = player.queue.current;
      if (!song) {
        return;
      }
      const requesterQueue = song && song.requester ? (song!.requester as User) : null;

      const currentData = {
        title: song.title ?? "Unknown Title",
        uri: song!.uri,
        length: song!.duration,
        thumbnail: song!.artworkUrl,
        author: song.author ?? "Unknown Author",
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
        op: "trackStart",
        guild: player.guildId,
        data: currentData,
      });
    } catch (err) {
      client.logger.error("WebSocket:trackStart", `Failed to emit event: ${String(err)}`);
    }
  }
}
