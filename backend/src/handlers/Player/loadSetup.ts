import { PlayerEmojis } from "./../../@types/Config.js";
import { Manager } from "../../manager.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

/**
 *
 * @param {Client} client
 */

export class PlayerSetupLoader {
  client: Manager;
  icons: PlayerEmojis;
  constructor(client: Manager) {
    this.client = client;
    this.icons = this.client.config.emojis.PLAYER;
    this.registerDisableSwitch();
    this.registerEnableSwitch();
    this.registerEnableSwitchMod();
  }
  registerEnableSwitch() {
    this.client.enSwitch = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sstop")
        .setEmoji(this.icons.STOP)
        .setLabel("Stop"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sprevious")
        .setEmoji(this.icons.PREVIOUS)
        .setLabel("Previous"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("spause")
        .setEmoji(this.icons.PLAY)
        .setLabel("Pause"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sskip")
        .setEmoji(this.icons.SKIP)
        .setLabel("Skip"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sloop")
        .setEmoji(this.icons.LOOP)
        .setLabel("Loop"),
    ]);
  }

  registerEnableSwitchMod() {
    this.client.enSwitchMod = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sstop")
        .setEmoji(this.icons.STOP)
        .setLabel("Stop"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sprevious")
        .setEmoji(this.icons.PREVIOUS)
        .setLabel("Previous"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("spause")
        .setEmoji(this.icons.PAUSE)
        .setLabel("Pause"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sskip")
        .setEmoji(this.icons.SKIP)
        .setLabel("Skip"),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sloop")
        .setEmoji(this.icons.LOOP)
        .setLabel("Loop"),
    ]);
  }

  registerDisableSwitch() {
    this.client.diSwitch = new ActionRowBuilder<ButtonBuilder>().addComponents([
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sstop")
        .setEmoji(this.icons.STOP)
        .setLabel("Stop")
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sprevious")
        .setEmoji(this.icons.PREVIOUS)
        .setLabel("Previous")
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("spause")
        .setEmoji(this.icons.PLAY)
        .setLabel("Pause")
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sskip")
        .setEmoji(this.icons.SKIP)
        .setLabel("Skip")
        .setDisabled(true),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("sloop")
        .setEmoji(this.icons.LOOP)
        .setLabel("Loop")
        .setDisabled(true),
    ]);
  }
}
