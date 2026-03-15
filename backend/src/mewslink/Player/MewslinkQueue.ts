import { MewslinkEvents } from "../Interface/Constants.js";
import { Mewslink } from "../Mewslink.js";
import { MewslinkPlayer } from "./MewslinkPlayer.js";
import { MewslinkTrack } from "./MewslinkTrack.js";

export class MewslinkQueue extends Array<MewslinkTrack> {
  /** Mewslink manager */
  manager: Mewslink;
  /** Mewslink player */
  player: MewslinkPlayer;

  /**
   * The mewslink track queue handler class
   * @param manager The mewslink manager
   * @param player The current mewslink player
   */
  constructor(manager: Mewslink, player: MewslinkPlayer) {
    super();
    this.manager = manager;
    this.player = player;
  }

  /** Get the size of queue */
  public get size() {
    return this.length;
  }

  /** Get the size of queue including current */
  public get totalSize(): number {
    return this.length + (this.current ? 1 : 0);
  }

  /** Check if the queue is empty or not */
  public get isEmpty() {
    return this.length === 0;
  }

  /** Get the queue's duration */
  public get duration() {
    return this.reduce((acc, cur) => acc + (cur.duration || 0), 0);
  }

  /** Current playing track */
  public current: MewslinkTrack | undefined | null = null;
  /** Previous playing tracks */
  public previous: MewslinkTrack[] = [];

  /**
   * Add track(s) to the queue
   * @param track MewslinkTrack to add
   * @returns MewslinkQueue
   */
  public add(track: MewslinkTrack | MewslinkTrack[]): MewslinkQueue {
    if (Array.isArray(track) && track.some((t) => !(t instanceof MewslinkTrack)))
      throw new Error("Track must be an instance of MewslinkTrack");
    if (!Array.isArray(track) && !(track instanceof MewslinkTrack)) track = [track];

    if (!this.current) {
      if (Array.isArray(track)) this.current = track.shift();
      else {
        this.current = track;
        return this;
      }
    }

    if (Array.isArray(track)) for (const t of track) this.push(t);
    else this.push(track);
    this.manager.emit(MewslinkEvents.QueueAdd, this.player, this, track);
    return this;
  }

  /**
   * Remove track from the queue
   * @param position Position of the track
   * @returns MewslinkQueue
   */
  public remove(position: number): MewslinkQueue {
    if (position < 0 || position >= this.length)
      throw new Error("Position must be between 0 and " + (this.length - 1));
    const track = this[position];
    this.splice(position, 1);
    this.manager.emit(MewslinkEvents.QueueRemove, this.player, this, track);
    return this;
  }

  /** Shuffle the queue */
  public shuffle(): MewslinkQueue {
    for (let i = this.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this[i], this[j]] = [this[j], this[i]];
    }
    this.manager.emit(MewslinkEvents.QueueShuffle, this.player, this);
    return this;
  }

  /**
   * Move a track from one position to another
   * @param from Current index of the track
   * @param to Target index for the track
   */
  public move(from: number, to: number): MewslinkQueue {
    if (from < 0 || from >= this.length)
      throw new Error("'from' must be between 0 and " + (this.length - 1));
    if (to < 0 || to >= this.length)
      throw new Error("'to' must be between 0 and " + (this.length - 1));
    if (from === to) return this;
    const [track] = this.splice(from, 1);
    this.splice(to, 0, track);
    return this;
  }

  /** Clear the queue */
  public clear(): MewslinkQueue {
    this.splice(0, this.length);
    this.manager.emit(MewslinkEvents.QueueClear, this.player, this);
    return this;
  }
}
