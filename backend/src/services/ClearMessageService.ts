import { Manager } from "../manager.js";
import { TextChannel } from "discord.js";
import { MewslinkPlayer } from "../mewslink/main.js";

export class ClearMessageService {
  client: Manager;
  channel: TextChannel;
  player: MewslinkPlayer;
  constructor(client: Manager, channel: TextChannel, player: MewslinkPlayer) {
    this.channel = channel;
    this.client = client;
    this.player = player;
    this.execute();
  }

  async execute() {
    try {
      const nplayingMsg = this.client.nplayingMsg.get(this.player.guildId);
      if (!nplayingMsg) return;
      nplayingMsg.coll.stop();
      nplayingMsg.msg.delete().catch(() => null);
      this.client.nplayingMsg.delete(this.player.guildId);
    } catch (err) {}
  }
}
