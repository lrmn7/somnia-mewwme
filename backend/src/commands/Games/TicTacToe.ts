import {
  CommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  CommandInteractionOptionResolver,
  MessageFlags,
} from "discord.js";
import { TicTacToe } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["tictactoe"];
  public description = "Play a game of Tic Tac Toe with another user";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.TicTacToe;
  public usage = "<user>";
  public aliases = ["ttt"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "opponent",
      description: "The user you want to challenge.",
      type: ApplicationCommandOptionType.User,
      required: true,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;
    // @ts-ignore
    const options = interaction.options as CommandInteractionOptionResolver;
    const player2 = options.getUser("opponent", true);

    if (!player2) {
      return interaction.reply({
        content: "Please specify a valid user to challenge.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.user.id === player2.id) {
      return interaction.reply({
        content: "You can't challenge yourself to Tic Tac Toe!",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (player2.bot) {
      return interaction.reply({
        content: "You can't challenge a bot to Tic Tac Toe!",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guildId = interaction.guild?.id;

    if (!guildId) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const game = new TicTacToe({
      message: interaction,
      isSlashGame: true,
      opponent: player2,
      embed: {
        title: "Tic Tac Toe",
        color: client.color_second,
        statusTitle: "Game Status",
        overTitle: "Game Over",
      },
      emojis: {
        xButton: "❎",
        oButton: "🟢",
        blankButton: "➖",
      },
      timeoutTime: 60000,
      xTurnMessage: "It's {player}'s turn! (❎)",
      oTurnMessage: "It's {player}'s turn! (🟢)",
      drawMessage: "The game ended in a draw!",
      winMessage: "Congratulations {player}, you won!",
      gameEndMessage: "The game has ended.",
      playerOnlyMessage: "Only {player} and {opponent} can use these buttons.",
      requestMessage: "{player} has invited {opponent} for a round of **Tic Tac Toe**.",
      timeoutMessage: "The game timed out! No winner was declared.",
    });

    game.on("gameOver", async (result) => {
      const winnerId: string | null =
        typeof result.winner === "string" ? result.winner : result.winner ? result.winner.id : null;

      const resultMessage = winnerId
        ? `🎉 Congratulations, <@${winnerId}>! You won the game!`
        : "The game ended in a draw! Good effort by both players.";

      // Update player stats
      const statsUpdatePromises = [
        this.updatePlayerStats(
          client,
          guildId,
          interaction.user.id,
          winnerId === interaction.user.id ? "win" : winnerId ? "loss" : "draw"
        ),
        this.updatePlayerStats(
          client,
          guildId,
          player2.id,
          winnerId === player2.id ? "win" : winnerId ? "loss" : "draw"
        ),
        this.storeGameHistory(client, guildId, interaction.user.id, player2.id, winnerId),
      ];

      await Promise.all(statsUpdatePromises);

      const resultEmbed = new EmbedBuilder()
        .setTitle("Tic Tac Toe Results")
        .setDescription(resultMessage)
        .setColor(client.color_main);

      await interaction.followUp({ embeds: [resultEmbed] });
    });

    game.startGame();
  }

  private async updatePlayerStats(
    client: Manager,
    guildId: string,
    userId: string,
    result: "win" | "loss" | "draw"
  ) {
    const statsKey = `${userId}`;
    const playerStats = (await client.db.GameStatistics.get(statsKey)) || {
      rps: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0 },
      tictactoe: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0 },
    };

    if (!playerStats.tictactoe) {
      playerStats.tictactoe = { gamesPlayed: 0, wins: 0, losses: 0, draws: 0 };
    }

    playerStats.tictactoe.gamesPlayed += 1;
    if (result === "win") playerStats.tictactoe.wins += 1;
    else if (result === "loss") playerStats.tictactoe.losses += 1;
    else playerStats.tictactoe.draws += 1;

    await client.db.GameStatistics.set(statsKey, playerStats);
  }

  private async storeGameHistory(
    client: Manager,
    guildId: string,
    player1Id: string,
    player2Id: string,
    winnerId: string | null
  ) {
    const match = {
      guildId,
      player1Id,
      player2Id,
      winnerId,
      timestamp: Date.now(),
    };
    await client.db.GameHistory.push("matches", match);
  }
}
