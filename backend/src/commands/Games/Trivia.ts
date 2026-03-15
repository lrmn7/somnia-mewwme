import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Trivia } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["trivia"];
  public description = "Play a game of Trivia";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.Trivia;
  public usage = "";
  public aliases = ["trv"];
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

    const game = new Trivia({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Trivia",
        color: client.color_second,
        description: "You have 60 seconds to guess the answer.",
      },
      timeoutTime: 60000,
      buttonStyle: "PRIMARY",
      trueButtonStyle: "SUCCESS",
      falseButtonStyle: "DANGER",
      mode: "multiple", // multiple || single
      difficulty: "medium", // easy || medium || hard
      winMessage: "You won! The correct answer is **{answer}**.",
      loseMessage: "You lost! The correct answer is **{answer}**.",
      errMessage: "Unable to fetch question data! Please try again.",
      playerOnlyMessage: "Only {player} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const outcome = result.result === "win" ? "win" : "loss";
      const triviaResult = result as { question?: { answer: string } };
      const correctAnswer = triviaResult.question?.answer || "Unavailable";

      await this.updatePlayerStats(client, guildId, interaction.user.id, outcome);

      const resultMessage =
        outcome === "win"
          ? `🎉 Congratulations, ${result.player}! You answered correctly!`
          : `😢 You lost! The correct answer was **${correctAnswer}**. Better luck next time!`;

      const resultEmbed = new EmbedBuilder()
        .setTitle("Trivia Results")
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
    const USERID = `${userId}`;

    let playerStats = (await client.db.GameStatistics.get(USERID)) || {
      trivia: { gamesPlayed: 0, wins: 0, losses: 0 },
    };

    if (!playerStats) {
      playerStats = {
        trivia: { gamesPlayed: 0, wins: 0, losses: 0 },
      };
    }

    if (!playerStats.trivia) {
      playerStats.trivia = { gamesPlayed: 0, wins: 0, losses: 0 };
    }

    playerStats.trivia.gamesPlayed += 1;
    if (result === "win") playerStats.trivia.wins += 1;
    else playerStats.trivia.losses += 1;

    await client.db.GameStatistics.set(USERID, playerStats);
  }
}
