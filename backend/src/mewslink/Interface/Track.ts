import { MewslinkPlayer } from "../Player/MewslinkPlayer.js";

export interface ResolveOptions {
  /** Whenever u want to overwrite the track or not */
  overwrite?: boolean;
  /** Mewslink player property */
  player?: MewslinkPlayer;
  /** The name of node */
  nodeName?: string;
}
