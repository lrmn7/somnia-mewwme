import { Manager } from "../../manager.js";
import { stripIndents } from "common-tags";
import {
  EmbedBuilder,
  ChannelType,
  TextChannel,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  Guild,
  MessageFlagsBitField,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  resolveColor,
  ThumbnailBuilder,
} from "discord.js";

export default class {
  async execute(client: Manager, guild: Guild) {
    const BlacklistGuild = await client.db.BlacklistGuild.get(guild.id);
    if (BlacklistGuild) {
      await guild.leave();
      client.logger.info(
        "GuildCreate",
        `Blocked guild ${guild.name} from joining due to blacklist restriction (auto leave)`
      );
      return;
    }
    client.logger.info("GuildCreate", `Join guild ${guild.name} @ ${guild.id}`);
    const language = client.config.bot.LANGUAGE;
    client.guilds.cache.set(`${guild!.id}`, guild);
    if (!client.config.logchannel.GuildJoinChannelID) return;
    try {
      const eventChannel = await client.channels.fetch(client.config.logchannel.GuildJoinChannelID);
      if (!eventChannel || !eventChannel.isTextBased()) return;
      const owner = await client.users.fetch(guild.ownerId);

      const embed = new EmbedBuilder()
        .setThumbnail(guild.iconURL({ size: 1024 }))
        .setAuthor({
          name: `${client.i18n.get(language, "events.guild", "joined_title")}`,
        })
        .addFields([
          {
            name: `${client.i18n.get(language, "events.guild", "guild_name")}`,
            value: `\`${guild.name}\` \n \`${guild.id}\``,
            inline: true,
          },
          {
            name: `${client.i18n.get(language, "events.guild", "guild_member_count")}`,
            value: `\`${guild.memberCount}\` Members`,
            inline: true,
          },
          {
            name: `${client.i18n.get(language, "events.guild", "guild_owner")}`,
            value: `\`${owner.displayName}\` \n \`${owner.id}\``,
            inline: true,
          },
          {
            name: `${client.i18n.get(language, "events.guild", "guild_creation_date")}`,
            value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`,
            inline: true,
          },
          {
            name: `${client.i18n.get(language, "events.guild", "guild_join_date")}`,
            value: `<t:${Math.floor(guild.joinedTimestamp / 1000)}:F>`,
            inline: true,
          },
          {
            name: `${client.i18n.get(language, "events.guild", "current_server_count")}`,
            value: `\`${client.guilds.cache.size}\` Servers`,
            inline: true,
          },
        ])
        .setColor(client.color_main)
        .setTimestamp();

      const channel = eventChannel as TextChannel;
      await channel.send({
        embeds: [embed],
      });
      client.logger.info(
        "GuildCreate",
        `Sent join message to event channel for guild ${guild.name}`
      );

      // Introduce the bot
      let PREFIX = client.prefix;
      let guildChannel = guild.channels.cache.find((channel) => {
        if (
          channel.type === ChannelType.GuildText &&
          channel.permissionsFor(client.user!)?.has("SendMessages")
        ) {
          return channel.name.toLowerCase().includes("bot");
        }
        return false;
      });

      if (!guildChannel) {
        const textChannels = guild.channels.cache.filter(
          (channel) =>
            channel.type === ChannelType.GuildText &&
            channel.permissionsFor(client.user!)?.has("SendMessages")
        );
        const randomChannel = textChannels.random();
        if (randomChannel) {
          guildChannel = randomChannel;
        }
      }

      if (guildChannel) {
        const section = new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### ${client.i18n.get(language, "events.guild", "join_msg_title")}`
            ),
            new TextDisplayBuilder().setContent(
              client.i18n.get(language, "events.guild", "join_msg_desc", {
                serversupport: client.config.bot.SERVER_SUPPORT_URL,
                premium: client.config.bot.PREMIUM_URL,
                prefix: PREFIX,
                bot: client.user!.username,
                website: client.config.bot.WEBSITE_URL,
              })
            )
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setLabel(client.i18n.get(language, "interaction", "no_premium_button"))
              .setURL(client.config.bot.PREMIUM_URL)
              .setStyle(ButtonStyle.Link)
          );

        const welcomeEmbed = new ContainerBuilder()
          .setAccentColor(resolveColor(client.color_main))
          .addSectionComponents(section);

        await (guildChannel as TextChannel).send({
          components: [welcomeEmbed],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } catch (error) {
      client.logger.info(
        "GuildCreate",
        `Cannot be sent introduce bot @ ${guild.name} @ ${guild.id}` + error
      );
    }
  }
}
