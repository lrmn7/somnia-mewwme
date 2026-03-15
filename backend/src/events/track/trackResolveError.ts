import { Manager } from "../../manager.js";
import { TextChannel, EmbedBuilder, MessageFlagsBitField } from "discord.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
import { ClearMessageService } from "../../services/ClearMessageService.js";
import { MewslinkPlayer, MewslinkTrack } from "../../mewslink/main.js";
import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
import chalk from "chalk";
export default class {
  async execute(client: Manager, player: MewslinkPlayer, track: MewslinkTrack, message: string) {
    if (!client.isDatabaseConnected)
      return client.logger.warn(
        "DatabaseService",
        chalk.red(
          `The database is not yet connected so this event will temporarily not execute. Please try again later!`
        )
      );

    const guild = await client.guilds.fetch(player.guildId).catch(() => undefined);

    client.logger.warn("TrackResolveError", message);

    /////////// Update Music Setup //////////
    await client.UpdateMusic(player);
    /////////// Update Music Setup ///////////

    /////////// Update Music Status Channel //////////
    await UpdateMusicStatusChannel(client, player);
    /////////// Update Music Status Channel //////////

    const channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;

    let guildModel = await client.db.language.get(`${player.guildId}`);
    if (!guildModel) {
      guildModel = await client.db.language.set(`${player.guildId}`, client.config.bot.LANGUAGE);
    }

    const language = guildModel;

    const embed = new EmbedBuilder()
      .setColor(client.color_main)
      .setDescription(`${client.i18n.get(language, "events.player", "player_track_error")}`);

    if (channel) {
      const setup = await client.db.setup.get(player.guildId);
      const msg = await channel.send({
        embeds: [embed],
        flags: MessageFlagsBitField.Flags.SuppressNotifications,
      });
      setTimeout(
        async () =>
          !setup || setup == null || setup.channel !== channel.id
            ? msg.delete().catch(() => null)
            : true,
        client.config.features.DELETE_MSG_TIMEOUT
      );
    }

    client.logger.error("TrackResolveError", `Track Error in ${guild!.name} / ${player.guildId}.`);

    const data247 = await new AutoReconnectBuilderService(client, player).get(player.guildId);
    if (data247 !== null && data247 && data247.twentyfourseven && channel)
      new ClearMessageService(client, channel, player);

    const currentPlayer = client.mewslink.players.get(player.guildId) as MewslinkPlayer;
    if (!currentPlayer) return;
    // Guard: another operation (e.g. dashboard skipToIndex) may have already
    // installed a new track while this async handler was running.
    if (currentPlayer.queue.current || currentPlayer.playing) return;
    if (currentPlayer.queue.length > 0) return await player.skip().catch(() => {});
    if (!currentPlayer.sudoDestroy) await player.destroy().catch(() => {});
  }
}
