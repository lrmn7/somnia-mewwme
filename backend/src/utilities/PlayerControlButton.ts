import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from "discord.js";
import { Manager } from "../manager.js";

// Fungsi untuk membuat tombol dengan kondisi pada setLabel
const createButton = (client: Manager, id, emoji, label, style) => {
  const button = new ButtonBuilder().setCustomId(id).setEmoji(emoji).setStyle(style);

  if (client.config.features.ButtonLabel ?? true) {
    button.setLabel(label);
  }

  return button;
};

const playerRowOne = (client: Manager) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents([
    createButton(
      client,
      "shuffle",
      client.config.emojis.PLAYER.SHUFFLE,
      "Shuffle",
      ButtonStyle.Secondary
    ),
    createButton(
      client,
      "replay",
      client.config.emojis.PLAYER.PREVIOUS,
      "Previous",
      ButtonStyle.Secondary
    ),
    createButton(
      client,
      "pause",
      client.config.emojis.PLAYER.PAUSE,
      "Pause",
      ButtonStyle.Secondary
    ),
    createButton(client, "skip", client.config.emojis.PLAYER.SKIP, "Skip", ButtonStyle.Secondary),
    createButton(client, "loop", client.config.emojis.PLAYER.LOOP, "Loop", ButtonStyle.Secondary),
  ]);

const playerRowTwo = (client: Manager) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents([
    createButton(
      client,
      "autoplay",
      client.config.emojis.PLAYER.AUTOPLAY,
      "Autoplay",
      ButtonStyle.Secondary
    ),
    createButton(
      client,
      "voldown",
      client.config.emojis.PLAYER.VOLDOWN,
      "Volume -",
      ButtonStyle.Secondary
    ),
    createButton(client, "stop", client.config.emojis.PLAYER.STOP, "Stop", ButtonStyle.Secondary),
    createButton(
      client,
      "volup",
      client.config.emojis.PLAYER.VOLUP,
      "Volume +",
      ButtonStyle.Secondary
    ),
    createButton(
      client,
      "queue",
      client.config.emojis.PLAYER.QUEUE,
      "Queue",
      ButtonStyle.Secondary
    ),
  ]);

const playerRowOneEdited = (client: Manager) =>
  new ActionRowBuilder<ButtonBuilder>().addComponents([
    createButton(
      client,
      "shuffle",
      client.config.emojis.PLAYER.SHUFFLE,
      "Shuffle",
      ButtonStyle.Secondary
    ),
    createButton(
      client,
      "replay",
      client.config.emojis.PLAYER.PREVIOUS,
      "Previous",
      ButtonStyle.Secondary
    ),
    createButton(client, "pause", client.config.emojis.PLAYER.PLAY, "Play", ButtonStyle.Secondary),
    createButton(client, "skip", client.config.emojis.PLAYER.SKIP, "Skip", ButtonStyle.Secondary),
    createButton(client, "loop", client.config.emojis.PLAYER.LOOP, "Loop", ButtonStyle.Secondary),
  ]);

const filterSelect = (client: Manager) =>
  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("filter")
      .setPlaceholder(client.config.SELECT_MENU_FILTER.placeholder)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(
        {
          label: "Reset",
          value: "reset",
          description: "Reset filter effect to default audio",
          emoji: client.config.SELECT_MENU_FILTER.emoji_reset,
        },
        {
          label: "3D",
          value: "threed",
          description: "Three-dimensional audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Bass",
          value: "bass",
          description: "Enhance lower frequencies",
          emoji: client.config.SELECT_MENU_FILTER.emoji_free,
        },
        {
          label: "Bassboost",
          value: "bassboost",
          description: "Boost bass levels",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Chipmunk",
          value: "chipmunk",
          description: "High-pitched audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Darthvader",
          value: "darthvader",
          description: "Darth Vader voice effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Daycore",
          value: "daycore",
          description: "Daycore audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Doubletime",
          value: "doubletime",
          description: "Double the speed of audio",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Earrape",
          value: "earrape",
          description: "Extremely loud audio effect, be carefull",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Karaoke",
          value: "karaoke",
          description: "Karaoke mode",
          emoji: client.config.SELECT_MENU_FILTER.emoji_free,
        },
        {
          label: "Nightcore",
          value: "nightcore",
          description: "Nightcore audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Pitch",
          value: "pitch",
          description: "Adjust audio pitch",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Pop",
          value: "pop",
          description: "Pop-themed audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_free,
        },
        {
          label: "Rate",
          value: "rate",
          description: "Change audio playback rate",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Slowmotion",
          value: "slowmotion",
          description: "Slow down audio playback",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Soft",
          value: "soft",
          description: "Make audio softer",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Speed",
          value: "speed",
          description: "Adjust playback speed",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Superbass",
          value: "superbass",
          description: "Powerful bass effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "China",
          value: "china",
          description: "Chinese-themed audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Television",
          value: "television",
          description: "TV-themed audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_free,
        },
        {
          label: "Treblebass",
          value: "treblebass",
          description: "Adjust treble and bass levels",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Tremolo",
          value: "tremolo",
          description: "Tremolo effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_free,
        },
        {
          label: "Vaporwave",
          value: "vaporwave",
          description: "Vaporwave audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Vibrate",
          value: "vibrate",
          description: "Vibrating audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_filter,
        },
        {
          label: "Vibrato",
          value: "vibrato",
          description: "Vibrato audio effect",
          emoji: client.config.SELECT_MENU_FILTER.emoji_free,
        }
      )
  );

export { playerRowOne, playerRowOneEdited, playerRowTwo, filterSelect };
