import {
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../structures/Command.js";
import { Manager } from "../../manager.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { computeWeb3Quota } from "../../web/route/web3Premium.js";

const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["premium", "unclaim"];
  public description = "Deactivate Web3 Premium from this server";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.PremiumUnClaim;
  public usage = "";
  public aliases = ["punclaim", "unclaim"];
  public lavalink = false;
  public usingInteraction = true;
  public playerCheck = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    await handler.SilentDeferReply();
    if (!handler.guild) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `${client.i18n.get(handler.language, "commands.settings", "not_in_guild", {
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            })}`
          ),
        ],
      });
    }

    const userId = handler.user.id;
    const guildId = handler.guild.id;
    const guildName = handler.guild.name;

    const web3Data = await client.db.Web3Premium.get(userId);

    if (!web3Data) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color_main)
            .setTitle("No Web3 Premium")
            .setDescription("You don't have any Web3 premium data."),
        ],
      });
    }

    if (!web3Data.redeemedGuilds || !web3Data.redeemedGuilds.includes(guildId)) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `This server is not claimed via your Web3 premium.`
          ),
        ],
      });
    }

    web3Data.redeemedGuilds = web3Data.redeemedGuilds.filter((id: string) => id !== guildId);
    web3Data.usedQuota = Math.max(0, web3Data.usedQuota - 1);
    await client.db.Web3Premium.set(userId, web3Data);

    const computedQuota = await computeWeb3Quota(client, userId);

    const successEmbed = new EmbedBuilder()
      .setColor(client.color_main)
      .setTitle("Premium Deactivated")
      .setDescription(
        `Premium deactivated from **${guildName}**.\n` +
        `**Quota:** ${web3Data.usedQuota}/${computedQuota}`
      );

    await handler.editReply({ embeds: [successEmbed] });
  }
}
