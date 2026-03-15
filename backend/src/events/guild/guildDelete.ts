import { Manager } from "../../manager.js";
import { EmbedBuilder, Guild, TextChannel } from "discord.js";

export default class {
  async execute(client: Manager, guild: Guild) {
    client.logger.info("GuildDelete", `Left guild ${guild.name} @ ${guild.id}`);
    const language = client.config.bot.LANGUAGE;
    client.guilds.cache.delete(`${guild!.id}`);
    await client.db.setup.delete(guild.id);
    await client.db.language.delete(guild.id);
    await client.db.autoreconnect.delete(guild.id);
    await client.db.prefix.delete(guild.id);
    await client.db.ControlButton.delete(guild.id);
    await client.db.NotifyYoutube.delete(guild.id);
    await client.db.NotifyTwitch.delete(guild.id);
    await client.db.PlayedSongGuild.delete(guild.id);
    await client.db.TempVoiceChannel.delete(guild.id);
    await client.db.TempVoiceChannelSetting.delete(guild.id);
    if (!client.config.logchannel.GuildLeaveChannelID) return;
    try {
      const eventChannel = await client.channels.fetch(
        client.config.logchannel.GuildLeaveChannelID
      );
      if (!eventChannel || !eventChannel.isTextBased()) return;
      const owner = await client.users.fetch(guild.ownerId);
      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${client.i18n.get(language, "events.guild", "leave_title")}`,
        })
        .setThumbnail(guild.iconURL({ size: 1024 }))
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
        .setTimestamp()
        .setColor(client.color_main);

      const channel = eventChannel as TextChannel;
      await channel.send({
        embeds: [embed],
      });
      client.logger.info(
        "GuildDelete",
        `Sent leave message to event channel for guild ${guild.name}`
      );
    } catch (err) {
      client.logger.warn("GuildDelete", `Failed to send message to event channel: ${err}`);
    }
  }
}
