import { Manager } from "../manager.js";
import { MewslinkTrack } from "../mewslink/main.js";
import { FormatDuration } from "./FormatDuration.js";

export function TrackTitle(client: Manager, track: MewslinkTrack) {
  const sanitizedTitle = track.title.replace(
    /https?:\/\/\S+/g,
    "Those who wish to sing always find a song"
  );

  const title =
    sanitizedTitle.length > 35 ? sanitizedTitle.substring(0, 35) + "..." : sanitizedTitle;

  const author = track.author;
  const supportUrl = client.config.bot.SERVER_SUPPORT_URL;

  if (new FormatDuration().parse(track.duration) === "Live Stream") {
    return `${author}`;
  }

  if (client.config.features.HIDE_LINK) {
    return `${title}`;
  } else if (client.config.features.REPLACE_LINK) {
    return `[${title}](${supportUrl})`;
  } else {
    return `[${title}](${track.uri || supportUrl})`;
  }
}

/**
 *  __  __            Made by Tragic              _
 * |  \/  |   L RMN - https://hi-lrmn.is-a.dev   ( )
 * | \  / | _____      ____      ___ __ ___   ___|/ ___
 * | |\/| |/ _ \ \ /\ / /\ \ /\ / / '_ ` _ \ / _ \ / __|
 * | |  | |  __/\ V  V /  \ V  V /| | | | | |  __/ \__ \
 * |_|  |_|\___| \_/\_/    \_/\_/ |_| |_| |_|\___| |___/
 *
 *     Discord Support: https://meww.me/support
 *     Community Resources: https://meww.me/premium
 */
