import { request } from "undici";
import { MewslinkPluginType } from "../../Interface/Constants.js";
import {
  MewslinkSearchOptions,
  MewslinkSearchResult,
  MewslinkSearchResultType,
} from "../../Interface/Manager.js";
import { MewslinkTrack } from "../../Player/MewslinkTrack.js";
import { Mewslink } from "../../Mewslink.js";
import { SourceMewslinkPlugin } from "../SourceMewslinkPlugin.js";
import { RequestManager } from "./RequestManager.js";

const REGEX =
  /(?:https:\/\/open\.spotify\.com\/|spotify:)(?:.+)?(track|playlist|album|artist)[\/:]([A-Za-z0-9]+)/;
const SHORT_REGEX = /(?:https:\/\/spotify\.link)\/([A-Za-z0-9]+)/;

/** The mewslink spotify plugin options */
export interface SpotifyOptions {
  /** The client ID of your Spotify application. */
  clientId: string;
  /** The client secret of your Spotify application. */
  clientSecret: string;
  /** The clients for multiple spotify applications. NOT RECOMMENDED */
  clients?: { clientId: string; clientSecret: string }[];
  /** 100 tracks per page */
  playlistPageLimit?: number;
  /** 50 tracks per page */
  albumPageLimit?: number;
  /** The track limit when searching track */
  searchLimit?: number;
  /** Enter the country you live in. ( Can only be of 2 letters. For eg: US, IN, EN) */
  searchMarket?: string;
}

export class MewslinkPlugin extends SourceMewslinkPlugin {
  /**
   * The options of the plugin.
   */
  public options: SpotifyOptions;

  private _search:
    | ((query: string, options?: MewslinkSearchOptions) => Promise<MewslinkSearchResult>)
    | null;
  private mewslink: Mewslink | null;

  private readonly methods: Record<string, (id: string, requester: unknown) => Promise<Result>>;
  private requestManager: RequestManager;

  /**
   * Initialize the plugin.
   * @param spotifyOptions Options for run plugin
   */
  constructor(spotifyOptions: SpotifyOptions) {
    super();
    this.options = spotifyOptions;
    this.requestManager = new RequestManager(spotifyOptions);

    this.methods = {
      track: this.getTrack.bind(this),
      album: this.getAlbum.bind(this),
      artist: this.getArtist.bind(this),
      playlist: this.getPlaylist.bind(this),
    };
    this.mewslink = null;
    this._search = null;
  }

  /**
   * Source identify of the plugin
   * @returns string
   */
  public sourceIdentify(): string {
    return "sp";
  }

  /**
   * Source name of the plugin
   * @returns string
   */
  public sourceName(): string {
    return "spotify";
  }

  /**
   * Type of the plugin
   * @returns mewslinkPluginType
   */
  public type(): MewslinkPluginType {
    return MewslinkPluginType.SourceResolver;
  }

  /**
   * load the plugin
   * @param mewslink The mewslink class
   */
  public load(mewslink: Mewslink) {
    this.mewslink = mewslink;
    this._search = mewslink.search.bind(mewslink);
    mewslink.search = this.search.bind(this);
  }

  /**
   * Unload the plugin
   * @param mewslink The Mewslink class
   */
  public unload(mewslink: Mewslink) {
    this.mewslink = mewslink;
    mewslink.search = mewslink.search.bind(mewslink);
  }

  /** Name function for getting plugin name */
  public name(): string {
    return "mewslink-spotify";
  }

  protected async search(
    query: string,
    options?: MewslinkSearchOptions
  ): Promise<MewslinkSearchResult> {
    const res = await this._search!(query, options);
    if (!this.directSearchChecker(query)) return res;
    if (res.tracks.length == 0) return this.searchDirect(query, options);
    else return res;
  }

