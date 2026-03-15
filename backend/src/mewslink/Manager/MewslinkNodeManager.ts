import { MewslinkConnectState, MewslinkEvents } from "../Interface/Constants.js";
import { MewslinkNodeOptions } from "../Interface/Manager.js";
import { MewslinkNode } from "../Node/MewslinkNode.js";
import { Mewslink } from "../Mewslink.js";
import { MewslinkDatabase } from "../Utilities/MewslinkDatabase.js";

export class MewslinkNodeManager extends MewslinkDatabase<MewslinkNode> {
  /** The mewslink manager */
  public manager: Mewslink;

  /**
   * The main class for handling lavalink servers
   * @param manager
   */
  constructor(manager: Mewslink) {
    super();
    this.manager = manager;
  }

  /**
   * Add a new Node.
   * @returns MewslinkNode
   */
  public add(node: MewslinkNodeOptions) {
    const newNode = new MewslinkNode(this.manager, node);
    newNode.connect();
    this.set(node.name, newNode);
    this.debug(`Node ${node.name} added to manager!`);
    return newNode;
  }

  /**
   * Get a least used node.
   * @returns MewslinkNode
   */
  public async getLeastUsed(): Promise<MewslinkNode> {
    if (this.manager.mewslinkOptions.options!.nodeResolver) {
      const resolverData = await this.manager.mewslinkOptions.options!.nodeResolver(this);
      if (resolverData) return resolverData;
    }
    const nodes: MewslinkNode[] = this.values;

    const onlineNodes = nodes.filter((node) => node.state === MewslinkConnectState.Connected);
    if (!onlineNodes.length) throw new Error("No nodes are online");

    const temp = await Promise.all(
      onlineNodes.map(async (node) => {
        const stats = await node.rest.getStatus();
        return !stats ? { players: 0, node: node } : { players: stats.players, node: node };
      })
    );
    temp.sort((a, b) => a.players - b.players);

    return temp[0].node;
  }

  /**
   * Get all current nodes
   * @returns MewslinkNode[]
   */
  public all(): MewslinkNode[] {
    return this.values;
  }

  /**
   * Remove a node.
   * @returns void
   */
  public remove(name: string): void {
    const node = this.get(name);
    if (node) {
      node.disconnect();
      this.delete(name);
      this.debug(`Node ${name} removed from manager!`);
    }
    return;
  }

  protected debug(logs: string) {
    this.manager.emit(MewslinkEvents.Debug, `[Mewslink] / [NodeManager] | ${logs}`);
  }
}
