import {
  MewslinkAdditionalOptions,
  MewslinkOptions,
  MewslinkSearchOptions,
  MewslinkSearchResult,
  MewslinkSearchResultType,
} from "./Interface/Manager.js";
import { EventEmitter } from "node:events";
import { MewslinkNode } from "./Node/MewslinkNode.js";
import { AbstractLibrary } from "./Library/AbstractLibrary.js";
import { VoiceChannelOptions } from "./Interface/Player.js";
import { MewslinkPlayerManager } from "./Manager/MewslinkPlayerManager.js";
import { MewslinkNodeManager } from "./Manager/MewslinkNodeManager.js";
import {
  LavalinkLoadType,
  MewslinkEvents,
  MewslinkPluginType,
  SourceIDs,
} from "./Interface/Constants.js";
import { MewslinkTrack } from "./Player/MewslinkTrack.js";
import { RawTrack } from "./Interface/Rest.js";
import { MewslinkPlayer } from "./Player/MewslinkPlayer.js";
import { SourceMewslinkPlugin } from "./Plugin/SourceMewslinkPlugin.js";
import { MewslinkQueue } from "./Player/MewslinkQueue.js";
import { metadata } from "./metadata.js";
import { MewslinkPlugin } from "./Plugin/MewslinkPlugin.js";
import { AbstractDriver } from "./Drivers/AbstractDriver.js";
import { Lavalink3 } from "./Drivers/Lavalink3.js";
import { Nodelink2 } from "./Drivers/Nodelink2.js";
import { Lavalink4 } from "./Drivers/Lavalink4.js";
import { MewslinkDatabase } from "./Utilities/MewslinkDatabase.js";

export declare interface Mewslink {
  /* tslint:disable:unified-signatures */
  // ------------------------- ON EVENT ------------------------- //
  /**
   * Emitted when mewslink have a debug log.
   * @event Mewslink#debug
   */
  on(event: "debug", listener: (logs: string) => void): this;

  ////// ------------------------- Node Event ------------------------- /////
  /**
   * Emitted when a lavalink server is connected.
   * @event Mewslink#nodeConnect
   */
  on(event: "nodeConnect", listener: (node: MewslinkNode) => void): this;
  /**
   * Emitted when a lavalink server is disconnected.
   * @event Mewslink#nodeDisconnect
   */
  on(
    event: "nodeDisconnect",
    listener: (node: MewslinkNode, code: number, reason: Buffer) => void
  ): this;
  /**
   * Emitted when a lavalink server is closed.
   * @event Mewslink#nodeClosed
   */
  on(event: "nodeClosed", listener: (node: MewslinkNode) => void): this;
  /**
   * Emitted when a lavalink server is errored.
   * @event Mewslink#nodeError
   */
  on(event: "nodeError", listener: (node: MewslinkNode, error: Error) => void): this;
  ////// ------------------------- Node Event ------------------------- /////

