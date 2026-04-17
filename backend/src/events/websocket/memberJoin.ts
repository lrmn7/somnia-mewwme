import { VoiceState } from "discord.js";
import { Manager } from "../../manager.js";

export default class {
  async execute(client: Manager, oldState: VoiceState, newState: VoiceState) {
    try {
      if (oldState.channel === null && oldState.id !== client.user!.id)
        client.wsl.get(newState.guild.id)?.send({
          op: "memberJoin",
          guild: newState.guild.id,
          userId: newState.member?.id,
        });
    } catch (err) {
      client.logger.error("WebSocket:memberJoin", `Failed to emit event: ${String(err)}`);
    }
  }
}
