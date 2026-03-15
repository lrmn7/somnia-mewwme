import {
  MewslinkSearchOptions,
  MewslinkSearchResult,
  MewslinkSearchResultType,
} from "../../Interface/Manager.js";
import { Mewslink } from "../../Mewslink.js";
import { MewslinkTrack } from "../../Player/MewslinkTrack.js";
import { SourceMewslinkPlugin } from "../SourceMewslinkPlugin.js";
import { MewslinkEvents, MewslinkPluginType } from "../../Interface/Constants.js";
import { fetch } from "undici";

const API_URL = "https://api.deezer.com/";
const REGEX = /^https?:\/\/(?:www\.)?deezer\.com\/[a-z]+\/(track|album|playlist)\/(\d+)$/;
const SHORT_REGEX = /^https:\/\/deezer\.page\.link\/[a-zA-Z0-9]{12}$/;

export class MewslinkPlugin extends SourceMewslinkPlugin {
  private manager: Mewslink | null;
  private _search?: (
    query: string,
    options?: MewslinkSearchOptions
  ) => Promise<MewslinkSearchResult>;
  private readonly methods: Record<string, (id: string, requester: unknown) => Promise<Result>>;
  /**
   * Source identify of the plugin
   * @returns string
   */
  public sourceIdentify(): string {
    return "dz";
  }

  /**
   * Source name of the plugin
   * @returns string
   */
  public sourceName(): string {
    return "deezer";
  }

  /**
   * Type of the plugin
   * @returns MewslinkPluginType
   */
  public type(): MewslinkPluginType {
    return MewslinkPluginType.SourceResolver;
  }

  /**
   * Initialize the plugin.
   */
  constructor() {
    super();
    this.methods = {
      track: this.getTrack.bind(this),
      album: this.getAlbum.bind(this),
      playlist: this.getPlaylist.bind(this),
    };
    this.manager = null;
    this._search = undefined;
  }

  /**
   * load the plugin
   * @param mewslink The mewslink class
   */
  public load(manager: Mewslink): void {
    this.manager = manager;
    this._search = manager.search.bind(manager);
    manager.search = this.search.bind(this);
  }

  /**
   * Unload the plugin
   * @param mewslink The mewslink class
   */
  public unload(mewslink: Mewslink) {
    this.manager = mewslink;
    this.manager.search = mewslink.search.bind(mewslink);
  }

  /** Name function for getting plugin name */
  public name(): string {
    return "mewslink-deezer";
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
    if (!this.manager || !this._search) throw new Error("mewslink-deezer is not loaded yet.");

    if (!query) throw new Error("Query is required");

    const isUrl = /^https?:\/\//.test(query);

    if (SHORT_REGEX.test(query)) {
      const url = new URL(query);
      const res = await fetch(url.origin + url.pathname, { method: "HEAD" });
      query = String(res.headers.get("location"));
    }

    const [, type, id] = REGEX.exec(query) || [];

    if (type in this.methods) {
      this.debug(`Start search from ${this.sourceName()} plugin`);
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

  private async searchTrack(query: string, requester: unknown): Promise<Result> {
    try {
      const req = await fetch(`${API_URL}/search/track?q=${decodeURIComponent(query)}`);
      const data = await req.json();

      const res = data as SearchResult;
      return {
        tracks: res?.data?.map((track) => this.buildMewslinkTrack(track, requester)),
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getTrack(id: string, requester: unknown): Promise<Result> {
    try {
      const request = await fetch(`${API_URL}/track/${id}/`);
      const data = await request.json();
      const track = data as DeezerTrack;

      return { tracks: [this.buildMewslinkTrack(track, requester)] };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getAlbum(id: string, requester: unknown): Promise<Result> {
    try {
      const request = await fetch(`${API_URL}/album/${id}/`);
      const data = await request.json();
      const album = data as Album;

      const tracks = album.tracks.data
        .filter(this.filterNullOrUndefined)
        .map((track) => this.buildMewslinkTrack(track, requester));

      return { tracks, name: album.title };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getPlaylist(id: string, requester: unknown): Promise<Result> {
    try {
      const request = await fetch(`${API_URL}/playlist/${id}`);
      const data = await request.json();
      const playlist = data as Playlist;

      const tracks = playlist.tracks.data
        .filter(this.filterNullOrUndefined)
        .map((track) => this.buildMewslinkTrack(track, requester));

      return { tracks, name: playlist.title };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private filterNullOrUndefined(obj: unknown): obj is unknown {
    return obj !== undefined && obj !== null;
  }

  private buildSearch(
    playlistName?: string,
    tracks: MewslinkTrack[] = [],
    type?: MewslinkSearchResultType
  ): MewslinkSearchResult {
    return {
      playlistName,
      tracks,
      type: type ?? MewslinkSearchResultType.SEARCH,
    };
  }

  private buildMewslinkTrack(dezzerTrack: any, requester: unknown) {
    return new MewslinkTrack(
      {
        encoded: "",
        info: {
          sourceName: this.sourceName(),
          identifier: dezzerTrack.id,
          isSeekable: true,
          author: dezzerTrack.artist ? dezzerTrack.artist.name : "Unknown",
          length: dezzerTrack.duration * 1000,
          isStream: false,
          position: 0,
          title: dezzerTrack.title,
          uri: `https://www.deezer.com/track/${dezzerTrack.id}`,
          artworkUrl: dezzerTrack.album ? dezzerTrack.album.cover : "",
        },
        pluginInfo: {
          name: "mewslink@deezer",
        },
      },
      requester
    );
  }

  private debug(logs: string) {
    this.manager
      ? // @ts-ignore
        this.manager.emit(MewslinkEvents.Debug, `[Mewslink Deezer Plugin]: ${logs}`)
      : true;
  }
}

// Interfaces
/** @ignore */
interface Result {
  tracks: MewslinkTrack[];
  name?: string;
}
/** @ignore */
interface Album {
  title: string;
  tracks: AlbumTracks;
}
/** @ignore */
interface AlbumTracks {
  data: DeezerTrack[];
  next: string | null;
}
/** @ignore */
interface Playlist {
  tracks: PlaylistTracks;
  title: string;
}
/** @ignore */
interface PlaylistTracks {
  data: DeezerTrack[];
  next: string | null;
}
/** @ignore */
interface DeezerTrack {
  data: MewslinkTrack[];
}
/** @ignore */
interface SearchResult {
  exception?: {
    severity: string;
    message: string;
  };
  loadType: string;
  playlist?: {
    duration_ms: number;
    name: string;
  };
  data: MewslinkTrack[];
}
