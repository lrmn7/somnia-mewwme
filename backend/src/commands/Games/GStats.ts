import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import {
  EmbedBuilder,
  CommandInteraction,
  ApplicationCommandOptionType,
  MessageFlags,
} from "discord.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["game-stats"];
  public description = "Show game stats for all games!";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.GameStats;
  public usage = "<user>";
  public aliases = ["gs"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "user",
      description: "The user whose game stats you want to check",
      type: ApplicationCommandOptionType.User,
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;

    const guildId = interaction.guild?.id;
    if (!guildId) {
      return interaction.reply({
        content: "This command can only be run within a guild.",
        flags: MessageFlags.Ephemeral,
      });
    }
    // @ts-ignore
    const targetUserOption = interaction.options.get("user");
    const targetUser = targetUserOption
      ? targetUserOption.user || interaction.user
      : interaction.user;

    const playerStats = await client.db.GameStatistics.get(`${targetUser.id}`);

    if (!playerStats) {
      return interaction.reply({
        content: `${targetUser} has not played any games in this server yet.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const gameStats = [
      {
        name: "**2048 🧩**",
        value: `**Games Played**: ${playerStats.twoZeroFourEight?.gamesPlayed || 0}\n**Wins**: ${playerStats.twoZeroFourEight?.wins || 0}`,
        inline: true,
      },
      {
        name: "**Connect4 🔴🟡**",
        value: `**Games Played**: ${playerStats.connect4?.gamesPlayed || 0}\n**Wins**: ${playerStats.connect4?.wins || 0}\n**Losses**: ${playerStats.connect4?.losses || 0}\n**Win %**: ${(((playerStats.connect4?.wins || 0) / (playerStats.connect4?.gamesPlayed || 1)) * 100).toFixed(2)}%`,
        inline: true,
      },
      {
        name: "**Find Emoji 🧩**",
        value: `**Games Played**: ${playerStats.findEmoji?.gamesPlayed || 0}\n**Wins**: ${playerStats.findEmoji?.wins || 0}\n**Losses**: ${playerStats.findEmoji?.losses || 0}`,
        inline: true,
      },
      {
        name: "**Flood 🌊**",
        value: `**Games Played**: ${playerStats.flood?.gamesPlayed || 0}\n**Wins**: ${playerStats.flood?.wins || 0}\n**Losses**: ${playerStats.flood?.losses || 0}`,
        inline: true,
      },
      {
        name: "**Hangman 🎯**",
        value: `**Games Played**: ${playerStats.hangman?.gamesPlayed || 0}\n**Wins**: ${playerStats.hangman?.wins || 0}\n**Losses**: ${playerStats.hangman?.losses || 0}\n**Win %**: ${(((playerStats.hangman?.wins || 0) / (playerStats.hangman?.gamesPlayed || 1)) * 100).toFixed(2)}%`,
        inline: true,
      },
      {
        name: "**Match Pairs 🔀**",
        value: `**Games Played**: ${playerStats.matchPairs?.gamesPlayed || 0}\n**Wins**: ${playerStats.matchPairs?.wins || 0}\n**Losses**: ${playerStats.matchPairs?.losses || 0}`,
        inline: true,
      },
      {
        name: "**Minesweeper 💣**",
        value: `**Games Played**: ${playerStats.minesweeper?.gamesPlayed || 0}\n**Wins**: ${playerStats.minesweeper?.wins || 0}\n**Losses**: ${playerStats.minesweeper?.losses || 0}`,
        inline: true,
      },
      {
        name: "**Tic Tac Toe ❌⭕**",
        value: `**Games Played**: ${playerStats.tictactoe?.gamesPlayed || 0}\n**Wins**: ${playerStats.tictactoe?.wins || 0}\n**Losses**: ${playerStats.tictactoe?.losses || 0}\n**Draws**: ${playerStats.tictactoe?.draws || 0}\n**Win %**: ${(((playerStats.tictactoe?.wins || 0) / (playerStats.tictactoe?.gamesPlayed || 1)) * 100).toFixed(2)}%`,
        inline: true,
      },
      {
        name: "**Trivia 🤔**",
        value: `**Games Played**: ${playerStats.trivia?.gamesPlayed || 0}\n**Wins**: ${playerStats.trivia?.wins || 0}\n**Losses**: ${playerStats.trivia?.losses || 0}`,
        inline: true,
      },
      {
        name: "**Wordle 📝**",
        value: `**Games Played**: ${playerStats.wordle?.totalGames || 0}\n**Wins**: ${playerStats.wordle?.wins || 0}\n**Losses**: ${playerStats.wordle?.losses || 0}\n**Win %**: ${(((playerStats.wordle?.wins || 0) / (playerStats.wordle?.totalGames || 1)) * 100).toFixed(2)}%`,
        inline: true,
      },
    ];

    // Sort the fields by name
    gameStats.sort((a, b) => a.name.localeCompare(b.name));

    const statsEmbed = new EmbedBuilder()
      .setTitle(`📊 Monthly Game Stats Overview`)
      .setDescription(
        `Here’s the breakdown of **<@${targetUser.id}>**'s game stats for this month. Let's see how well they've been doing!`
      )
      .addFields(...gameStats)
      .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
      .setColor(client.color_main);

    return interaction.reply({ embeds: [statsEmbed] });
  }
}
