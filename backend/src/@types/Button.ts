import { ButtonInteraction, CacheType, InteractionCollector, Message } from "discord.js";
import { Manager } from "../manager.js";
import { MewslinkPlayer } from "../mewslink/main.js";

export class PlayerButton {
  name: string = "";
  accessableby: string = "";
  async run(
    client: Manager,
    message: ButtonInteraction,
    language: string,
    player: MewslinkPlayer,
    nplaying: Message,
    collector: InteractionCollector<ButtonInteraction<"cached">>
  ): Promise<any> {}
}
