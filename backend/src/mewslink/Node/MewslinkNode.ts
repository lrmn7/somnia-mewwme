import { MewslinkNodeOptions } from "../Interface/Manager.js";
import { Mewslink } from "../Mewslink.js";
import { MewslinkConnectState, MewslinkEvents } from "../Interface/Constants.js";
import { MewslinkRest } from "./MewslinkRest.js";
import { setTimeout } from "node:timers/promises";
import { MewslinkPlayerEvents } from "./MewslinkPlayerEvents.js";
import { LavalinkEventsEnum } from "../Interface/LavalinkEvents.js";
import { LavalinkNodeStatsResponse, NodeStats } from "../Interface/Node.js";
import { AbstractDriver } from "../Drivers/AbstractDriver.js";
// Drivers
import { Lavalink4 } from "../Drivers/Lavalink4.js";
import { MewslinkWebsocket } from "../Utilities/MewslinkWebsocket.js";

export class MewslinkNode {
  /** The mewslink manager */
  public manager: Mewslink;
  /** The mewslink node options */
  public options: MewslinkNodeOptions;
  /** The mewslink rest manager */
  public rest: MewslinkRest;
  /** The lavalink server online status */
  public online: boolean = false;
  protected retryCounter = 0;
  /** The lavalink server connect state */
  public state: MewslinkConnectState = MewslinkConnectState.Closed;
  /** The lavalink server all status */
  public stats: NodeStats;
  protected sudoDisconnect = false;
  protected wsEvent: MewslinkPlayerEvents;
  /** Driver for connect to current version of Nodelink/Lavalink */
  public driver: AbstractDriver;

  /**
   * The lavalink server handler class
   * @param manager The mewslink manager
   * @param options The lavalink server options
   */
  constructor(manager: Mewslink, options: MewslinkNodeOptions) {
    this.manager = manager;
    this.options = options;
    const getDriver = this.manager.drivers.filter((driver) => driver.id === options.driver);
    if (!getDriver || getDriver.length == 0) {
      this.debug("No driver was found, using lavalink v4 driver instead");
      this.driver = new Lavalink4();
    } else {
      this.debug(`Now using driver: ${getDriver[0].id}`);
      this.driver = getDriver[0];
    }
    this.driver.initial(manager, this);
    const customRest =
      this.manager.mewslinkOptions.options!.structures &&
      this.manager.mewslinkOptions.options!.structures.rest;
    this.rest = customRest
      ? new customRest(manager, options, this)
      : new MewslinkRest(manager, options, this);
    this.wsEvent = new MewslinkPlayerEvents();
    this.stats = {
      players: 0,
      playingPlayers: 0,
      uptime: 0,
      memory: {
        free: 0,
        used: 0,
        allocated: 0,
        reservable: 0,
      },
      cpu: {
        cores: 0,
        systemLoad: 0,
        lavalinkLoad: 0,
      },
      frameStats: {
        sent: 0,
        nulled: 0,
        deficit: 0,
      },
    };
  }

  /** Connect this lavalink server */
  public connect(): MewslinkWebsocket {
    return this.driver.connect();
  }

  /** @ignore */
  public wsOpenEvent() {
    this.clean(true);
    this.state = MewslinkConnectState.Connected;
    this.debug(`Node connected! URL: ${this.driver.wsUrl}`);
    this.manager.emit(MewslinkEvents.NodeConnect, this);
  }

  /** @ignore */
  public wsMessageEvent(data: Record<string, any>) {
    switch (data.op) {
      case LavalinkEventsEnum.Ready: {
        const isResume = this.manager.mewslinkOptions.options!.resume;
        const timeout = this.manager.mewslinkOptions.options?.resumeTimeout;
        this.driver.sessionId = data.sessionId;
        const customRest =
          this.manager.mewslinkOptions.options!.structures &&
          this.manager.mewslinkOptions.options!.structures.rest;
        this.rest = customRest
          ? new customRest(this.manager, this.options, this)
          : new MewslinkRest(this.manager, this.options, this);
        if (isResume && timeout) {
          this.driver.updateSession(data.sessionId, isResume, timeout);
        }
        break;
      }
      case LavalinkEventsEnum.Event: {
        this.wsEvent.initial(data, this.manager);
        break;
      }
      case LavalinkEventsEnum.PlayerUpdate: {
        this.wsEvent.initial(data, this.manager);
        break;
      }
      case LavalinkEventsEnum.Status: {
        this.stats = this.updateStatusData(data as LavalinkNodeStatsResponse);
        break;
      }
    }
  }

  /** @ignore */
  public wsErrorEvent(logs: Error) {
    this.debug(`Node errored! URL: ${this.driver.wsUrl}`);
    this.manager.emit(MewslinkEvents.NodeError, this, logs);
  }

  /** @ignore */
  public async wsCloseEvent(code: number, reason: Buffer) {
    this.online = false;
    this.state = MewslinkConnectState.Disconnected;
    this.debug(`Node disconnected! URL: ${this.driver.wsUrl}`);
    this.manager.emit(MewslinkEvents.NodeDisconnect, this, code, reason);
    if (
      !this.sudoDisconnect &&
      this.retryCounter !== this.manager.mewslinkOptions.options!.retryCount
    ) {
      await setTimeout(this.manager.mewslinkOptions.options!.retryTimeout);
      this.retryCounter = this.retryCounter + 1;
      this.reconnect(true);
      return;
    }
    this.nodeClosed();
    return;
  }

  protected nodeClosed() {
    this.manager.emit(MewslinkEvents.NodeClosed, this);
    this.debug(`Node closed! URL: ${this.driver.wsUrl}`);
    this.clean();
  }

  protected updateStatusData(data: LavalinkNodeStatsResponse): NodeStats {
    return {
      players: data.players ?? this.stats.players,
      playingPlayers: data.playingPlayers ?? this.stats.playingPlayers,
      uptime: data.uptime ?? this.stats.uptime,
      memory: data.memory ?? this.stats.memory,
      cpu: data.cpu ?? this.stats.cpu,
      frameStats: data.frameStats ?? this.stats.frameStats,
    };
  }

  /** Disconnect this lavalink server */
  public disconnect() {
    this.sudoDisconnect = true;
    this.driver.wsClose();
  }

  /** Reconnect back to this lavalink server */
  public reconnect(noClean: boolean) {
    if (!noClean) this.clean();
    this.driver.connect();
  }

  /** Clean all the lavalink server state and set to default value */
  public clean(online: boolean = false) {
    this.sudoDisconnect = false;
    this.retryCounter = 0;
    this.online = online;
    this.state = MewslinkConnectState.Closed;
  }

  protected debug(logs: string) {
    this.manager.emit(MewslinkEvents.Debug, `[Mewslink] / [Node @ ${this.options.name}] | ${logs}`);
  }
}
