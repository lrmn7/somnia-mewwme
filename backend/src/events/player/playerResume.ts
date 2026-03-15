import { playerRowOne, playerRowTwo, filterSelect } from "../../utilities/PlayerControlButton.js";
import { Manager } from "../../manager.js";
import { TextChannel } from "discord.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { resumeStatsSession } from "../../utilities/TopStatsSession.js";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    if (player.voiceId == null) return;

    /////////// Resume Stats Session //////////
    resumeStatsSession(player.guildId);
    /////////// Resume Stats Session //////////

    const nowPlaying = client.nplayingMsg.get(`${player.guildId}`);
    if (nowPlaying) {
      nowPlaying.msg
        .edit({
          components: [
            ...((client.config.features.FilterMenu ?? false) ? [filterSelect(client)] : []),
            playerRowOne(client),
            playerRowTwo(client),
          ],
        })
        .catch(() => null);
    }

    const setup = await client.db.setup.get(`${player.guildId}`);

    client.emit("playerResume", player);

    if (setup && setup.playmsg) {
      const channel = await client.channels.fetch(setup.channel).catch(() => undefined);
      if (!channel) return;
      if (!channel.isTextBased) return;
      const msg = await (channel as TextChannel).messages
        .fetch(setup.playmsg)
        .catch(() => undefined);
      if (!msg) return;
      msg.edit({ components: [client.enSwitchMod] }).catch(() => null);
    }
  }
}
