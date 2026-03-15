import { Manager } from "../../manager.js";
import { EmbedBuilder, TextChannel, MessageFlags } from "discord.js";
import { ClearMessageService } from "../../services/ClearMessageService.js";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
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
      "PlayerDestroy",
      `${chalk.hex("#dc143c")("Player Destroy in @ ")}${chalk.hex("#dc143c")(
        guild?.name
      )} / ${chalk.hex("#dc143c")(player.guildId)}`
    );

    /////////// Update Music Setup ///////////
    await client.UpdateMusic(player);
    /////////// Update Music Setup ///////////

    /////////// Flush & Clear Stats Session //////////
    await flushAndClearSession(player.guildId);
    /////////// Flush & Clear Stats Session //////////

    /////////// Update Music Status Channel //////////
    await UpdateMusicStatusChannel(client, player);
    /////////// Update Music Status Channel //////////

    client.emit("playerDestroy", player);

    const channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;
    client.sentQueue.set(player.guildId, false);
    let data = await new AutoReconnectBuilderService(client, player).get(player.guildId);

    if (!channel) return;

    if (data !== null && data && data.twentyfourseven) {
      await new AutoReconnectBuilderService(client, player).build247(
        player.guildId,
        true,
        data.voice
      );
      client.mewslink.players.create({
        guildId: data.guild!,
        voiceId: data.voice!,
        textId: data.text!,
        shardId: guild?.shardId ?? 0,
        deaf: true,
        mute: false,
        region: player.lastRegion ?? player.region ?? null,
        volume: client.config.bot.DEFAULT_VOLUME ?? 50,
      });
    } else await client.db.autoreconnect.delete(player.guildId);

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
        flags: MessageFlags.SuppressNotifications,
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