  ////// ------------------------- Player Event ------------------------- /////
  /**
   * Emitted when a player is created.
   * @event Mewslink#playerCreate
   */
  on(event: "playerCreate", listener: (player: MewslinkPlayer) => void): this;
  /**
   * Emitted when a player is going to destroyed.
   * @event Mewslink#playerDestroy
   */
  on(event: "playerDestroy", listener: (player: MewslinkPlayer) => void): this;
  /**
   * Emitted when a player have an exception.
   * @event Mewslink#playerException
   */
  on(
    event: "playerException",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /**
   * Emitted when a player updated info.
   * @event Mewslink#playerUpdate
   */
  on(
    event: "playerUpdate",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /**
   * Emitted when a playuer is moved into another channel. [Require plugin]
   * @event Mewslink#playerMoved
   */
  on(
    event: "playerMoved",
    listener: (player: MewslinkPlayer, oldChannelId: string, newChannelId: string) => void
  ): this;
  /**
   * Emitted when a track paused.
   * @event Mewslink#playerPause
   */
  on(event: "playerPause", listener: (player: MewslinkPlayer, track: MewslinkTrack) => void): this;
  /**
   * Emitted when a track resumed.
   * @event Mewslink#playerResume
   */
  on(event: "playerResume", listener: (player: MewslinkPlayer, data: MewslinkTrack) => void): this;
  /**
   * Emitted when a player's websocket closed.
   * @event Mewslink#playerWebsocketClosed
   */
  on(
    event: "playerWebsocketClosed",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /**
   * Emitted when a player is stopped (not destroyed).
   * @event Mewslink#playerResume
   */
  on(event: "playerStop", listener: (player: MewslinkPlayer) => void): this;
  ////// ------------------------- Player Event ------------------------- /////

  ////// ------------------------- Track Event ------------------------- /////
  /**
   * Emitted when a track is going to play.
   * @event Mewslink#trackStart
   */
  on(event: "trackStart", listener: (player: MewslinkPlayer, track: MewslinkTrack) => void): this;
  /**
   * Emitted when a track is going to end.
   * @event Mewslink#trackEnd
   */
  on(event: "trackEnd", listener: (player: MewslinkPlayer) => void): this;
  /**
   * Emitted when a track stucked.
   * @event Mewslink#trackStuck
   */
  on(
    event: "trackStuck",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /**
   * Emitted when a track is failed to resolve using fallback search engine.
   * @event Mewslink#trackResolveError
   */
  on(
    event: "trackResolveError",
    listener: (player: MewslinkPlayer, track: MewslinkTrack, message: string) => void
  ): this;
  ////// ------------------------- Track Event ------------------------- /////

  ////// ------------------------- Queue Event ------------------------- /////
  /**
   * Emitted when a track added into queue.
   * @event Mewslink#queueAdd
   */
  on(
    event: "queueAdd",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue, track: MewslinkTrack) => void
  ): this;
  /**
   * Emitted when a track removed from queue.
   * @event Mewslink#queueRemove
   */
  on(
    event: "queueRemove",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue, track: MewslinkTrack) => void
  ): this;
  /**
   * Emitted when a queue shuffled.
   * @event Mewslink#queueShuffle
   */
  on(event: "queueShuffle", listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void): this;
  /**
   * Emitted when a queue cleared.
   * @event Mewslink#queueClear
   */
  on(event: "queueClear", listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void): this;
  /**
   * Emitted when a queue is empty.
   * @event Mewslink#queueEmpty
   */
  on(event: "queueEmpty", listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void): this;
  ////// ------------------------- Queue Event ------------------------- /////

  ////// ------------------------- Voice Event ------------------------- /////
  /**
   * Emitted when connected to voice receive server [ONLY Nodelink DRIVER!!!!!!].
   * @event Mewslink#voiceConnect
   */
  on(event: "voiceConnect", listener: (node: MewslinkNode) => void): this;
  /**
   * Emitted when disconnected to voice receive server [ONLY Nodelink DRIVER!!!!!!].
   * @event Mewslink#voiceDisconnect
   */
  on(
    event: "voiceDisconnect",
    listener: (node: MewslinkNode, code: number, reason: Buffer) => void
  ): this;
  /**
   * Emitted when voice receive server errored [ONLY Nodelink DRIVER!!!!!!].
   * @event Mewslink#VoiceError
   */
  on(event: "VoiceError", listener: (node: MewslinkNode, error: Error) => void): this;
  /**
   * Emitted when user started speaking [ONLY Nodelink DRIVER!!!!!!].
   * @event Mewslink#voiceStartSpeaking
   */
  on(
    event: "voiceStartSpeaking",
    listener: (node: MewslinkNode, userId: string, guildId: string) => void
  ): this;
  /**
   * Emitted when user finished speaking [ONLY Nodelink DRIVER!!!!!!].
   * @event Mewslink#voiceEndSpeaking
   */
  on(
    event: "voiceEndSpeaking",
    listener: (node: MewslinkNode, userTrack: string, userId: string, guildId: string) => void
  ): this;
  ////// ------------------------- Voice Event ------------------------- /////
  // ------------------------- ON EVENT ------------------------- //

  // ------------------------- ONCE EVENT ------------------------- //
  /** @ignore */
  once(event: "debug", listener: (logs: string) => void): this;
  ////// ------------------------- Node Event ------------------------- /////
  /** @ignore */
  once(event: "nodeConnect", listener: (node: MewslinkNode) => void): this;
  /** @ignore */
  once(
    event: "nodeDisconnect",
    listener: (node: MewslinkNode, code: number, reason: Buffer) => void
  ): this;
  /** @ignore */
  once(event: "nodeClosed", listener: (node: MewslinkNode) => void): this;
  /** @ignore */
  once(event: "nodeError", listener: (node: MewslinkNode, error: Error) => void): this;
  ////// ------------------------- Node Event ------------------------- /////

  ////// ------------------------- Player Event ------------------------- /////
  /** @ignore */
  once(event: "playerCreate", listener: (player: MewslinkPlayer) => void): this;
  /** @ignore */
  once(event: "playerDestroy", listener: (player: MewslinkPlayer) => void): this;
  /** @ignore */
  once(
    event: "playerException",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  once(
    event: "playerUpdate",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  once(
    event: "playerMoved",
    listener: (player: MewslinkPlayer, oldChannelId: string, newChannelId: string) => void
  ): this;
  /** @ignore */
  once(
    event: "playerPause",
    listener: (player: MewslinkPlayer, track: MewslinkTrack) => void
  ): this;
  /** @ignore */
  once(
    event: "playerResume",
    listener: (player: MewslinkPlayer, data: MewslinkTrack) => void
  ): this;
  /** @ignore */
  once(
    event: "playerWebsocketClosed",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  once(event: "playerStop", listener: (player: MewslinkPlayer) => void): this;
  ////// ------------------------- Player Event ------------------------- /////

  ////// ------------------------- Track Event ------------------------- /////
  /** @ignore */
  once(event: "trackStart", listener: (player: MewslinkPlayer, track: MewslinkTrack) => void): this;
  /** @ignore */
  once(event: "trackEnd", listener: (player: MewslinkPlayer) => void): this;
  /** @ignore */
  once(
    event: "trackStuck",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  once(
    event: "trackResolveError",
    listener: (player: MewslinkPlayer, track: MewslinkTrack, message: string) => void
  ): this;
  ////// ------------------------- Track Event ------------------------- /////

  ////// ------------------------- Queue Event ------------------------- /////
  /** @ignore */
  once(
    event: "queueAdd",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue, track: MewslinkTrack) => void
  ): this;
  /** @ignore */
  once(
    event: "queueRemove",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue, track: MewslinkTrack) => void
  ): this;
  /** @ignore */
  once(
    event: "queueShuffle",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void
  ): this;
  /** @ignore */
  once(event: "queueClear", listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void): this;
  /** @ignore */
  once(event: "queueEmpty", listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void): this;
  ////// ------------------------- Queue Event ------------------------- /////

  ////// ------------------------- Voice Event ------------------------- /////
  /** @ignore */
  once(event: "voiceConnect", listener: (node: MewslinkNode) => void): this;
  /** @ignore */
  once(
    event: "voiceDisconnect",
    listener: (node: MewslinkNode, code: number, reason: Buffer) => void
  ): this;
  /** @ignore */
  once(event: "VoiceError", listener: (node: MewslinkNode, error: Error) => void): this;
  /** @ignore */
  once(
    event: "voiceStartSpeaking",
    listener: (node: MewslinkNode, userId: string, guildId: string) => void
  ): this;
  /** @ignore */
  once(
    event: "voiceEndSpeaking",
    listener: (node: MewslinkNode, userTrack: string, userId: string, guildId: string) => void
  ): this;
  ////// ------------------------- Voice Event ------------------------- /////
  // ------------------------- ONCE EVENT ------------------------- //

  // ------------------------- OFF EVENT ------------------------- //
  /** @ignore */
  off(event: "debug", listener: (logs: string) => void): this;
  ////// ------------------------- Node Event ------------------------- /////
  /** @ignore */
  off(event: "nodeConnect", listener: (node: MewslinkNode) => void): this;
  /** @ignore */
  off(
    event: "nodeDisconnect",
    listener: (node: MewslinkNode, code: number, reason: Buffer) => void
  ): this;
  /** @ignore */
  off(event: "nodeClosed", listener: (node: MewslinkNode) => void): this;
  /** @ignore */
  off(event: "nodeError", listener: (node: MewslinkNode, error: Error) => void): this;
  ////// ------------------------- Node Event ------------------------- /////

  ////// ------------------------- Player Event ------------------------- /////
  /** @ignore */
  off(event: "playerCreate", listener: (player: MewslinkPlayer) => void): this;
  /** @ignore */
  off(event: "playerDestroy", listener: (player: MewslinkPlayer) => void): this;
  /** @ignore */
  off(
    event: "playerException",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  off(
    event: "playerUpdate",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  off(
    event: "playerMoved",
    listener: (player: MewslinkPlayer, oldChannelId: string, newChannelId: string) => void
  ): this;
  /** @ignore */
  off(event: "playerPause", listener: (player: MewslinkPlayer, track: MewslinkTrack) => void): this;
  /** @ignore */
  off(event: "playerResume", listener: (player: MewslinkPlayer, data: MewslinkTrack) => void): this;
  /** @ignore */
  off(
    event: "playerWebsocketClosed",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  off(event: "playerStop", listener: (player: MewslinkPlayer) => void): this;
  ////// ------------------------- Player Event ------------------------- /////

  ////// ------------------------- Track Event ------------------------- /////
  /** @ignore */
  off(event: "trackStart", listener: (player: MewslinkPlayer, track: MewslinkTrack) => void): this;
  /** @ignore */
  off(event: "trackEnd", listener: (player: MewslinkPlayer) => void): this;
  /** @ignore */
  off(
    event: "trackStuck",
    listener: (player: MewslinkPlayer, data: Record<string, any>) => void
  ): this;
  /** @ignore */
  off(
    event: "trackResolveError",
    listener: (player: MewslinkPlayer, track: MewslinkTrack, message: string) => void
  ): this;
  ////// ------------------------- Track Event ------------------------- /////

  ////// ------------------------- Queue Event ------------------------- /////
  /** @ignore */
  off(
    event: "queueAdd",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue, track: MewslinkTrack) => void
  ): this;
  /** @ignore */
  off(
    event: "queueRemove",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue, track: MewslinkTrack) => void
  ): this;
  /** @ignore */
  off(
    event: "queueShuffle",
    listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void
  ): this;
  /** @ignore */
  off(event: "queueClear", listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void): this;
  /** @ignore */
  off(event: "queueEmpty", listener: (player: MewslinkPlayer, queue: MewslinkQueue) => void): this;
  ////// ------------------------- Queue Event ------------------------- /////

  ////// ------------------------- Voice Event ------------------------- /////
  /** @ignore */
  off(event: "voiceConnect", listener: (node: MewslinkNode) => void): this;
  /** @ignore */
  off(
    event: "voiceDisconnect",
    listener: (node: MewslinkNode, code: number, reason: Buffer) => void
  ): this;
  /** @ignore */
  off(event: "VoiceError", listener: (node: MewslinkNode, error: Error) => void): this;
  /** @ignore */
  off(
    event: "voiceStartSpeaking",
    listener: (node: MewslinkNode, userId: string, guildId: string) => void
  ): this;
  /** @ignore */
  off(
    event: "voiceEndSpeaking",
    listener: (node: MewslinkNode, userTrack: string, userId: string, guildId: string) => void
  ): this;
  ////// ------------------------- Voice Event ------------------------- /////
  // ------------------------- OFF EVENT ------------------------- //
}

export class Mewslink extends EventEmitter {
  /**
   * Discord library connector
   */
  public readonly library: AbstractLibrary;
  /**
   * Lavalink server that has been configured
   */
  public nodes: MewslinkNodeManager;
  /**
   * Mewslink options
   */
  public mewslinkOptions: MewslinkOptions;
  /**
   * Bot id
   */
  public id: string | undefined;
  /**
   * Player maps
   */
  public players: MewslinkPlayerManager;
  /**
   * All search engine
   */
  public searchEngines: MewslinkDatabase<string>;
  /**
   * All search plugins (resolver plugins)
   */
  public searchPlugins: MewslinkDatabase<SourceMewslinkPlugin>;
  /**
   * All plugins (include resolver plugins)
   */
  public plugins: MewslinkDatabase<MewslinkPlugin>;
  /**
   * The mewslink manager
   */
  public drivers: AbstractDriver[];
  /**
   * The current bott's shard count
   */
  public shardCount: number = 1;

  /**
   * The main class that handle all works in lavalink server.
   * Call this class by using new Mewslink(your_params) to use!
   * @param options The main ranlink options
   */
  constructor(options: MewslinkOptions) {
    super();
    if (!options.library)
      throw new Error(
        "Please set an new lib to connect, example: \nlibrary: new Library.DiscordJS(client) "
      );
    this.library = options.library.set(this);
    this.drivers = [new Lavalink3(), new Nodelink2(), new Lavalink4()];
    this.mewslinkOptions = options;
    this.mewslinkOptions.options = this.mergeDefault<MewslinkAdditionalOptions>(
      this.defaultOptions,
      this.mewslinkOptions.options ?? {}
    );
    if (
      this.mewslinkOptions.options.additionalDriver &&
      this.mewslinkOptions.options.additionalDriver?.length !== 0
    )
      this.drivers.push(...this.mewslinkOptions.options.additionalDriver);
    this.nodes = new MewslinkNodeManager(this);
    this.players = new MewslinkPlayerManager(this);
    this.searchEngines = new MewslinkDatabase<string>();
    this.searchPlugins = new MewslinkDatabase<SourceMewslinkPlugin>();
    this.plugins = new MewslinkDatabase<MewslinkPlugin>();
    this.initialSearchEngines();
    if (
      !this.mewslinkOptions.options.defaultSearchEngine ||
      this.mewslinkOptions.options.defaultSearchEngine.length == 0
    )
      this.mewslinkOptions.options.defaultSearchEngine == "spotify";

    if (this.mewslinkOptions.plugins) {
      for (const [, plugin] of this.mewslinkOptions.plugins.entries()) {
        if (plugin.constructor.name !== "MewslinkPlugin")
          throw new Error("Plugin must be an instance of MewslinkPlugin or SourceMewslinkPlugin");
        plugin.load(this);

        this.plugins.set(plugin.name(), plugin);

        if (plugin.type() == MewslinkPluginType.SourceResolver) {
          const newPlugin = plugin as SourceMewslinkPlugin;
          const sourceName = newPlugin.sourceName();
          const sourceIdentify = newPlugin.sourceIdentify();
          this.searchEngines.set(sourceName, sourceIdentify);
          this.searchPlugins.set(sourceName, newPlugin);
        }
      }
    }
    this.library.listen(this.mewslinkOptions.nodes);
  }

  protected initialSearchEngines() {
    for (const data of SourceIDs) {
      this.searchEngines.set(data.name, data.id);
    }
  }

  /**
   * Create a new player.
   * @returns MewslinkNode
   */
  async create(options: VoiceChannelOptions): Promise<MewslinkPlayer> {
    return await this.players.create(options);
  }

  /**
   * Destroy a specific player.
   * @returns void
   */
  async destroy(guildId: string): Promise<void> {
    this.players.destroy(guildId);
  }

  /**
   * Search a specific track.
   * @returns MewslinkSearchResult
   */
  async search(query: string, options?: MewslinkSearchOptions): Promise<MewslinkSearchResult> {
    const node =
      options && options?.nodeName
        ? (this.nodes.get(options.nodeName) ?? (await this.nodes.getLeastUsed()))
        : await this.nodes.getLeastUsed();

    if (!node) throw new Error("No node is available");

    let pluginData: MewslinkSearchResult;

    const directSearchRegex = /directSearch=(.*)/;
    const isDirectSearch = directSearchRegex.exec(query);
    const isUrl = /^https?:\/\/.*/.test(query);

    const pluginSearch = this.searchPlugins.get(String(options?.engine));

    if (
      options &&
      options!.engine &&
      options!.engine !== null &&
      pluginSearch &&
      isDirectSearch == null
    ) {
      pluginData = await pluginSearch.searchDirect(query, options);
      if (pluginData.tracks.length !== 0) return pluginData;
    }

    const source =
      options && options?.engine
        ? this.searchEngines.get(options.engine)
        : this.searchEngines.get(
            this.mewslinkOptions.options!.defaultSearchEngine
              ? this.mewslinkOptions.options!.defaultSearchEngine
              : "spotify"
          );

    const finalQuery =
      isDirectSearch !== null ? isDirectSearch[1] : !isUrl ? `${source}search:${query}` : query;

    const result = await node.rest.resolver(finalQuery).catch(() => null);
    if (!result || result.loadType === LavalinkLoadType.EMPTY) {
      return this.buildSearch(undefined, [], MewslinkSearchResultType.SEARCH);
    }

    let loadType: MewslinkSearchResultType;
    let normalizedData: {
      playlistName?: string;
      tracks: RawTrack[];
    } = { tracks: [] };
    switch (result.loadType) {
      case LavalinkLoadType.TRACK: {
        loadType = MewslinkSearchResultType.TRACK;
        normalizedData.tracks = [result.data];
        break;
      }

      case LavalinkLoadType.PLAYLIST: {
        loadType = MewslinkSearchResultType.PLAYLIST;
        normalizedData = {
          playlistName: result.data.info.name,
          tracks: result.data.tracks,
        };
        break;
      }

      case LavalinkLoadType.SEARCH: {
        loadType = MewslinkSearchResultType.SEARCH;
        normalizedData.tracks = result.data;
        break;
      }

      default: {
        loadType = MewslinkSearchResultType.SEARCH;
        normalizedData.tracks = [];
        break;
      }
    }

    this.emit(
      MewslinkEvents.Debug,
      `[Mewslink] / [Search] | Searched ${query}; Track results: ${normalizedData.tracks.length}`
    );

    return this.buildSearch(
      normalizedData.playlistName ?? undefined,
      normalizedData.tracks.map(
        (track) =>
          new MewslinkTrack(track, options && options.requester ? options.requester : undefined)
      ),
      loadType
    );
  }

  protected buildSearch(
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

  protected get defaultOptions(): MewslinkAdditionalOptions {
    return {
      additionalDriver: [],
      retryTimeout: 3000,
      retryCount: 15,
      voiceConnectionTimeout: 30000,
      defaultSearchEngine: "spotify",
      defaultVolume: 100,
      searchFallback: {
        enable: true,
        engine: "spotify",
      },
      resume: false,
      userAgent: `Discord/Bot/${metadata.name}/${metadata.version} (${metadata.github})`,
      nodeResolver: undefined,
      structures: undefined,
      resumeTimeout: 300,
    };
  }

  protected mergeDefault<T extends { [key: string]: any }>(def: T, given: T): Required<T> {
    if (!given) return def as Required<T>;
    const defaultKeys: (keyof T)[] = Object.keys(def);
    for (const key in given) {
      if (defaultKeys.includes(key)) continue;
      if (this.isNumber(key)) continue;
      delete given[key];
    }
    for (const key of defaultKeys) {
      if (Array.isArray(given[key]) && given[key] !== null && given[key] !== undefined) {
        if (given[key].length == 0) given[key] = def[key];
      }
      if (def[key] === null || (typeof def[key] === "string" && def[key].length === 0)) {
        if (!given[key]) given[key] = def[key];
      }
      if (given[key] === null || given[key] === undefined) given[key] = def[key];
      if (typeof given[key] === "object" && given[key] !== null) {
        this.mergeDefault(def[key], given[key]);
      }
    }
    return given as Required<T>;
  }

  protected isNumber(data: string): boolean {
    return /^[+-]?\d+(\.\d+)?$/.test(data);
  }
}
