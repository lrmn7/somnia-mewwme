import { MewslinkPlugin as Plugin } from "../MewslinkPlugin.js";
import { Mewslink } from "../../Mewslink.js";
import { MewslinkEvents, MewslinkPluginType } from "../../Interface/Constants.js";
import { RawData, WebSocket } from "ws";
import { MewslinkNode } from "../../Node/MewslinkNode.js";
import { metadata } from "../../metadata.js";
import { VoiceChannelOptions } from "../../Interface/Player.js";

export class MewslinkPlugin extends Plugin {
  protected manager?: Mewslink;
  /** Whenever the plugin is enabled or not */
  public enabled: boolean = false;
  protected runningWs: Map<string, WebSocket> = new Map<string, WebSocket>();

  constructor() {
    super();
  }

  /** Name function for getting plugin name */
  public name(): string {
    return "mewslink-voiceReceiver";
  }

  /** Type function for diferent type of plugin */
  public type(): MewslinkPluginType {
    return MewslinkPluginType.Default;
  }

  /** Open the ws voice reciver client */
  public open(node: MewslinkNode, voiceOptions: VoiceChannelOptions): void {
    if (!this.enabled) throw new Error("This plugin is unloaded!");
    if (!node.options.driver?.includes("nodelink"))
      throw new Error(
        "This node not support voice receiver, please use Nodelink2 to use this feature!"
      );
    const wsUrl = `${node.options.secure ? "wss" : "ws"}://${node.options.host}:${node.options.port}`;
    const ws = new WebSocket(wsUrl + "/connection/data", {
      headers: {
        Authorization: node.options.auth,
        "User-Id": this.manager!.id,
        "Client-Name": `${metadata.name}/${metadata.version} (${metadata.github})`,
        "user-agent": this.manager!.mewslinkOptions.options!.userAgent!,
        "Guild-Id": voiceOptions.guildId,
      },
    });
    this.runningWs.set(voiceOptions.guildId, ws);
    ws.on("open", () => {
      this.debug("Connected to nodelink's voice receive server!");
      this.manager?.emit(MewslinkEvents.VoiceConnect, node);
    });
    ws.on("message", (data: RawData) => this.wsMessageEvent(node, data));
    ws.on("error", (err) => {
      this.debug("Errored at nodelink's voice receive server!");
      this.manager?.emit(MewslinkEvents.VoiceError, node, err);
    });
    ws.on("close", (code: number, reason: Buffer) => {
      this.debug(
        `Disconnected to nodelink's voice receive server! Code: ${code} Reason: ${reason}`
      );
      this.manager?.emit(MewslinkEvents.VoiceDisconnect, node, code, reason);
      ws.removeAllListeners();
    });
  }

  /** Open the ws voice reciver client */
  public close(guildId: string): void {
    const targetWs = this.runningWs.get(guildId);
    if (!targetWs) return;
    targetWs.close();
    this.runningWs.delete(guildId);
    this.debug("Destroy connection to nodelink's voice receive server!");
    targetWs.removeAllListeners();
    return;
  }

  protected wsMessageEvent(node: MewslinkNode, data: RawData) {
    const wsData = JSON.parse(data.toString());
    this.debug(String(data));
    switch (wsData.type) {
      case "startSpeakingEvent": {
        this.manager?.emit(
          MewslinkEvents.VoiceStartSpeaking,
          node,
          wsData.data.userId,
          wsData.data.guildId
        );
        break;
      }
      case "endSpeakingEvent": {
        this.manager?.emit(
          MewslinkEvents.VoiceEndSpeaking,
          node,
          wsData.data.data,
          wsData.data.userId,
          wsData.data.guildId
        );
        break;
      }
    }
    // this.node.wsMessageEvent(wsData);
  }

  /** Load function for make the plugin working */
  public load(manager: Mewslink): void {
    this.manager = manager;
    this.enabled = true;
  }

  /** unload function for make the plugin stop working */
  public unload(manager: Mewslink): void {
    this.manager = manager;
    this.enabled = false;
  }

  private debug(logs: string) {
    this.manager
      ? this.manager.emit(
          MewslinkEvents.Debug,
          `[Mewslink] / [Plugin] / [Voice Receiver] | ${logs}`
        )
      : true;
  }
}
