import { TextChannel } from "discord.js";
import { Manager } from "../../manager.js";
import { ClearMessageService } from "../../services/ClearMessageService.js";
import { MewslinkPlayer, MewslinkPlayerState } from "../../mewslink/main.js";
import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
import chalk from "chalk";
export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    if (!client.isDatabaseConnected)
      return client.logger.warn(
        "DatabaseService",
        "The database is not yet connected so this event will temporarily not execute. Please try again later!"
      );

    /////////// Update Music Setup //////////
    await client.UpdateMusic(player);
    /////////// Update Music Setup ///////////

    /////////// Update Music Status Channel //////////
    await UpdateMusicStatusChannel(client, player);
    /////////// Update Music Status Channel //////////

    const guild = await client.guilds.fetch(player.guildId).catch(() => undefined);

    if (player.data.get("autoplay") === true) {
      const author = player.data.get("author");
      const title = player.data.get("title");
      const requester = player.data.get("requester");
      let identifier = player.data.get("identifier");
      const source = String(player.data.get("source"));
      if (source.toLowerCase() !== "youtube") {
        const findQuery = "directSearch=ytsearch:" + [author, title].filter((x) => !!x).join(" - ");
        const preRes = await player.search(findQuery, { requester: requester });
        if (preRes.tracks.length !== 0) true;
        preRes.tracks[0].identifier ? (identifier = preRes.tracks[0].identifier) : true;
      }
      const search = `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`;
      let res = await player.search(search, { requester: requester });
      const finalRes = res.tracks.filter((track) => {
        const req1 = !player.queue.some((s) => s.encoded === track.encoded);
        const req2 = !player.queue.previous.some((s) => s.encoded === track.encoded);
        return req1 && req2;
      });
      if (finalRes.length !== 0) {
        player.play(finalRes.length <= 1 ? finalRes[0] : finalRes[1]);
        const channel = (await client.channels
          .fetch(player.textId)
          .catch(() => undefined)) as TextChannel;
        if (channel) return new ClearMessageService(client, channel, player);
        return;
      }
    }

    // Guard: if a track has been installed as current (e.g. by a dashboard
    // skipToIndex that ran between the library emitting QueueEmpty and this
    // async handler resuming), the queue is not truly empty — bail out.
    if (player.queue.current || player.playing) return;

    client.logger.info(
      "QueueEmpty",
      `${chalk.hex("#00ffff")("Player Queue Empty in @ ")}${chalk.hex("#00ffff")(
        guild?.name
      )} / ${chalk.hex("#00ffff")(player.guildId)}`
    );
    const channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;
    new ClearMessageService(client, channel, player);
    client.emit("playerEmpty", player);
  }
}
