import { ApplicationCommandOptionType, MessageFlags } from "discord.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["themes"];
  public description = "Change themes music card";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.Themes;
  public usage = "<themes>";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "themes",
      description: "Avalible: Classic, Dynamic and more..",
      required: true,
      type: ApplicationCommandOptionType.String,
      choices: [
        {
          name: "Default",
          value: data.features.MusicCard.Themes,
        },
        {
          name: "Classic",
          value: "themes8",
        },
        {
          name: "Dynamic",
          value: "themes11",
        },
        {
          name: "Kobo Kanaeru",
          value: "kobokanaeru",
        },
        {
          name: "Vestia Zeta",
          value: "vestiazeta",
        },
        {
          name: "Yui",
          value: "yui",
        },
        {
          name: "Miko Radio",
          value: "miko",
        },
        {
          name: "Dark Silent",
          value: "themes19",
        },
        {
          name: "Dark Sky",
          value: "themes10",
        },
        {
          name: "Pinky",
          value: "themes17",
        },
        {
          name: "Green Vibes",
          value: "themes16",
        },
        {
          name: "Cutes",
          value: "cute",
        },
      ],
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    let name = handler.args[0];
    const ChoicesName = this.options[0].choices.find((choice) => choice.value === name);

    if (!ChoicesName) {
      await handler.interaction.reply({
        content: `${client.i18n.get(handler.language, "commands.settings", "error_themes")}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const new_data = {
      userId: handler.user!.id,
      username: handler.user!.username,
      theme: name,
    };

    await client.db.Themes.set(`${handler.user!.id}`, new_data);
    await handler.interaction.reply({
      content: `${client.i18n.get(handler.language, "commands.settings", "succes_themes", {
        themes: ChoicesName.name,
      })}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
