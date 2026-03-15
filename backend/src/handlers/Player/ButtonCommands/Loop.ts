import {
  ButtonInteraction,
  EmbedBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonBuilder,
  MessageFlags,
} from "discord.js";
import { Manager } from "../../../manager.js";
import { AutoReconnectBuilderService } from "../../../services/AutoReconnectBuilderService.js";
import { MewslinkLoopMode, MewslinkPlayer } from "../../../mewslink/main.js";
import { PlayerControlService } from "../../../services/PlayerControlService.js";
import { DjRoleService } from "../../../services/DjRoleService.js";
export class ButtonLoop {
  client: Manager;
  interaction: ButtonInteraction;
  language: string;
  player: MewslinkPlayer;
  accessableby: string;
  constructor(
    client: Manager,
    interaction: ButtonInteraction,
    language: string,
    player: MewslinkPlayer
  ) {
    this.client = client;
    this.language = language;
    this.player = player;
    this.interaction = interaction;
    this.accessableby = client.config.COMMANDS_ACCESS.MUSIC.Loop[0];
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

    if (!this.player) {
      return;
    }

    switch (this.player.loop) {
      case "none":
        await this.player.setLoop(MewslinkLoopMode.SONG);

        if (this.client.config.features.AUTO_RESUME) this.setLoop247(String(MewslinkLoopMode.SONG));

        const looptrack = new EmbedBuilder()
          .setDescription(
            `${this.client.i18n.get(this.language, "button.setup.music", "loop_current", {
              user: String(this.interaction.user?.displayName || this.interaction.user?.tag),
              botname: this.client.user!.username || this.client.user!.displayName,
            })}`
          )
          .setColor(this.client.color_main);
        await this.interaction.reply({
          content: " ",
          embeds: [looptrack],
          flags: MessageFlags.Ephemeral,
        });

        this.client.wsl.get(this.interaction.guild!.id)?.send({
          op: "playerLoop",
          guild: this.interaction.guild!.id,
          mode: "song",
        });
        break;

      case "song":
        await this.player.setLoop(MewslinkLoopMode.QUEUE);

        if (this.client.config.features.AUTO_RESUME)
          this.setLoop247(String(MewslinkLoopMode.QUEUE));

        const loopall = new EmbedBuilder()
          .setDescription(
            `${this.client.i18n.get(this.language, "button.setup.music", "loop_all", {
              user: String(this.interaction.user?.displayName || this.interaction.user?.tag),
              botname: this.client.user!.username || this.client.user!.displayName,
            })}`
          )
          .setColor(this.client.color_main);
        await this.interaction.reply({
          content: " ",
          embeds: [loopall],
          flags: MessageFlags.Ephemeral,
        });

        this.client.wsl.get(this.interaction.guild!.id)?.send({
          op: "playerLoop",
          guild: this.interaction.guild!.id,
          mode: "queue",
        });
        break;

      case "queue":
        await this.player.setLoop(MewslinkLoopMode.NONE);

        if (this.client.config.features.AUTO_RESUME) this.setLoop247(String(MewslinkLoopMode.NONE));

        const unloopall = new EmbedBuilder()
          .setDescription(
            `${this.client.i18n.get(this.language, "button.setup.music", "unloop_all", {
              user: String(this.interaction.user?.displayName || this.interaction.user?.tag),
              botname: this.client.user!.username || this.client.user!.displayName,
            })}`
          )
          .setColor(this.client.color_main);
        await this.interaction.reply({
          content: " ",
          embeds: [unloopall],
          flags: MessageFlags.Ephemeral,
        });

        this.client.wsl.get(this.interaction.guild!.id)?.send({
          op: "playerLoop",
          guild: this.interaction.guild!.id,
          mode: "none",
        });
        break;
    }
  }

  async setLoop247(loop: string) {
    const check = await new AutoReconnectBuilderService(this.client, this.player).execute(
      this.player.guildId
    );
    if (check) {
      await this.client.db.autoreconnect.set(`${this.player.guildId}.config.loop`, loop);
    }
  }
}
