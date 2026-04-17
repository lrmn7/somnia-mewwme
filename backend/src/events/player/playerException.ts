import { Manager } from "../../manager.js";
import { EmbedBuilder, TextChannel, MessageFlags } from "discord.js";
import util from "node:util";
import { AutoReconnectBuilderService } from "../../services/AutoReconnectBuilderService.js";
import { ClearMessageService } from "../../services/ClearMessageService.js";
import { MewslinkPlayer } from "../../mewslink/main.js";
import { UpdateMusicStatusChannel } from "../../utilities/UpdateStatusChannel.js";
export default class {
  async execute(
    client: Manager,
    player: MewslinkPlayer,
    message: string,
    data: Record<string, any>
  ) {
    client.logger.error("PlayerException", `Player get exception ${util.inspect(message)}`);

    /////////// Update Music Setup ///////////
    await client.UpdateMusic(player);
    /////////// Update Music Setup ///////////

    /////////// Update Music Status Channel //////////
    await UpdateMusicStatusChannel(client, player);
    /////////// Update Music Status Channel //////////

    const fetch_channel = await client.channels.fetch(player.textId).catch(() => undefined);
    if (!fetch_channel) return;
    const text_channel = fetch_channel as TextChannel;

    const guild = text_channel.guild;
    let guildModel = await client.db.language.get(`${guild.id}`);
    if (!guildModel) {
      guildModel = await client.db.language.set(`${guild.id}`, client.config.bot.LANGUAGE);
    }
    const language = guildModel;

    const embed = new EmbedBuilder()
      .setColor(client.color_main)
      .setDescription(`${client.i18n.get(language, "events.player", "player_get_exception")}`);
    if (text_channel) {
      const msg = await text_channel.send({
        embeds: [embed],
        flags: MessageFlags.SuppressNotifications,
      });
      setTimeout(async () => {
        try {
          await msg.delete();
        } catch (error) {
          client.logger.info(
            "PlayerException",
            `Already deleted message in @ ${msg.guild!.name} / ${player.guildId}`
          );
        }
      }, client.config.features.DELETE_MSG_TIMEOUT);
    }

    const data247 = await new AutoReconnectBuilderService(client, player).get(player.guildId);
    const channel = (await client.channels
      .fetch(player.textId)
      .catch(() => undefined)) as TextChannel;
    if (data247 !== null && data247 && data247.twentyfourseven && channel)
      new ClearMessageService(client, channel, player);

    const currentPlayer = client.mewslink.players.get(player.guildId) as MewslinkPlayer;
    if (!currentPlayer) return;
    if (currentPlayer.queue.length > 0) return await player.skip().catch(() => {});
    if (!currentPlayer.sudoDestroy) await player.destroy().catch(() => {});
  }
}
