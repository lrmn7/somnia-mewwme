import { Manager } from "../manager.js";
import { MewslinkPlayer } from "../mewslink/main.js";
import { User } from "discord.js";

export async function TopArtist(client: Manager, player: MewslinkPlayer) {
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
  const artistNameNormalized = song.author.trim();
  // Derive Spotify artist URL from the track URI identifier
  const artistUrl = artistNameNormalized
    ? `https://open.spotify.com/search/${encodeURIComponent(artistNameNormalized)}`
    : null;

  // Retrieve TopArtist data for the relevant userId
  const topArtistEntry = await client.db.TopArtist.get(requester.id);

  let topArtists = topArtistEntry?.Artists || [];

  // Find artists in the topArtists array
  const existingArtist = topArtists.find((artist) => artist.name === artistNameNormalized);

  if (existingArtist) {
    // If the artist already exists, update the count and URL if missing
    existingArtist.count += 1;
    if (!existingArtist.artistUrl && artistUrl) existingArtist.artistUrl = artistUrl;
  } else {
    // If the artist does not exist, add a new entry
    topArtists.push({
      name: artistNameNormalized,
      count: 1,
      artworkUrl: song.artworkUrl ?? null,
      artistUrl,
    });
  }

  // Save the updated data back to the database
  await client.db.TopArtist.set(requester.id, {
    userId: requester.id,
    username: requester.username,
    Artists: topArtists,
  });
}