  /**
   * Directly search from plugin
   * @param query URI or track name query
   * @param options search option like MewslinkSearchOptions
   * @returns MewslinkSearchResult
   */
  public async searchDirect(
    query: string,
    options?: MewslinkSearchOptions | undefined
  ): Promise<MewslinkSearchResult> {
    if (!this.mewslink || !this._search) throw new Error("mewslink-spotify is not loaded yet.");

    if (!query) throw new Error("Query is required");

    const isUrl = /^https?:\/\//.test(query);

    if (SHORT_REGEX.test(query)) {
      const res = await fetch(query, { method: "HEAD" });
      query = String(res.headers.get("location"));
    }

    const [, type, id] = REGEX.exec(query) || [];

    if (type in this.methods) {
      try {
        const _function = this.methods[type];
        const result: Result = await _function(id, options?.requester);

        const loadType =
          type === "track" ? MewslinkSearchResultType.TRACK : MewslinkSearchResultType.PLAYLIST;
        const playlistName = result.name ?? undefined;

        const tracks = result.tracks.filter(this.filterNullOrUndefined);
        return this.buildSearch(playlistName, tracks, loadType);
      } catch (e) {
        return this.buildSearch(undefined, [], MewslinkSearchResultType.SEARCH);
      }
    } else if (options?.engine === this.sourceName() && !isUrl) {
      const result = await this.searchTrack(query, options?.requester);

      return this.buildSearch(undefined, result.tracks, MewslinkSearchResultType.SEARCH);
    } else return this.buildSearch(undefined, [], MewslinkSearchResultType.SEARCH);
  }

  private buildSearch(
    playlistName?: string,
    tracks: MewslinkTrack[] = [],
    type?: MewslinkSearchResultType
  ): MewslinkSearchResult {
    return {
      playlistName,
      tracks,
      type: type ?? MewslinkSearchResultType.TRACK,
    };
  }

  private async searchTrack(query: string, requester: unknown): Promise<Result> {
    const limit =
      this.options.searchLimit && this.options.searchLimit > 0 && this.options.searchLimit < 50
        ? this.options.searchLimit
        : 10;
    const tracks = await this.requestManager.makeRequest<SearchResult>(
      `/search?q=${decodeURIComponent(query)}&type=track&limit=${limit}&market=${this.options.searchMarket ?? "US"}`
    );
    return {
      tracks: tracks.tracks.items.map((track) => this.buildmewslinkTrack(track, requester)),
    };
  }

  private async getTrack(id: string, requester: unknown): Promise<Result> {
    const track = await this.requestManager.makeRequest<TrackResult>(`/tracks/${id}`);
    return { tracks: [this.buildmewslinkTrack(track, requester)] };
  }

  private async getAlbum(id: string, requester: unknown): Promise<Result> {
    const album = await this.requestManager.makeRequest<AlbumResult>(
      `/albums/${id}?market=${this.options.searchMarket ?? "US"}`
    );
    const tracks = album.tracks.items
      .filter(this.filterNullOrUndefined)
      .map((track) => this.buildmewslinkTrack(track, requester, album.images[0]?.url));

    if (album && tracks.length) {
      let next = album.tracks.next;
      let page = 1;
      while (
        next &&
        // @ts-ignore
        (!this.options.playlistPageLimit ? true : (page < this.options.playlistPageLimit ?? 1))
      ) {
        const nextTracks = await this.requestManager.makeRequest<PlaylistTracks>(next ?? "", true);
        page++;
        if (nextTracks.items.length) {
          next = nextTracks.next;
          tracks.push(
            ...nextTracks.items
              .filter(this.filterNullOrUndefined)
              .filter((a) => a.track)
              .map((track) =>
                this.buildmewslinkTrack(track.track!, requester, album.images[0]?.url)
              )
          );
        }
      }
    }

    return { tracks, name: album.name };
  }

  private async getArtist(id: string, requester: unknown): Promise<Result> {
    const artist = await this.requestManager.makeRequest<Artist>(`/artists/${id}`);
    const fetchedTracks = await this.requestManager.makeRequest<ArtistResult>(
      `/artists/${id}/top-tracks?market=${this.options.searchMarket ?? "US"}`
    );

    const tracks = fetchedTracks.tracks
      .filter(this.filterNullOrUndefined)
      .map((track) => this.buildmewslinkTrack(track, requester, artist.images[0]?.url));

    return { tracks, name: artist.name };
  }

  private async getPlaylist(id: string, requester: unknown): Promise<Result> {
    const playlist = await this.requestManager.makeRequest<PlaylistResult>(
      `/playlists/${id}?market=${this.options.searchMarket ?? "US"}`
    );

    const tracks = playlist.tracks.items
      .filter(this.filterNullOrUndefined)
      .map((track) => this.buildmewslinkTrack(track.track, requester, playlist.images[0]?.url));

    if (playlist && tracks.length) {
      let next = playlist.tracks.next;
      let page = 1;
      while (
        next &&
        // @ts-ignore
        (!this.options.playlistPageLimit ? true : (page < this.options.playlistPageLimit ?? 1))
      ) {
        const nextTracks = await this.requestManager.makeRequest<PlaylistTracks>(next ?? "", true);
        page++;
        if (nextTracks.items.length) {
          next = nextTracks.next;
          tracks.push(
            ...nextTracks.items
              .filter(this.filterNullOrUndefined)
              .filter((a) => a.track)
              .map((track) =>
                this.buildmewslinkTrack(track.track!, requester, playlist.images[0]?.url)
              )
          );
        }
      }
    }
    return { tracks, name: playlist.name };
  }

