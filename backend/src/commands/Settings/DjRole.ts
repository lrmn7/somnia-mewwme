import {
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  EmbedBuilder,
} from "discord.js";
import { Manager } from "../../manager.js";
import { Command, Accessableby } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";

const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["djrole"];
  public description = "Manage the DJ role system for this server";
  public category = "Settings";
  public accessableby = data.COMMANDS_ACCESS.SETTINGS.DjRole;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;

  public options = [
    {
      name: "action",
      description: "Choose to set or disable the DJ role",
      required: true,
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: "set", value: "set" },
        { name: "disable", value: "disable" },
      ],
    },
    {
      name: "role",
      description: "The role you want to grant DJ access to (only required for 'set' action)",
      required: false,
      type: ApplicationCommandOptionType.Role,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    await handler.deferReply();

    // @ts-ignore
    const options = handler.interaction.options as CommandInteractionOptionResolver;
    const action = options.getString("action");
    const role = options.getRole("role");
    const guildId = handler.guild!.id;

    let djData = await client.db.DjRole.get(guildId);

    if (!djData) {
      djData = {
        guild: guildId,
        enable: false,
        roleid: null,
      };
    }

    if (action === "disable") {
      djData.enable = false;
      await client.db.DjRole.set(guildId, djData);

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "dj_role_disabled")}`
        )
        .setColor(client.color_main);

      await handler.editReply({ embeds: [embed] });
      return;
    }

    if (action === "set") {
      if (!role) {
        await handler.editReply({
          embeds: [
            new EmbedBuilder()
              .setDescription(
                `${client.i18n.get(handler.language, "commands.settings", "dj_role_missing_role")}`
              )
              .setColor(client.color_main),
          ],
        });
        return;
      }

      djData.roleid = role.id;
      djData.enable = true;

      await client.db.DjRole.set(guildId, djData);

      const djCommandsList = client.commands
        .filter((cmd) => cmd.djRole === true)
        .map((cmd) => `\`/${cmd.name[0]}\``)
        .join(", ");

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(handler.language, "commands.settings", "dj_role_set", {
            role: `<@&${role.id}>`,
            commands: djCommandsList || "None",
          })}`
        )
        .setColor(client.color_main);

      await handler.editReply({ embeds: [embed] });
      return;
    }
  }
}
