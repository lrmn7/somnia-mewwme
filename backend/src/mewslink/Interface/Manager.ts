import { AbstractLibrary } from "../Library/AbstractLibrary.js";
import { MewslinkPlugin } from "../Plugin/MewslinkPlugin.js";
import { MewslinkTrack } from "../Player/MewslinkTrack.js";
import { MewslinkNodeManager } from "../Manager/MewslinkNodeManager.js";
import { MewslinkNode } from "../Node/MewslinkNode.js";
import { MewslinkRest } from "../Node/MewslinkRest.js";
import { MewslinkPlayer } from "../Player/MewslinkPlayer.js";
import { AbstractDriver } from "../Drivers/AbstractDriver.js";
import { MewslinkQueue } from "../Player/MewslinkQueue.js";

/**
 * A structure interface
 */
export type Constructor<T> = new (...args: any[]) => T;

export interface Structures {
  /**
   * A custom structure that extends the MewslinkRest class
   */
  rest?: Constructor<MewslinkRest>;
  /**
   * A custom structure that extends the MewslinkPlayer class
   */
  player?: Constructor<MewslinkPlayer>;
  /**
   * A custom structure that extends the MewslinkQueue class
   */
  queue?: Constructor<MewslinkQueue>;
}

/**
 * Mewslink node option interface
 */
export interface MewslinkNodeOptions {
  /** Name for get the lavalink server info in mewslink */
  name: string;
  /** The ip address or domain of lavalink server */
  host: string;
  /** The port that lavalink server exposed */
  port: number;
  /** The password of lavalink server */
  auth: string;
  /** Whenever lavalink user ssl or not */
  secure: boolean;
  /** The driver class for handling lavalink response */
  driver?: string;
}

/**
 * Some mewslink additional config option
 */
export interface MewslinkAdditionalOptions {
  /** Additional custom driver for mewslink */
  additionalDriver?: AbstractDriver[];
  /** Timeout before trying to reconnect (ms) */
  retryTimeout?: number;
  /** Number of times to try and reconnect to Lavalink before giving up */
  retryCount?: number;
  /** The retry timeout for voice manager when dealing connection to discord voice server (ms) */
  voiceConnectionTimeout?: number;
  /** The default search engine like default search from youtube, spotify,... */
  defaultSearchEngine?: string;
  /** The default volume when create a player */
  defaultVolume?: number;
  /** Search track from youtube when track resolve failed */
  searchFallback?: {
    /** Whenever enable this search fallback or not */
    enable: boolean;
    /** Choose a fallback search engine, recommended soundcloud and youtube */
    engine: string;
  };
  /** Whether to resume a connection on disconnect to Lavalink (Server Side) (Note: DOES NOT RESUME WHEN THE LAVALINK SERVER DIES) */
  resume?: boolean;
  /** When the seasion is deleted from Lavalink. Use second (Server Side) (Note: DOES NOT RESUME WHEN THE LAVALINK SERVER DIES) */
  resumeTimeout?: number;
  /** User Agent to use when making requests to Lavalink */
  userAgent?: string;
  /** Node Resolver to use if you want to customize it */
  nodeResolver?: (nodes: MewslinkNodeManager) => Promise<MewslinkNode | undefined>;
  /** Custom structures for mewslink to use */
  structures?: Structures;
}

/**
 * Mewslink config interface
 */
export interface MewslinkOptions {
  /** The lavalink server credentials array*/
  nodes: MewslinkNodeOptions[];
  /** The discord library for using voice manager, example: discordjs, erisjs. Check {@link Library} */
  library: AbstractLibrary;
  /** The mewslink plugins array. Check {@link Plugin} */
  plugins?: MewslinkPlugin[];
  /** Mewslink additional options  */
  options?: MewslinkAdditionalOptions;
}

/**
 * The type enum of mewslink search function result
 */
export enum MewslinkSearchResultType {
  TRACK = "TRACK",
  PLAYLIST = "PLAYLIST",
  SEARCH = "SEARCH",
}

/**
 * The mewslink search function result interface
 */
export interface MewslinkSearchResult {
  type: MewslinkSearchResultType;
  playlistName?: string;
  tracks: MewslinkTrack[];
}

/**
 * The mewslink search function options interface
 */
export interface MewslinkSearchOptions {
  /** User info of who request the song */
  requester?: unknown;
  /** Which node do user want to use (get using node name) */
  nodeName?: string;
  /** Which search engine do user want to use (get using search engine name) */
  engine?: string;
}
