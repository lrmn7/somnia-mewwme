import { VoiceState } from "discord.js";
import { Manager } from "../../manager.js";

export default class {
  async execute(client: Manager, oldState: VoiceState, newState: VoiceState) {
    try {
      if (newState.channel === null && newState.id !== client.user!.id)
        client.wsl.get(oldState.guild.id)?.send({
          op: "memberLeave",
          guild: oldState.guild.id,
          userId: oldState.member?.id,
        });
    } catch (err) {
      client.logger.error("WebSocket:memberLeave", `Failed to emit event: ${String(err)}`);
    }
  }
}
