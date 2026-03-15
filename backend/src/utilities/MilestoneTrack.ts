import { EmbedBuilder, TextChannel, User } from "discord.js";
import { Manager } from "../manager.js";
import { MewslinkPlayer } from "../mewslink/main.js";

export async function MilestoneTrack(client: Manager, player: MewslinkPlayer) {
  const requester = player.queue?.current?.requester as User;
  if (!requester) {
    return;
  }

  let userData = await client.db.PlayedSongUser.get(requester.id);
  if (!userData) {
    userData = {
      userId: requester.id,
      username: requester.username,
      displayname: requester.displayName,
      totalSongsPlayed: 0,
      avatarURL: requester.displayAvatarURL({ size: 1024 }),
    };
  } else {
    userData.avatarURL = requester.displayAvatarURL({ size: 1024 });
  }

  userData.totalSongsPlayed += 1;
  await client.db.PlayedSongUser.set(requester.id, userData);

  const channel = (await client.channels
    .fetch(player.textId)
    .catch(() => undefined)) as TextChannel;

  if (!channel) {
    return;
  }

  let guildModel = await client.db.language.get(`${channel.guild.id}`);
  if (!guildModel) {
    guildModel = await client.db.language.set(`${channel.guild.id}`, client.config.bot.LANGUAGE);
  }
  const language = guildModel;

  const milestones = [
    50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 1700, 2000, 2500, 3000, 5000,
    10000,
  ];
  if (milestones.includes(userData.totalSongsPlayed)) {
    const description = client.i18n.get(language, "events.player", "milestone_track_desc", {
      user: `<@${userData.userId}>`,
      total: String(userData.totalSongsPlayed),
    });
    setTimeout(async () => {
      const embed = new EmbedBuilder()
        .setColor(client.color_main)
        .setThumbnail(userData.avatarURL)
        .setDescription(description)
        .setFooter({
          text: client.i18n.get(language, "events.player", "milestone_track_footer", {
            user: userData.displayname || userData.username,
          }),
        });
      await channel.send({
        content: " ",
        embeds: [embed],
        components: [],
      });
    }, 30000);
  }
}
