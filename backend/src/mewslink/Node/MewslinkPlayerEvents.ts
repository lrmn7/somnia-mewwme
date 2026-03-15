import { MewslinkEvents, MewslinkLoopMode, MewslinkPlayerState } from "../Interface/Constants.js";
import { LavalinkEventsEnum } from "../Interface/LavalinkEvents.js";
import { Mewslink } from "../Mewslink.js";

export class MewslinkPlayerEvents {
  protected readonly methods: Record<
    string,
    (manager: Mewslink, data: Record<string, any>) => void
  >;

  constructor() {
    this.methods = {
      TrackStartEvent: this.TrackStartEvent,
      TrackEndEvent: this.TrackEndEvent,
      TrackExceptionEvent: this.TrackExceptionEvent,
      TrackStuckEvent: this.TrackStuckEvent,
      WebSocketClosedEvent: this.WebSocketClosedEvent,
    };
  }

  public initial(data: Record<string, any>, manager: Mewslink) {
    if (data.op == LavalinkEventsEnum.PlayerUpdate) return this.PlayerUpdate(manager, data);
    const _function = this.methods[data.type];
    if (_function !== undefined) _function(manager, data);
  }

  protected TrackStartEvent(manager: Mewslink, data: Record<string, any>) {
    const player = manager.players.get(data.guildId);
    if (player) {
      player.playing = true;
      player.paused = false;
      manager.emit(MewslinkEvents.TrackStart, player, player.queue.current);
      manager.emit(
        MewslinkEvents.Debug,
        `[Mewslink] / [Player @ ${data.guildId}] / [Events] / [Start] | ` + JSON.stringify(data)
      );
    }
    return;
  }

  protected TrackEndEvent(manager: Mewslink, data: Record<string, any>) {
    const player = manager.players.get(data.guildId);
    if (player) {
      // This event emits STOPPED reason when destroying, so return to prevent double emit
      if (player.state === MewslinkPlayerState.DESTROYED)
        return manager.emit(
          MewslinkEvents.Debug,
          `[Mewslink] / [Player @ ${data.guildId}] / [Events] / [End] | Player ${player.guildId} destroyed from end event`
        );
      manager.emit(
        MewslinkEvents.Debug,
        `[Mewslink] / [Player @ ${data.guildId}] / [Events] / [End] | ` +
          `Tracks: ${player.queue.length} ` +
          JSON.stringify(data)
      );

      player.playing = false;
      player.paused = true;

      if (data.reason === "replaced") {
        return manager.emit(MewslinkEvents.TrackEnd, player, player.queue.current);
      }
      if (["loadFailed", "cleanup"].includes(data.reason)) {
        if (player.queue.current) player.queue.previous.push(player.queue.current);
        if (!player.queue.length && !player.sudoDestroy)
          return manager.emit(MewslinkEvents.QueueEmpty, player);
        manager.emit(MewslinkEvents.QueueEmpty, player, player.queue.current);
        player.queue.current = null;
        return player.play();
      }

      if (player.loop == MewslinkLoopMode.SONG && player.queue.current)
        player.queue.unshift(player.queue.current);
      if (player.loop == MewslinkLoopMode.QUEUE && player.queue.current)
        player.queue.push(player.queue.current);

      if (player.queue.current) player.queue.previous.push(player.queue.current);
      const currentSong = player.queue.current;
      player.queue.current = null;

      if (player.queue.length) {
        manager.emit(MewslinkEvents.TrackEnd, player, currentSong);
      } else if (!player.queue.length && !player.sudoDestroy) {
        return manager.emit(MewslinkEvents.QueueEmpty, player);
      } else return;

      return player.play();
    }
    return;
  }

  protected TrackExceptionEvent(manager: Mewslink, data: Record<string, any>) {
    const player = manager.players.get(data.guildId);
    if (player) {
      manager.emit(MewslinkEvents.PlayerException, player, data);
      manager.emit(
        MewslinkEvents.Debug,
        `[Mewslink] / [Player @ ${data.guildId}] / [Events] / [Exception] | ` + JSON.stringify(data)
      );
    }
    return;
  }

  protected TrackStuckEvent(manager: Mewslink, data: Record<string, any>) {
    const player = manager.players.get(data.guildId);
    if (player) {
      manager.emit(MewslinkEvents.TrackStuck, player, data);
      manager.emit(
        MewslinkEvents.Debug,
        `[Mewslink] / [Player @ ${data.guildId}] / [Events] / [Stuck] | ` + JSON.stringify(data)
      );
    }
    return;
  }

  protected WebSocketClosedEvent(manager: Mewslink, data: Record<string, any>) {
    const player = manager.players.get(data.guildId);
    if (player) {
      manager.emit(MewslinkEvents.PlayerWebsocketClosed, player, data);
      manager.emit(
        MewslinkEvents.Debug,
        `[Mewslink] / [Player @ ${data.guildId}] / [Events] / [WebsocketClosed] | ` +
          JSON.stringify(data)
      );
    }
    return;
  }

  protected PlayerUpdate(manager: Mewslink, data: Record<string, any>) {
    const player = manager.players.get(data.guildId);
    if (player) {
      player.position = Number(data.state.position);
      manager.emit(
        MewslinkEvents.Debug,
        `[Mewslink] / [Player @ ${data.guildId}] / [Events] / [Updated] | ` + JSON.stringify(data)
      );
      manager.emit(MewslinkEvents.PlayerUpdate, player, data);
    }
    return;
  }
}
