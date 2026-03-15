import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { stripIndents } from "common-tags";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
import os from "os";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["info"];
  public description = "Shows the information of the Bot";
  public category = "Info";
  public accessableby = data.COMMANDS_ACCESS.INFO.Info;
  public usage = "";
  public aliases = ["stats", "bs"];
  public lavalink = false;
  public options = [];
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public async execute(client: Manager, handler: CommandHandler) {
    await handler.deferReply();

    const globalCommandUsageData = await client.db.CommandGlobalUsage.get("global");
    const globalPlayedSongData = await client.db.PlayedSongGlobal.get("global");
    const globalCommands = globalCommandUsageData?.total || 0;
    const globalPlayed = globalPlayedSongData?.SongsPlayed || 0;

    const botInfo = stripIndents`
    **Username :** ${client.user!.username} / ${client.user!.id}
    **Server Count :** ${client.guilds.cache.size}
    **User Count :** ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)}
    **Channel Count :** ${client.channels.cache.size}
    **Commands Used :** ${globalCommands}
    **Tracks Played :** ${globalPlayed}
    **API Latency :** ${client.ws.ping}ms
    **Response Time :** ${(Date.now() - handler.createdAt).toLocaleString()}ms
    **Total Shards :** ${client.clusterManager?.totalShards ?? "0"}
    **Total Cluster :** ${client.cluster.id ?? "0"}
    `;

    const Metadata = stripIndents`
    **ClientId :** ${client.user!.id}
    **Project Name :** ${client.manifest.metadata.bot.codename}
    **Version :** ${client.manifest.metadata.bot.version}
    **Description :** ${client.manifest.metadata.bot.description}
    **Autofix :** ${client.manifest.metadata.autofix.version}
    **Identifier :** ${client.manifest.metadata.autofix.codename}
    **Discord.js :** ${client.manifest.package.discordjs}
    **Node.js :** ${process.version}
    **Typescript :** ${client.manifest.package.typescript}
    **Total Packages :** ${client.manifest.package.totalAmount}
    **Contact Support :** ${client.config.bot.SERVER_SUPPORT_URL}
    **Website :** ${client.manifest.metadata.bot.website}
    `;

    const InviteButton = new ActionRowBuilder<ButtonBuilder>();
    // Check if Invite URL and emoji exist
    InviteButton.addComponents(
      new ButtonBuilder()
        .setLabel("Invite Me")
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user!.id}`)
    );

    const embed = new EmbedBuilder()
      .setColor(client.color_second)
      .setThumbnail(client.user!.displayAvatarURL({ size: 512 }))
      .addFields({ name: "BOT INFORMATION", value: botInfo, inline: false })
      .addFields({ name: "METADATA", value: Metadata, inline: false });

    handler.editReply({ embeds: [embed], components: [InviteButton] });
  }
}
