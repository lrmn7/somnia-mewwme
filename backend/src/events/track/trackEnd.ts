import { Manager } from "../../manager.js";
import { TextChannel } from "discord.js";
import { ClearMessageService } from "../../services/ClearMessageService.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
// FIX: emitPlayerState import removed – see comment below where it was called.
import { flushAndClearSession } from "../../utilities/TopStatsSession.js";
import chalk from "chalk";
export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    if (!client.isDatabaseConnected)
      return client.logger.warn(
        "DatabaseService",
        chalk.red(
          `The database is not yet connected so this event will temporarily not execute. Please try again later!`
        )
      );

    const guild = await client.guilds.fetch(player.guildId).catch(() => undefined);
    client.logger.info(
      "TrackEnd",
      `${chalk.hex("#f08080")("Player End in @ ")}${chalk.hex("#f08080")(
        guild?.name
      )} / ${chalk.hex("#f08080")(player.guildId)}`
    );

    /////////// Update Music Setup //////////
    await client.UpdateMusic(player);
    /////////// Update Music Setup ///////////

    /////////// Flush & Clear Stats Session //////////
    await flushAndClearSession(player.guildId);
    /////////// Flush & Clear Stats Session //////////

    /////////// Update Music Status Channel //////////
    await UpdateMusicStatusChannel(client, player);
    /////////// Update Music Status Channel //////////

    client.emit("playerEnd", player);

    // FIX: Removed emitPlayerState(client, player) call.
    // At this point player.queue.current is null (cleared by MewslinkPlayerEvents
    // before this handler runs), so emitPlayerState would broadcast a stale
    // snapshot with current=null. Because this handler is async and trackStart
    // can fire concurrently, the stale snapshot could arrive AFTER trackStart's
    // authoritative snapshot, overwriting the new track with null and causing
    // the dashboard to desynchronize.
    // The authoritative state is emitted by trackStart.ts (next track) or
    // playerDestroy (if queue is empty). No information is lost.

    const channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;
    if (channel) {
      if (player.queue.length || player!.queue!.current)
        return new ClearMessageService(client, channel, player);

      if (player.loop !== "none") return new ClearMessageService(client, channel, player);
    }

    const currentPlayer = client.mewslink.players.get(player.guildId) as MewslinkPlayer;
    if (!currentPlayer) return;
    if (!currentPlayer.sudoDestroy) await player.destroy().catch(() => {});
  }
}
