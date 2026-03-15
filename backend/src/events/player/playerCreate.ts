import { Manager } from "../../manager.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
import chalk from "chalk";

export default class {
  async execute(client: Manager, player: MewslinkPlayer) {
    const guild = await client.guilds.fetch(player.guildId).catch(() => undefined);

    /////////// Update Music Status Channel //////////
    await UpdateMusicStatusChannel(client, player);
    /////////// Update Music Status Channel //////////

    client.logger.info(
      "PlayerCreate",
      `${chalk.hex("#f2d7b7")("Player Created in @ ")}${chalk.hex("#f2d7b7")(
        guild?.name
      )} / ${chalk.hex("#f2d7b7")(player.guildId)}`
    );
    client.emit("playerCreate", player);
  }
}
