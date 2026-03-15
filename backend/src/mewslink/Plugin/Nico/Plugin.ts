import { MewslinkEvents, MewslinkPluginType } from "../../main.js";
import {
  MewslinkSearchOptions,
  MewslinkSearchResult,
  MewslinkSearchResultType,
} from "../../main.js";
import { MewslinkTrack } from "../../main.js";
import { Mewslink } from "../../main.js";
import { SourceMewslinkPlugin } from "../../main.js";
import NicoResolver from "./NicoResolver.js";
import search from "./NicoSearch.js";

const REGEX = RegExp(
  // https://github.com/ytdl-org/youtube-dl/blob/a8035827177d6b59aca03bd717acb6a9bdd75ada/youtube_dl/extractor/niconico.py#L162
  "https?://(?:www\\.|secure\\.|sp\\.)?nicovideo\\.jp/watch/(?<id>(?:[a-z]{2})?[0-9]+)"
);

/** The mewslink nicovideo plugin options */
export interface NicoOptions {
  /** The number of how many track u want to resolve */
  searchLimit: number;
}

export class MewslinkPlugin extends SourceMewslinkPlugin {
  /**
   * The options of the plugin.
   */
  public options: NicoOptions;
  private _search:
    | ((query: string, options?: MewslinkSearchOptions) => Promise<MewslinkSearchResult>)
    | undefined;
  private mewslink: Mewslink | null;

  private readonly methods: Record<string, (id: string, requester: unknown) => Promise<Result>>;

  /**
   * Initialize the plugin.
   * @param nicoOptions Options for run plugin
   */
  constructor(nicoOptions: NicoOptions) {
    super();
    this.options = nicoOptions;
    this.methods = {
      track: this.getTrack.bind(this),
    };
    this.mewslink = null;
  }

  /**
   * Source identify of the plugin
   * @returns string
   */
  public sourceIdentify(): string {
    return "nv";
  }

  /**
   * Source name of the plugin
   * @returns string
   */
  public sourceName(): string {
    return "nicovideo";
  }

  /**
   * Type of the plugin
   * @returns MewslinkPluginType
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
   * @param mewslink The mewslink class
   */
  public unload(mewslink: Mewslink) {
    this.mewslink = mewslink;
    mewslink.search = mewslink.search.bind(mewslink);
  }

  /** Name function for getting plugin name */
  public name(): string {
    return "mewslink-nico";
  }

  private async search(
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
    if (!this.mewslink || !this._search) throw new Error("mewslink-nico is not loaded yet.");

    if (!query) throw new Error("Query is required");
    const [, id] = REGEX.exec(query) || [];

    const isUrl = /^https?:\/\//.test(query);

    if (id) {
      this.debug(`Start search from ${this.sourceName()} plugin`);
      const _function = this.methods.track;
      const result: Result = await _function(id, options?.requester);

      const loadType = result ? MewslinkSearchResultType.TRACK : MewslinkSearchResultType.SEARCH;
      const playlistName = result.name ?? undefined;

      const tracks = result.tracks.filter(this.filterNullOrUndefined);
      return this.buildSearch(playlistName, tracks && tracks.length !== 0 ? tracks : [], loadType);
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

  private async searchTrack(query: string, requester: unknown) {
    try {
      const { data } = await search({
        q: query,
        targets: ["tagsExact"],
        fields: ["contentId"],
        sort: "-viewCounter",
        limit: 10,
      });

      const res: VideoInfo[] = [];

      for (let i = 0; i < data.length; i++) {
        const element = data[i];
        const nico = new NicoResolver(`https://www.nicovideo.jp/watch/${element.contentId}`);
        const info = await nico.getVideoInfo();
        res.push(info);
      }

      return {
        tracks: res.map((track) => this.buildmewslinkTrack(track, requester)),
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private async getTrack(id: string, requester: unknown) {
    try {
      const niconico = new NicoResolver(`https://www.nicovideo.jp/watch/${id}`);
      const info = await niconico.getVideoInfo();

      return { tracks: [this.buildmewslinkTrack(info, requester)] };
    } catch (e: any) {
      throw new Error(e);
    }
  }

  private filterNullOrUndefined(obj: unknown): obj is unknown {
    return obj !== undefined && obj !== null;
  }

  private buildmewslinkTrack(nicoTrack: any, requester: unknown) {
    return new MewslinkTrack(
      {
        encoded: "",
        info: {
          sourceName: this.sourceName(),
          identifier: nicoTrack.id,
          isSeekable: true,
          author: nicoTrack.owner ? nicoTrack.owner.nickname : "Unknown",
          length: nicoTrack.duration * 1000,
          isStream: false,
          position: 0,
          title: nicoTrack.title,
          uri: `https://www.nicovideo.jp/watch/${nicoTrack.id}`,
          artworkUrl: nicoTrack.thumbnail ? nicoTrack.thumbnail.url : "",
        },
        pluginInfo: {
          name: "mewslink.mod@nico",
        },
      },
      requester
    );
  }

  private debug(logs: string) {
    this.mewslink
      ? // @ts-ignore
        this.mewslink.emit(MewslinkEvents.Debug, `[Mewslink Nico Plugin]: ${logs}`)
      : true;
  }
}

// Interfaces
/** @ignore */
export interface Result {
  tracks: MewslinkTrack[];
  name?: string;
}
/** @ignore */
export interface OwnerInfo {
  id: number;
  nickname: string;
  iconUrl: string;
  channel: string | null;
  live: {
    id: string;
    title: string;
    url: string;
    begunAt: string;
    isVideoLive: boolean;
    videoLiveOnAirStartTime: string | null;
    thumbnailUrl: string | null;
  } | null;
  isVideoPublic: boolean;
  isMylistsPublic: boolean;
  videoLiveNotice: null;
  viewer: number | null;
}
/** @ignore */
interface OriginalVideoInfo {
  id: string;
  title: string;
  description: string;
  count: {
    view: number;
    comment: number;
    mylist: number;
    like: number;
  };
  duration: number;
  thumbnail: {
    url: string;
    middleUrl: string;
    largeUrl: string;
    player: string;
    ogp: string;
  };
  rating: {
    isAdult: boolean;
  };
  registerdAt: string;
  isPrivate: boolean;
  isDeleted: boolean;
  isNoBanner: boolean;
  isAuthenticationRequired: boolean;
  isEmbedPlayerAllowed: boolean;
  viewer: null;
  watchableUserTypeForPayment: string;
  commentableUserTypeForPayment: string;
  [key: string]: any;
}
/** @ignore */
export interface VideoInfo extends OriginalVideoInfo {
  owner: OwnerInfo;
}
