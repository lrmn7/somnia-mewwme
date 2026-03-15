import { MewslinkRequesterOptions } from "../Interface/Rest.js";
import { MewslinkDatabase } from "../Utilities/MewslinkDatabase.js";
import { MewslinkNode } from "../Node/MewslinkNode.js";
import { MewslinkWebsocket } from "../Utilities/MewslinkWebsocket.js";
import { MewslinkPlayer } from "../Player/MewslinkPlayer.js";
import { Mewslink } from "../Mewslink.js";

export abstract class AbstractDriver {
  /**  The id for the driver*/
  abstract id: string;
  /** Ws url for dealing connection to lavalink/nodelink server */
  abstract wsUrl: string;
  /** Http url for dealing rest request to lavalink/nodelink server */
  abstract httpUrl: string;
  /** The lavalink server season id to resume */
  abstract sessionId: string | null;
  /** All function to extend support driver on MewslinkPlayer class */
  abstract playerFunctions: MewslinkDatabase<(player: MewslinkPlayer, ...args: any) => unknown>;
  /** All function to extend support driver on Mewslink class */
  abstract functions: MewslinkDatabase<(manager: Mewslink, ...args: any) => unknown>;
  /** Mewslink manager class */
  abstract manager: Mewslink | null;
  /** Mewslink reuqested lavalink/nodelink server */
  abstract node: MewslinkNode | null;

  /**
   * Setup data and credentials for connect to lavalink/nodelink server
   * @returns void
   */
  abstract initial(manager: Mewslink, node: MewslinkNode): void;
  /**
   * Connect to lavalink/nodelink server
   * @returns WebSocket
   */
  abstract connect(): MewslinkWebsocket;
  /**
   * Fetch function for dealing rest request to lavalink/nodelink server
   * @returns Promise<D | undefined>
   */
  abstract requester<D = any>(options: MewslinkRequesterOptions): Promise<D | undefined>;
  /**
   * Close the lavalink/nodelink server
   * @returns void
   */
  abstract wsClose(): void;
  /**
   * Update a season to resume able or not
   * @returns void
   */
  abstract updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void>;
}
