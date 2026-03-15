import { Manager } from "../../manager.js";
import { Accessableby, Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import {
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  MessageFlags,
} from "discord.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";

const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["blacklist"];
  public description = "Manage blacklist for users or guilds";
  public category = "Admin";
  public accessableby = data.COMMANDS_ACCESS.ADMIN.BlackList;
  public usage = "";
  public aliases = [];
  public lavalink = false;
  public usingInteraction = true;
  public playerCheck = false;
  public djRole = false;
  public sameVoiceCheck = false;
  public permissions = [];
  public options = [
    {
      name: "target",
      description: "Specify what to blacklist (user/guild)",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "User", value: "user" },
        { name: "Guild", value: "guild" },
      ],
    },
    {
      name: "type",
      description: "Type of action (add/delete)",
      type: ApplicationCommandOptionType.String,
      required: true,
      choices: [
        { name: "Add", value: "add" },
        { name: "Delete", value: "delete" },
      ],
    },
    {
      name: "id",
      description: "The user or guild ID to blacklist",
      type: ApplicationCommandOptionType.String,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    // @ts-ignore
    const options = handler.interaction.options as CommandInteractionOptionResolver;
    const target = options.getString("target") as "user" | "guild";
    const type = options.getString("type") as "add" | "delete";
    const id = options.getString("id")!;

    const isBlacklisted =
      target === "user"
        ? await client.db.BlacklistUser.get(id)
        : await client.db.BlacklistGuild.get(id);

    const entityType = target === "user" ? "user" : "guild";
    const dbAction = target === "user" ? client.db.BlacklistUser : client.db.BlacklistGuild;

    if (type === "add") {
      if (isBlacklisted) {
        await handler.interaction.reply({
          content: `${client.i18n.get(
            handler.language,
            "commands.admin",
            `blacklist_${entityType}_already`,
            {
              id,
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            }
          )}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await dbAction.set(id, true);
      await handler.interaction.reply({
        content: `${client.i18n.get(
          handler.language,
          "commands.admin",
          `blacklist_${entityType}_add`,
          {
            id,
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          }
        )}`,
        flags: MessageFlags.Ephemeral,
      });
    } else if (type === "delete") {
      if (!isBlacklisted) {
        await handler.interaction.reply({
          content: `${client.i18n.get(
            handler.language,
            "commands.admin",
            `blacklist_${entityType}_not_exist`,
            {
              id,
              user: String(handler.user?.displayName || handler.user?.tag),
              botname: client.user!.username || client.user!.displayName,
            }
          )}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await dbAction.delete(id);
      await handler.interaction.reply({
        content: `${client.i18n.get(
          handler.language,
          "commands.admin",
          `blacklist_${entityType}_delete`,
          {
            id,
            user: String(handler.user?.displayName || handler.user?.tag),
            botname: client.user!.username || client.user!.displayName,
          }
        )}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
