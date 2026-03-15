import { Manager } from "../../manager.js";
import Fastify from "fastify";

export async function postPlayPlaylist(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { id } = req.params as Record<string, string>;
  const userId = req.headers["user-id"] as string;
  const { guildId } = req.body as Record<string, string>;

  if (!guildId) {
    res.code(400).send({ error: "guildId is required." });
    return;
  }

  const playlist = await client.db.playlist.get(id);
  if (!playlist) {
    res.code(404).send({ error: "Playlist not found." });
    return;
  }
  if (playlist.private && playlist.owner !== userId) {
    res.code(403).send({ error: "This playlist is private." });
    return;
  }
  if (!playlist.tracks?.length) {
    res.code(400).send({ error: "Playlist is empty." });
    return;
  }

  const guild = await client.guilds.fetch(guildId).catch(() => undefined);
  if (!guild) {
    res.code(404).send({ error: "Guild not found." });
    return;
  }
  const member = await guild.members.fetch(userId).catch(() => undefined);
  const voiceChannelId = member?.voice?.channelId ?? guild.voiceStates.cache.get(userId)?.channelId;

  if (!voiceChannelId) {
    res.code(400).send({ error: "You must be in a voice channel." });
    return;
  }

  let player = client.mewslink.players.get(guildId);
  if (!player) {
    try {
      player = await client.mewslink.create({
        guildId: guild.id,
        voiceId: voiceChannelId,
        textId: "",
        shardId: guild.shardId ?? 0,
        deaf: true,
        volume: (client.config as any).bot?.DEFAULT_VOLUME ?? 50,
      });
    } catch (err) {
      res.code(500).send({ error: "Failed to join voice channel." });
      return;
    }
  }

  let added = 0;
  let firstTrack = true;
  for (const trackData of playlist.tracks) {
    const result = await client.mewslink.search(trackData.uri!);
    if (result.tracks.length) {
      if (firstTrack) {
        // Play the first track immediately — replaces current and starts playback
        player.data.set("dashboardPlayback", true);
        await player.play(result.tracks[0]);
        firstTrack = false;
      } else {
        player.queue.add(result.tracks[0]);
      }
      added++;
    }
  }

  res.send({ added, playlistName: playlist.name });
}
