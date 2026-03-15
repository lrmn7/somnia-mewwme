import {
  ButtonInteraction,
  CacheType,
  EmbedBuilder,
  Message,
  CommandInteraction,
  StringSelectMenuInteraction,
  MessageFlags,
  PermissionsBitField,
  GuildMember,
} from "discord.js";
import { Manager } from "../manager.js";

export class DjRoleService {
  public async check(
    client: Manager,
    message:
      | ButtonInteraction<CacheType>
      | CommandInteraction<CacheType>
      | StringSelectMenuInteraction<CacheType>
      | Message,
    language: string
  ): Promise<boolean> {
    const userId = message instanceof Message ? message.author.id : message.user.id;
    const guildId = message.guild?.id;
    if (!guildId || !message.member) return true;
    const djData = await client.db.DjRole.get(guildId);
    if (!djData || djData.enable === false) return true;
    const isOwner = userId === String(client.owner);
    const isAdmin = client.config.bot.ADMIN.map(String).includes(userId);
    const member = message.member as GuildMember;
    const isNotManager = !member.permissions.has(PermissionsBitField.Flags.ManageGuild);
    const hasDjRole = djData.roleid ? member.roles.cache.has(djData.roleid) : false;
    if (!hasDjRole && isNotManager && !isOwner && !isAdmin) {
      const sendError = async (embedData: any) => {
        const payload = {
          content: " ",
          embeds: [embedData],
          flags: MessageFlags.Ephemeral as any,
        };

        if (message instanceof Message) {
          await message.reply(payload);
        } else {
          if (message.deferred || message.replied) {
            await message.followUp(payload);
          } else {
            await message.reply(payload);
          }
        }
      };

      const embed = new EmbedBuilder()
        .setDescription(
          `${client.i18n.get(language, "interaction", "not_dj_role", {
            role: djData.roleid ? `<@&${djData.roleid}>` : "None",
          })}`
        )
        .setColor(client.color_main);

      await sendError(embed);
      return false;
    }

    return true;
  }
}
