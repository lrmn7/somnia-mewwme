import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Flood } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["flood"];
  public description = "Play a game of Flood!";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.Flood;
  public usage = " ";
  public aliases = ["fld"];
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

    const game = new Flood({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Flood",
        color: client.color_second,
      },
      difficulty: 13,
      timeoutTime: 60000,
      buttonStyle: "SECONDARY",
      emojis: ["🟥", "🟦", "🟧", "🟪", "🟩"],
      winMessage: "🎉 You won! You took **{turns}** turns.",
      loseMessage: "💧 You lost! You took **{turns}** turns.",
      playerOnlyMessage: "Only {player} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const outcome = result.result === "win" ? "win" : "loss";

      await this.updatePlayerStats(client, guildId, interaction.user.id, outcome);

      const resultMessage =
        outcome === "win"
          ? `🎉 Congratulations! You successfully flooded the board in **${result.turns}** turns!`
          : `💧 You lost! You used **${result.turns}** turns.`;

      const resultEmbed = new EmbedBuilder()
        .setTitle("Flood Results")
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
      flood: { gamesPlayed: 0, wins: 0, losses: 0 },
    };
    if (!playerStats) {
      playerStats = {
        flood: { gamesPlayed: 0, wins: 0, losses: 0 },
      };
    }

    if (!playerStats.flood) {
      playerStats.flood = { gamesPlayed: 0, wins: 0, losses: 0 };
    }

    playerStats.flood.gamesPlayed += 1;
    if (result === "win") playerStats.flood.wins += 1;
    else playerStats.flood.losses += 1;

    await client.db.GameStatistics.set(statsKey, playerStats);
  }
}
