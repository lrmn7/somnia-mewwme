import {
  CommandInteraction,
  ApplicationCommandOptionType,
  EmbedBuilder,
  CommandInteractionOptionResolver,
  ButtonStyle,
  MessageFlags,
} from "discord.js";
import { Connect4 } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["connect4"];
  public description = "Play a game of Connect4 with another user.";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.Connect4;
  public usage = "";
  public aliases = ["c4"];
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
    const opponent = options.getUser("opponent", true);

    if (!opponent) {
      return interaction.reply({
        content: "Please specify a valid user to challenge.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (interaction.user.id === opponent.id) {
      return interaction.reply({
        content: "You can't challenge yourself to Connect4!",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (opponent.bot) {
      return interaction.reply({
        content: "You can't challenge a bot to Connect4!",
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

    const game = new Connect4({
      message: interaction,
      isSlashGame: true,
      opponent: opponent,
      embed: {
        title: "Connect4 Game",
        color: client.color_second,
        statusTitle: "Game Status",
      },
      emojis: {
        board: "⚪",
        player1: "🔴",
        player2: "🟡",
      },
      timeoutTime: 60000,
      buttonStyle: "Primary",
      turnMessage: "{emoji} | It's {player}'s turn!",
      winMessage: "{emoji} | **{player}** won the game!",
      tieMessage: "The game ended in a tie!",
      timeoutMessage: "The game timed out!",
      requestMessage: "{player} has invited {opponent} for a round of **Connect4**.",
      rejectMessage: "{opponent} declined your invitation.",
      playerOnlyMessage: "Only {player} and {opponent} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const winnerId: string | null = typeof result.winner === "string" ? result.winner : null;

      const resultMessage = winnerId
        ? `🎉 Congratulations, <@${winnerId}>! You won the game!`
        : result.result === "tie"
          ? "The game ended in a tie!"
          : "The game timed out!";

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
          opponent.id,
          winnerId === opponent.id ? "win" : winnerId ? "loss" : "draw"
        ),
        this.storeGameHistory(client, guildId, interaction.user.id, opponent.id, winnerId),
      ];

      await Promise.all(statsUpdatePromises);

      const resultEmbed = new EmbedBuilder()
        .setTitle("Connect4 Results")
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

    let playerStats = (await client.db.GameStatistics.get(statsKey)) || {
      connect4: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0 },
    };

    if (!playerStats) {
      playerStats = {
        connect4: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
        },
      };
    }

    if (!playerStats.connect4) {
      playerStats.connect4 = {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
      };
    }

    playerStats.connect4.gamesPlayed += 1;
    if (result === "win") playerStats.connect4.wins += 1;
    else if (result === "loss") playerStats.connect4.losses += 1;
    else playerStats.connect4.draws += 1;

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
