import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { TwoZeroFourEight } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["2048"];
  public description = "Play a game of 2048!";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.TwoZeroFourEight;
  public usage = "";
  public aliases = [];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public options = [];
  public djRole = false;

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

    const game = new TwoZeroFourEight({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "2048",
        color: client.color_main,
      },
      emojis: {
        up: "⬆️",
        down: "⬇️",
        left: "⬅️",
        right: "➡️",
      },
      timeoutTime: 60000,
      buttonStyle: "SECONDARY",
      playerOnlyMessage: "Only {player} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const outcome = result.result === "win" ? "win" : "loss";

      await this.updatePlayerStats(client, guildId, interaction.user.id, outcome);

      const resultMessage =
        outcome === "win"
          ? `🎉 Congratulations! You achieved a high score of **${result.score}**!`
          : `❌ Game over! Your final score was **${result.score}**.`;

      const resultEmbed = new EmbedBuilder()
        .setTitle("2048 Results")
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
      twoZeroFourEight: { gamesPlayed: 0, wins: 0 },
    };

    if (!playerStats) {
      playerStats = {
        twoZeroFourEight: { gamesPlayed: 0, wins: 0 },
      };
    }

    if (!playerStats.twoZeroFourEight) {
      playerStats.twoZeroFourEight = { gamesPlayed: 0, wins: 0 };
    }

    playerStats.twoZeroFourEight.gamesPlayed += 1;
    if (result === "win") playerStats.twoZeroFourEight.wins += 1;

    await client.db.GameStatistics.set(statsKey, playerStats);
  }
}
