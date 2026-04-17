/**
 * Normalize YouTube track metadata for better lyrics lookup accuracy.
 *
 * YouTube titles often contain noise like "(Official Video)", "[HD]", "MV", etc.
 * YouTube authors are often the uploader name, not the real artist.
 *
 * This module cleans the title, tries to extract {artist, trackName} from it,
 * and builds a prioritized list of lrclib query candidates.
 */
const BRACKET_NOISE = /[\[\(][^\]\)]*[\]\)]/gi;

const NOISE_WORDS =
  /\b(official\s*(music\s*)?video|official\s*audio|official\s*lyric\s*video|lyric\s*video|lyrics?\s*video|lyrics?|music\s*video|audio|visuali[sz]er|mv|hd|hq|4k|uhd|remastered|remix|live|acoustic|feat\.?|ft\.?)\b/gi;

const EMOJI_RE =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

function tidy(s: string): string {
  return s
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—]+|[\s\-–—]+$/g, "")
    .trim();
}

export interface NormalizedMeta {
  artist: string;
  trackName: string;
}

export interface LyricsQuery {
  track_name: string;
  artist_name: string;
}

function cleanTitle(raw: string): string {
  let t = raw;
  t = t.replace(BRACKET_NOISE, " "); // remove [...] and (...)
  t = t.replace(NOISE_WORDS, " "); // remove noise keywords
  t = t.replace(EMOJI_RE, ""); // remove emojis
  t = t.replace(/[|•·]/g, " "); // misc separators
  t = tidy(t);
  return t;
}

/**
 * Try to split a cleaned title into artist + track using common separators.
 *
 * Handles:
 *   "Artist - Song"
 *   "Artist – Song"
 *   "Artist — Song"
 *   "Song by Artist"
 */
function splitArtistTitle(cleaned: string): { a: string; t: string } | null {
  const byMatch = cleaned.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch) {
    const song = tidy(byMatch[1]);
    const artist = tidy(byMatch[2]);
    if (song && artist) return { a: artist, t: song };
  }

  const dashMatch = cleaned.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    const left = tidy(dashMatch[1]);
    const right = tidy(dashMatch[2]);
    if (left && right) {
      if (left.length <= right.length) {
        return { a: left, t: right };
      }
      return { a: right, t: left };
    }
  }

  return null;
}

/**
 * Normalize track metadata for lyrics lookup.
 *
 * For non-YouTube sources the original metadata is returned unchanged because
 * Spotify / Apple / Deezer already provide clean, accurate artist & title.
 *
 * @param title  Raw track title from the player
 * @param author Raw track author from the player
 * @param source Source name (e.g. "youtube", "spotify", "apple")
 */
export function normalizeTrackMetadata(
  title: string,
  author: string,
  source: string
): NormalizedMeta {
  if (source !== "youtube") {
    return { artist: author || "", trackName: title || "" };
  }

  const cleaned = cleanTitle(title);

  const split = splitArtistTitle(cleaned);
  if (split) {
    return { artist: split.a, trackName: split.t };
  }

  const isTopicChannel = /\s*-\s*Topic$/i.test(author);
  const fallbackAuthor = isTopicChannel
    ? author.replace(/\s*-\s*Topic$/i, "").trim()
    : author;

  return {
    artist: fallbackAuthor || "",
    trackName: cleaned || title || "",
  };
}

/**
 * Build a prioritized list of lrclib query candidates.
 *
 * The caller should iterate through the list and stop on the first
 * successful result.
 *
 * @param artist    Cleaned artist name
 * @param trackName Cleaned track name
 * @param rawTitle  Original raw title (used as last-resort fallback)
 */
export function buildLyricsQueries(
  artist: string,
  trackName: string,
  rawTitle: string
): LyricsQuery[] {
  const queries: LyricsQuery[] = [];
  const seen = new Set<string>();

  const add = (tn: string, an: string) => {
    const key = `${tn.toLowerCase()}::${an.toLowerCase()}`;
    if (seen.has(key)) return;
    if (!tn.trim()) return;
    seen.add(key);
    queries.push({ track_name: tn.trim(), artist_name: an.trim() });
  };
  add(trackName, artist);
  if (artist) add(artist, trackName);
  add(trackName, "");
  if (rawTitle && rawTitle !== trackName) {
    add(rawTitle, "");
  }

  return queries;
}
