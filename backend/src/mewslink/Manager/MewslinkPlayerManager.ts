import { MewslinkEvents, MewslinkPlayerState, VoiceState } from "../Interface/Constants.js";
import { VoiceChannelOptions } from "../Interface/Player.js";
import { MewslinkPlayer } from "../Player/MewslinkPlayer.js";
import { Mewslink } from "../Mewslink.js";
import { MewslinkPlugin } from "../Plugin/VoiceReceiver/Plugin.js";
import { MewslinkDatabase } from "../Utilities/MewslinkDatabase.js";

export class MewslinkPlayerManager extends MewslinkDatabase<MewslinkPlayer> {
  /** The mewslink manager */
  public manager: Mewslink;

  /**
   * The main class for handling lavalink players
   * @param manager The mewslink manager
   */
  constructor(manager: Mewslink) {
    super();
    this.manager = manager;
  }

  /**
   * Create a player
   * @returns MewslinkPlayer
   * @internal
   */
  async create(options: VoiceChannelOptions): Promise<MewslinkPlayer> {
    const createdPlayer = this.get(options.guildId);
    if (createdPlayer) return createdPlayer;
    const getCustomNode = this.manager.nodes.get(String(options.nodeName ? options.nodeName : ""));
    const node = getCustomNode ? getCustomNode : await this.manager.nodes.getLeastUsed();
    if (!node) throw new Error("Can't find any nodes to connect on");
    const customPlayer =
      this.manager.mewslinkOptions.options!.structures &&
      this.manager.mewslinkOptions.options!.structures.player;
    let player = customPlayer
      ? new customPlayer(this.manager, options, node)
      : new MewslinkPlayer(this.manager, options, node);
    this.set(player.guildId, player);
    try {
      player = await player.connect();
    } catch (err) {
      this.delete(player.guildId);
      throw err;
    }
    const onUpdate = (state: VoiceState) => {
      if (state !== VoiceState.SESSION_READY) return;
      player.sendServerUpdate();
    };
    await player.sendServerUpdate();
    player.on("connectionUpdate", onUpdate);
    player.state = MewslinkPlayerState.CONNECTED;
    this.debug("Player created at " + options.guildId);
    this.manager.emit(MewslinkEvents.PlayerCreate, player);
    const voiceReceiver = this.manager.plugins.get("mewslink-voiceReceiver") as MewslinkPlugin;
    if (voiceReceiver && node.driver.id.includes("nodelink")) voiceReceiver.open(node, options);
    return player;
  }

  /**
   * Destroy a player
   * @returns The destroyed / disconnected player or undefined if none
   * @internal
   */
  public async destroy(guildId: string = ""): Promise<void> {
    const player = this.get(guildId);
    if (player) await player.destroy();
  }

  protected debug(logs: string) {
    this.manager.emit(MewslinkEvents.Debug, `[Mewslink] / [PlayerManager] | ${logs}`);
  }
}
