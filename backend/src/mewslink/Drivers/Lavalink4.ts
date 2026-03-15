import { Mewslink } from "../Mewslink.js";
import { metadata } from "../metadata.js";
import { MewslinkEvents } from "../Interface/Constants.js";
import { MewslinkRequesterOptions } from "../Interface/Rest.js";
import { MewslinkNode } from "../Node/MewslinkNode.js";
import { AbstractDriver } from "./AbstractDriver.js";
import util from "node:util";
import { MewslinkPlayer } from "../Player/MewslinkPlayer.js";
import { MewslinkWebsocket } from "../Utilities/MewslinkWebsocket.js";
import { MewslinkDatabase } from "../Utilities/MewslinkDatabase.js";

export class Lavalink4 extends AbstractDriver {
  public id: string = "lavalink/v4";
  public wsUrl: string = "";
  public httpUrl: string = "";
  public sessionId: string | null;
  public playerFunctions: MewslinkDatabase<(player: MewslinkPlayer, ...args: any) => unknown>;
  public functions: MewslinkDatabase<(manager: Mewslink, ...args: any) => unknown>;
  protected wsClient?: MewslinkWebsocket;
  public manager: Mewslink | null = null;
  public node: MewslinkNode | null = null;

  constructor() {
    super();
    this.playerFunctions = new MewslinkDatabase<
      (player: MewslinkPlayer, ...args: any) => unknown
    >();
    this.functions = new MewslinkDatabase<(manager: Mewslink, ...args: any) => unknown>();
    this.sessionId = null;
  }

  public get isRegistered(): boolean {
    return (
      this.manager !== null &&
      this.node !== null &&
      this.wsUrl.length !== 0 &&
      this.httpUrl.length !== 0
    );
  }

  public initial(manager: Mewslink, node: MewslinkNode): void {
    this.manager = manager;
    this.node = node;
    this.wsUrl = `${this.node.options.secure ? "wss" : "ws"}://${this.node.options.host}:${this.node.options.port}/v4/websocket`;
    this.httpUrl = `${this.node.options.secure ? "https://" : "http://"}${this.node.options.host}:${this.node.options.port}/v4`;
  }

  public connect(): MewslinkWebsocket {
    if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    const isResume = this.manager!.mewslinkOptions.options!.resume;
    const ws = new MewslinkWebsocket(this.wsUrl, {
      headers: {
        authorization: this.node!.options.auth,
        "user-id": this.manager!.id,
        "client-name": `${metadata.name}/${metadata.version} (${metadata.github})`,
        "session-id": this.sessionId !== null && isResume ? this.sessionId : "",
        "user-agent": this.manager!.mewslinkOptions.options!.userAgent!,
        "num-shards": this.manager!.shardCount,
      },
    });

    ws.on("open", () => {
      this.node!.wsOpenEvent();
    });
    ws.on("message", (data) => this.wsMessageEvent(data));
    ws.on("error", (err) => this.node!.wsErrorEvent(err));
    ws.on("close", (code: number, reason: Buffer) => {
      this.node!.wsCloseEvent(code, reason);
      ws.removeAllListeners();
    });
    this.wsClient = ws;
    return ws;
  }

  public async requester<D = any>(options: MewslinkRequesterOptions): Promise<D | undefined> {
    if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    if (options.path.includes("/sessions") && this.sessionId == null)
      throw new Error("sessionId not initalized! Please wait for lavalink get connected!");
    const url = new URL(`${this.httpUrl}${options.path}`);
    if (options.params) url.search = new URLSearchParams(options.params).toString();

    if (options.data) {
      options.body = JSON.stringify(options.data);
    }

    const lavalinkHeaders = {
      authorization: this.node!.options.auth,
      "user-agent": this.manager!.mewslinkOptions.options!.userAgent!,
      ...options.headers,
    };

    options.headers = lavalinkHeaders;

    const res = await fetch(url, options);

    if (res.status == 204) {
      this.debug("Player now destroyed");
      return undefined;
    }
    if (res.status !== 200) {
      this.debug(
        `${options.method ?? "GET"} ${url.pathname + url.search} payload=${options.body ? String(options.body) : "{}"}`
      );
      this.debug(
        "Something went wrong with lavalink server. " +
          `Status code: ${res.status}\n Headers: ${util.inspect(options.headers)}`
      );
      return undefined;
    }

    const finalData = await res.json();

    this.debug(
      `${options.method ?? "GET"} ${url.pathname + url.search} payload=${options.body ? String(options.body) : "{}"}`
    );

    return finalData as D;
  }

  protected wsMessageEvent(data: string) {
    if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    const wsData = JSON.parse(data.toString());
    this.node!.wsMessageEvent(wsData);
  }

  protected debug(logs: string) {
    if (!this.isRegistered) throw new Error(`Driver ${this.id} not registered by using initial()`);
    this.manager!.emit(
      MewslinkEvents.Debug,
      `[Mewslink] / [Node @ ${this.node?.options.name}] / [Driver] / [Lavalink4] | ${logs}`
    );
  }

  public wsClose(): void {
    if (this.wsClient) this.wsClient.close(1006, "Self closed");
  }

  public async updateSession(sessionId: string, mode: boolean, timeout: number): Promise<void> {
    const options: MewslinkRequesterOptions = {
      path: `/sessions/${sessionId}`,
      headers: { "content-type": "application/json" },
      method: "PATCH",
      data: {
        resuming: mode,
        timeout: timeout,
      },
    };

    await this.requester<{ resuming: boolean; timeout: number }>(options);
    this.debug(`Session updated! resume: ${mode}, timeout: ${timeout}`);
    return;
  }
}