  private filterNullOrUndefined(obj: unknown): obj is unknown {
    return obj !== undefined && obj !== null;
  }

  private buildmewslinkTrack(spotifyTrack: Track, requester: unknown, thumbnail?: string) {
    return new MewslinkTrack(
      {
        encoded: "",
        info: {
          sourceName: "spotify",
          identifier: spotifyTrack.id,
          isSeekable: true,
          author: spotifyTrack.artists[0] ? spotifyTrack.artists[0].name : "Unknown",
          length: spotifyTrack.duration_ms,
          isStream: false,
          position: 0,
          title: spotifyTrack.name,
          uri: `https://open.spotify.com/track/${spotifyTrack.id}`,
          artworkUrl: thumbnail ? thumbnail : spotifyTrack.album?.images[0]?.url,
        },
        pluginInfo: {
          name: this.name(),
        },
      },
      requester
    );
  }
}

/** @ignore */
export interface SearchResult {
  tracks: Tracks;
}
/** @ignore */
export interface Result {
  tracks: MewslinkTrack[];
  name?: string;
}
/** @ignore */
export interface TrackResult {
  album: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;

  duration_ms: number;
  explicit: boolean;
  external_ids: ExternalIds;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  popularity: number;
  preview_url: string;
  track: any;
  track_number: number;
  type: string;
  uri: string;
}
/** @ignore */
export interface AlbumResult {
  album_type: string;
  artists: Artist[];
  available_markets: string[];
  copyrights: Copyright[];
  external_ids: ExternalIds;
  external_urls: ExternalUrls;
  genres: string[];
  href: string;
  id: string;
  images: Image[];
  label: string;
  name: string;
  popularity: number;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  tracks: Tracks;
  type: string;
  uri: string;
}
/** @ignore */
export interface ArtistResult {
  tracks: Track[];
}
/** @ignore */
export interface PlaylistResult {
  collaborative: boolean;
  description: string;
  external_urls: ExternalUrls;
  followers: Followers;
  href: string;
  id: string;
  images: Image[];
  name: string;
  owner: Owner;
  primary_color: string | null;
  public: boolean;
  snapshot_id: string;
  tracks: PlaylistTracks;
  type: string;
  uri: string;
}
/** @ignore */
export interface Owner {
  display_name: string;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  type: string;
  uri: string;
}
/** @ignore */
export interface Followers {
  href: string | null;
  total: number;
}
/** @ignore */
export interface Tracks {
  href: string;
  items: Track[];
  next: string | null;
}
/** @ignore */
export interface PlaylistTracks {
  href: string;
  items: SpecialTracks[];
  limit: number;
  next: string | null;
  offset: number;
  previous: string | null;
  total: number;
}
/** @ignore */
export interface SpecialTracks {
  added_at: string;
  is_local: boolean;
  primary_color: string | null;
  track: Track;
}
/** @ignore */
export interface Copyright {
  text: string;
  type: string;
}
/** @ignore */
export interface ExternalUrls {
  spotify: string;
}
/** @ignore */
export interface ExternalIds {
  isrc: string;
}
/** @ignore */
export interface Album {
  album_type: string;
  artists: Artist[];
  available_markets: string[];
  external_urls: { [key: string]: string };
  href: string;
  id: string;
  images: Image[];
  name: string;
  release_date: string;
  release_date_precision: string;
  total_tracks: number;
  type: string;
  uri: string;
}
/** @ignore */
export interface Image {
  height: number;
  url: string;
  width: number;
}
/** @ignore */
export interface Artist {
  external_urls: {
    spotify: string;
  };
  followers: {
    href: string;
    total: number;
  };
  genres: [];
  href: string;
  id: string;
  images: Image[];
  name: string;
  popularity: number;
  type: string;
  uri: string;
}
/** @ignore */
export interface Track {
  album?: Album;
  artists: Artist[];
  available_markets: string[];
  disc_number: number;
  duration_ms: number;
  explicit: boolean;
  external_urls: ExternalUrls;
  href: string;
  id: string;
  is_local: boolean;
  name: string;
  preview_url: string;
  track_number: number;
  type: string;
  uri: string;
}
