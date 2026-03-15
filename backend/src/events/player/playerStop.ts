import { Manager } from "../../manager.js";
import { EmbedBuilder, TextChannel, MessageFlagsBitField } from "discord.js";
import { ClearMessageService } from "../../services/ClearMessageService.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import chalk from "chalk";
import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
import { flushAndClearSession } from "../../utilities/TopStatsSession.js";
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
      "PlayerStop",
      `${chalk.hex("#ff7f50")("Player Stop in @ ")}${chalk.hex("#ff7f50")(
        guild?.name
      )} / ${chalk.hex("#ff7f50")(player.guildId)}`
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

    const channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;
    client.sentQueue.set(player.guildId, false);
    const autoreconnectService = new AutoReconnectBuilderService(client, player);
    let data = await autoreconnectService.get(player.guildId);

    if (!channel) return;

    if (data !== null && data && data.twentyfourseven)
      await autoreconnectService.build247(player.guildId, true, data.voice);

    let guildModel = await client.db.language.get(`${channel.guild.id}`);
    if (!guildModel) {
      guildModel = await client.db.language.set(`${channel.guild.id}`, client.config.bot.LANGUAGE);
    }

    const language = guildModel;

    const isSudoDestroy = player.data.get("sudo-destroy");

    const embed = new EmbedBuilder()
      .setColor(client.color_main)
      .setDescription(`${client.i18n.get(language, "events.player", "queue_end_desc")}`);

    if (!isSudoDestroy) {
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

    const setupdata = await client.db.setup.get(`${player.guildId}`);
    if (setupdata?.channel == player.textId) return;
    new ClearMessageService(client, channel, player);
    player.data.clear();
  }
}
