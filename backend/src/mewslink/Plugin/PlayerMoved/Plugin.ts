import { MewslinkEvents, MewslinkPluginType } from "../../Interface/Constants.js";
import { Mewslink } from "../../Mewslink.js";
import { MewslinkPlugin as Plugin } from "./../MewslinkPlugin.js";

export class MewslinkPlugin extends Plugin {
  private mewslink: Mewslink | null = null;

  /**
   * Initialize the plugin.
   * @param client Discord.Client
   */
  constructor(public client: any) {
    super();
  }

  /**
   * Type of the plugin
   * @returns MewslinkPluginType
   */
  public type(): MewslinkPluginType {
    return MewslinkPluginType.Default;
  }

  /**
   * Load the plugin.
   * @param mewslink mewslink
   */
  public load(mewslink: Mewslink): void {
    this.mewslink = mewslink;
    this.client.on("voiceStateUpdate", this.onVoiceStateUpdate.bind(this));
  }

  /**
   * The name of the plugin
   * @returns string
   */
  public name(): string {
    return "mewslink-playerMoved";
  }

  /**
   * Unload the plugin.
   */
  public unload(): void {
    this.client.removeListener("voiceStateUpdate", this.onVoiceStateUpdate.bind(this));
    this.mewslink = null;
  }

  private onVoiceStateUpdate(oldState: any, newState: any): void {
    if (!this.mewslink || oldState.id !== this.client.user.id) return;

    const newChannelId = newState.channelID || newState.channelId;
    const oldChannelId = oldState.channelID || oldState.channelId;
    const guildId = newState.guild.id;

    const player = this.mewslink.players.get(guildId);
    if (!player) return;

    let state = "UNKNOWN";
    if (!oldChannelId && newChannelId) state = "JOINED";
    else if (oldChannelId && !newChannelId) state = "LEFT";
    else if (oldChannelId && newChannelId && oldChannelId !== newChannelId) state = "MOVED";

    if (state === "UNKNOWN") return;
    // @ts-ignore
    this.mewslink.emit(MewslinkEvents.PlayerMoved, player, state, {
      oldChannelId,
      newChannelId,
    });
  }
}
