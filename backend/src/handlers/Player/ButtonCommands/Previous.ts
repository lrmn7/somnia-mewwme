import { Manager } from "../../../manager.js";
import { MewslinkPlayer } from "../../../mewslink/main.js";
import {
  ButtonInteraction,
  TextChannel,
  VoiceBasedChannel,
  EmbedBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
} from "discord.js";
import { PlayerControlService } from "../../../services/PlayerControlService.js";
import { DjRoleService } from "../../../services/DjRoleService.js";
export class ButtonPrevious {
  client: Manager;
  interaction: ButtonInteraction;
  channel: VoiceBasedChannel | null;
  language: string;
  player: MewslinkPlayer;
  accessableby: string;
  constructor(
    client: Manager,
    interaction: ButtonInteraction,
    channel: VoiceBasedChannel | null,
    language: string,
    player: MewslinkPlayer
  ) {
    this.channel = channel;
    this.client = client;
    this.language = language;
    this.player = player;
    this.interaction = interaction;
    this.accessableby = client.config.COMMANDS_ACCESS.MUSIC.Previous[0];
    this.execute();
  }

  async execute() {
    const hasPermission = await new PlayerControlService().check(
      this.client,
      this.interaction,
      this.language,
      this.accessableby
    );
    if (!hasPermission) return;

    // ========================DJ ROLE CHECK================================
    const isDjAuthorized = await new DjRoleService().check(
      this.client,
      this.interaction,
      this.language
    );
    if (!isDjAuthorized) return;

    if (!this.channel) {
      this.interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${this.client.i18n.get(this.language, "button.setup.music", "no_in_voice", {
                user: String(this.interaction.user?.displayName || this.interaction.user?.tag),
                botname: this.client.user!.username || this.client.user!.displayName,
              })}`
            )
            .setColor(this.client.color_main),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    } else if (
      this.interaction.guild!.members.me!.voice.channel &&
      !this.interaction.guild!.members.me!.voice.channel.equals(this.channel)
    ) {
      this.interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${this.client.i18n.get(this.language, "button.setup.music", "no_same_voice", {
                user: String(this.interaction.user?.displayName || this.interaction.user?.tag),
                botname: this.client.user!.username || this.client.user!.displayName,
              })}`
            )
            .setColor(this.client.color_main),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    } else if (!this.player || this.player.queue.previous.length == 0) {
      this.interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setDescription(
              `${this.client.i18n.get(this.language, "button.setup.music", "previous_notfound", {
                user: String(this.interaction.user?.displayName || this.interaction.user?.tag),
                botname: this.client.user!.username || this.client.user!.displayName,
              })}`
            )
            .setColor(this.client.color_main),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    } else {
      this.player.previous();

      this.player.data.set("endMode", "previous");

      const embed = new EmbedBuilder()
        .setDescription(
          `${this.client.i18n.get(this.language, "button.setup.music", "previous_msg", {
            user: String(this.interaction.user?.displayName || this.interaction.user?.tag),
            botname: this.client.user!.username || this.client.user!.displayName,
          })}`
        )
        .setColor(this.client.color_main);

      this.interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
}
