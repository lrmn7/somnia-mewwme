import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Minesweeper } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["minesweeper"];
  public description = "Play a game of Minesweeper!";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.Minesweeper;
  public usage = "";
  public aliases = ["ms"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;
    const guildId = interaction.guild?.id;

    if (!guildId) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const game = new Minesweeper({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Minesweeper",
        color: client.color_second,
        description: "Click on the buttons to reveal the blocks except mines.",
      },
      emojis: { flag: "🚩", mine: "💣" },
      mines: 5,
      timeoutTime: 60000,
      winMessage: "🎉 You won the game! You successfully avoided all the mines.",
      loseMessage: "💣 You lost the game! Beware of the mines next time.",
      playerOnlyMessage: "Only {player} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const outcome = result.result === "win" ? "win" : "loss";

      await this.updatePlayerStats(client, guildId, interaction.user.id, outcome);

      const resultMessage =
        outcome === "win"
          ? "🎉 Congratulations! You cleared the board!"
          : "💣 Oops! You hit a mine.";

      const resultEmbed = new EmbedBuilder()
        .setTitle("Minesweeper Results")
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
    result: "win" | "loss"
  ) {
    const statsKey = `${userId}`;

    let playerStats = (await client.db.GameStatistics.get(statsKey)) || {
      minesweeper: { gamesPlayed: 0, wins: 0, losses: 0 },
    };

    if (!playerStats) {
      playerStats = {
        minesweeper: { gamesPlayed: 0, wins: 0, losses: 0 },
      };
    }

    if (!playerStats.minesweeper) {
      playerStats.minesweeper = { gamesPlayed: 0, wins: 0, losses: 0 };
    }

    playerStats.minesweeper.gamesPlayed += 1;
    if (result === "win") playerStats.minesweeper.wins += 1;
    else playerStats.minesweeper.losses += 1;

    await client.db.GameStatistics.set(statsKey, playerStats);
  }
}
