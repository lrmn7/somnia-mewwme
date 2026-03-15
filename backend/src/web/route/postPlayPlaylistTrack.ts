import { Manager } from "../../manager.js";
import Fastify from "fastify";

export async function postPlayPlaylistTrack(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const { id, index } = req.params as Record<string, string>;
  const userId = req.headers["user-id"] as string;
  const { guildId } = req.body as Record<string, string>;

  if (!guildId) {
    res.code(400).send({ error: "guildId is required." });
    return;
  }

  const trackIndex = parseInt(index, 10);
  if (isNaN(trackIndex) || trackIndex < 0) {
    res.code(400).send({ error: "Invalid track index." });
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
  if (trackIndex >= playlist.tracks.length) {
    res.code(400).send({ error: "Track index out of range." });
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

  const trackData = playlist.tracks[trackIndex];
  const result = await client.mewslink.search(trackData.uri!);
  if (!result.tracks.length) {
    res.code(400).send({ error: "Could not resolve track." });
    return;
  }

  const resolvedTrack = result.tracks[0];

  player.data.set("dashboardPlayback", true);
  await player.play(resolvedTrack);

  res.send({ added: 1, trackTitle: resolvedTrack.title });
}
