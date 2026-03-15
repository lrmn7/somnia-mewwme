import { Manager } from "../manager.js";
import { MewslinkPlayer } from "../mewslink/main.js";

export async function UpdateMusicStatusChannel(client: Manager, player: MewslinkPlayer) {
  const guildId = player.guildId;
  if (!guildId) return;

  const voiceStatus = (await client.db.StatusVoiceChannel.get(guildId)) ?? false;

  if (!voiceStatus) {
    return;
  }

  const VoiceChannel = client.guilds.cache.get(guildId)?.members.me?.voice?.channelId;
  if (!VoiceChannel) return;

  try {
    const url = `/channels/${VoiceChannel}/voice-status` as const;

    let statusText = "Type **/play** to get started!"; // Default status

    if (player.queue.current) {
      const { title, author, isStream } = player.queue.current;
      statusText = isStream ? `♪ Listening to ${author}` : `**♪ ${title}** by ${author}`;
    }

    await client.rest.put(url, { body: { status: statusText } });
  } catch (error) {}
}
