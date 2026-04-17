import {
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { Command } from "../../structures/Command.js";
import { Manager } from "../../manager.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import { checkGlobalPremium } from "../../web/route/premiumClaim.js";
import { computeWeb3Quota } from "../../web/route/web3Premium.js";

const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["premium", "claim"];
  public description = "Activate Web3 Premium on this server";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.PremiumClaim;
  public usage = "";
  public aliases = ["pclaim", "claim"];
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

    const computedQuota = await computeWeb3Quota(client, userId);
    const web3Data = await client.db.Web3Premium.get(userId);

    if (computedQuota <= 0) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(client.color_main)
            .setTitle("No Web3 Premium")
            .setDescription(
              `You don't have an active Web3 premium subscription. Purchase premium via the dashboard to get started.`
            ),
        ],
      });
    }

    const usedQuota = web3Data?.usedQuota ?? 0;
    if (usedQuota >= computedQuota) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `Quota full (${usedQuota}/${computedQuota}). Unclaim a server first.`
          ),
        ],
      });
    }

    const redeemed = web3Data?.redeemedGuilds ?? [];
    if (redeemed.includes(guildId)) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `Premium is already claimed for this server.`
          ),
        ],
      });
    }

    const isAlreadyPremium = await checkGlobalPremium(client, guildId);
    if (isAlreadyPremium) {
      return handler.editReply({
        embeds: [
          new EmbedBuilder().setColor(client.color_main).setDescription(
            `This server already has premium active from another source.`
          ),
        ],
      });
    }

    redeemed.push(guildId);
    const newUsed = usedQuota + 1;

    const updatedRecord = web3Data ?? {
      walletAddress: "",
      txHash: "",
      plan: "",
      amount: "",
      isUserPremium: true,
      maxQuota: 0,
      usedQuota: 0,
      redeemedGuilds: [],
      redeemedAt: Date.now(),
      activatedAt: Date.now(),
      expiresAt: 0,
    };
    updatedRecord.redeemedGuilds = redeemed;
    updatedRecord.usedQuota = newUsed;
    updatedRecord.isUserPremium = true;
    await client.db.Web3Premium.set(userId, updatedRecord);

    const successEmbed = new EmbedBuilder()
      .setColor(client.color_main)
      .setTitle("Premium Activated")
      .setDescription(
        `Premium activated for **${guildName}** via Web3.\n` +
        `**Quota:** ${newUsed}/${computedQuota}`
      );

    await handler.editReply({ embeds: [successEmbed] });
  }
}
