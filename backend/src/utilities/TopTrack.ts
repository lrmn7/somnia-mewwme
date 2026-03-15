import { Manager } from "../manager.js";
import { MewslinkPlayer } from "../mewslink/main.js";
import { User } from "discord.js";

export async function TopTrack(client: Manager, player: MewslinkPlayer) {
  if (!player.queue?.current) {
    return;
  }

  // Only track stats for Spotify sources
  if (player.queue.current.isStream || player.queue.current.source !== "spotify") {
    return;
  }

  const requester = player.queue.current.requester as User;
  if (!requester) {
    return;
  }

  const song = player.queue.current;
  const trackNameNormalized = song.title.trim();
  const trackUrl = song.uri ?? null;

  // Retrieve TopTrack data for the relevant userId
  const topTrackEntry = await client.db.TopTrack.get(requester.id);

  let topTracks = topTrackEntry?.Tracks || [];

  // Find the track in the topTracks array
  const existingTrack = topTracks.find((track) => track.name === trackNameNormalized);

  if (existingTrack) {
    // If the track already exists, update the count and URL if missing
    existingTrack.count += 1;
    if (!existingTrack.trackUrl && trackUrl) existingTrack.trackUrl = trackUrl;
  } else {
    // If the track does not exist, add a new entry
    topTracks.push({
      name: trackNameNormalized,
      count: 1,
      artworkUrl: song.artworkUrl ?? null,
      trackUrl,
    });
  }

  // Save the updated data back to the database
  await client.db.TopTrack.set(requester.id, {
    userId: requester.id,
    username: requester.username,
    Tracks: topTracks,
  });
}
