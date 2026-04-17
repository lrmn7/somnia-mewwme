import {
  ButtonInteraction,
  CacheType,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  Message,
  CommandInteraction,
  StringSelectMenuInteraction,
  MessageFlags,
} from "discord.js";
import { Manager } from "../manager.js";
import { computeWeb3Quota } from "../web/route/web3Premium.js";
import { TopggServiceEnum } from "./TopggService.js";

export class PlayerControlService {
  public async check(
    client: Manager,
    message:
      | ButtonInteraction<CacheType>
      | CommandInteraction<CacheType>
      | StringSelectMenuInteraction<CacheType>
      | Message,
    language: string,
    accessableby: string
  ): Promise<boolean> {
    const userId = message instanceof Message ? message.author.id : message.user.id;
    const guildId = message.guild?.id;

    const PremiumGuildID = client.config.PremiumRole.GuildID;
    const PremiumRoleID = client.config.PremiumRole.RoleID;
    const isPremiumRoleEnabled = client.config.PremiumRole.Enable !== false;
    const supportGuild = isPremiumRoleEnabled
      ? await client.guilds.fetch(PremiumGuildID).catch(() => null)
      : null;
    const supportMember = supportGuild
      ? await supportGuild.members.fetch(userId).catch(() => null)
      : null;
    const isPremiumRole = supportMember ? supportMember.roles.cache.has(PremiumRoleID) : false;

    const User = await client.db.PremiumUserLegacy.get(userId);
    const Guild = await client.db.PremiumGuildLegacy.get(String(guildId));
    const isPremiumUserCode = User && User.isPremium;
    const isPremiumGuildCode = Guild && Guild.isPremium;

    const isPremiumWeb3User = (await computeWeb3Quota(client, userId)) > 0;

    let isPremiumWeb3Guild = false;

    if (guildId) {
      const allWeb3 = await client.db.Web3Premium.all();
      const sponsorWeb3 = allWeb3.find((entry: any) => {
        const data = entry.data || entry.value || entry;
        return (
          data.redeemedGuilds &&
          Array.isArray(data.redeemedGuilds) &&
          data.redeemedGuilds.includes(guildId) &&
          data.expiresAt > Date.now()
        );
      });
      if (sponsorWeb3) isPremiumWeb3Guild = true;
    }

    const isOwner = userId == client.owner;
    const isAdmin = client.config.bot.ADMIN.includes(userId);

    const userPerm = {
      owner: isOwner,
      admin: isOwner || isAdmin,
      PremiumRole: isOwner || isAdmin || isPremiumRole,
      PremiumWeb3User: isOwner || isAdmin || isPremiumWeb3User,
      PremiumWeb3Guild: isOwner || isAdmin || isPremiumWeb3Guild,
      PremiumUserCode: isOwner || isAdmin || isPremiumUserCode,
      PremiumGuildCode: isOwner || isAdmin || isPremiumGuildCode,
      Premium:
        isOwner ||
        isAdmin ||
        isPremiumUserCode ||
        isPremiumGuildCode ||
        isPremiumWeb3User ||
        isPremiumWeb3Guild ||
        isPremiumRole,
    };

    const sendError = async (embedData: any, buttons: ActionRowBuilder<ButtonBuilder>[] = []) => {
      const payload = {
        content: " ",
        embeds: [embedData],
        components: buttons,
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

    if (accessableby === "Voter" && client.topgg && !userPerm.Premium) {
      const voteChecker = await client.topgg.checkVote(userId);

      if (voteChecker == TopggServiceEnum.ERROR) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: client.i18n.get(language, "interaction", "topgg_error_author") })
          .setDescription(
            client.i18n.get(language, "interaction", "topgg_error_desc", {
              serversupport: client.config.bot.SERVER_SUPPORT_URL,
              premium: client.config.bot.PREMIUM_URL,
            })
          )
          .setColor(client.color_main);
        await sendError(embed);
        return false;
      }

      if (voteChecker == TopggServiceEnum.UNVOTED) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: client.i18n.get(language, "interaction", "topgg_unvote_author") })
          .setDescription(
            client.i18n.get(language, "interaction", "topgg_unvote_desc", {
              user: `<@${userId}>`,
              serversupport: client.config.bot.SERVER_SUPPORT_URL,
              premium: client.config.bot.PREMIUM_URL,
            })
          )
          .setColor(client.color_main);

        const VoteButton = new ActionRowBuilder<ButtonBuilder>();
        VoteButton.addComponents(
          new ButtonBuilder()
            .setLabel(client.i18n.get(language, "interaction", "topgg_unvote_button"))
            .setStyle(ButtonStyle.Link)
            .setURL(`https://top.gg/bot/${client.user?.id}/vote`)
        );
        VoteButton.addComponents(
          new ButtonBuilder()
            .setLabel(client.i18n.get(language, "interaction", "premium_button"))
            .setStyle(ButtonStyle.Link)
            .setURL(client.config.bot.PREMIUM_URL)
        );
        await sendError(embed, [VoteButton]);
        return false;
      }
    }

    const createPremiumError = async (authorKey: string, descKey: string, buttonKey: string) => {
      const embed = new EmbedBuilder()
        .setAuthor({ name: client.i18n.get(language, "interaction", authorKey) })
        .setDescription(
          client.i18n.get(language, "interaction", descKey, {
            user: `<@${userId}>`,
            serversupport: client.config.bot.SERVER_SUPPORT_URL,
            premium: client.config.bot.PREMIUM_URL,
          })
        )
        .setColor(client.color_main);

      const PremiumCheckButton = new ActionRowBuilder<ButtonBuilder>();
      if (client.config.MENU_HELP_EMOJI.E_PREMIUM && client.config.bot.PREMIUM_URL) {
        PremiumCheckButton.addComponents(
          new ButtonBuilder()
            .setLabel(client.i18n.get(language, "interaction", buttonKey))
            .setStyle(ButtonStyle.Link)
            .setEmoji(client.config.MENU_HELP_EMOJI.E_PREMIUM)
            .setURL(client.config.bot.PREMIUM_URL)
        );
      }
      await sendError(embed, PremiumCheckButton.components.length ? [PremiumCheckButton] : []);
    };

    const isMissingPremium =
      (accessableby === "PremiumRole" && !userPerm.PremiumRole) ||
      (accessableby === "Premium" && !userPerm.Premium) ||
      (accessableby === "UserPremiumCode" && !userPerm.PremiumUserCode) ||
      (accessableby === "GuildPremiumCode" && !userPerm.PremiumGuildCode) ||
      (accessableby === "Web3User" && !userPerm.PremiumWeb3User) ||
      (accessableby === "Web3Guild" && !userPerm.PremiumWeb3Guild);

    if (isMissingPremium) {
      await createPremiumError("no_premium_author", "no_premium_desc", "no_premium_button");
      return false;
    }

    return true;
  }
}
