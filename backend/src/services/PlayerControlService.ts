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

    const User = await client.db.premium.get(userId);
    const Guild = await client.db.preGuild.get(String(guildId));
    const isPremiumUser = User && User.isPremium;
    const isPremiumGuild = Guild && Guild.isPremium;

    const isOwner = userId == String(client.owner);
    const isAdmin = client.config.bot.ADMIN.map(String).includes(userId);

    const userPerm = {
      owner: isOwner,
      admin: isOwner || isAdmin,
      Premium: isOwner || isAdmin || isPremiumUser || isPremiumGuild,
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
      accessableby === "Premium" && !userPerm.Premium;

    if (isMissingPremium) {
      await createPremiumError("no_premium_author", "no_premium_desc", "no_premium_button");
      return false;
    }

    return true;
  }
}
