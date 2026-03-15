import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { MatchPairs } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["match-pairs"];
  public description = "Play a game of Match Pairs!";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.MatchPairs;
  public usage = "";
  public aliases = ["mp"];
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

    const game = new MatchPairs({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Match Pairs",
        color: client.color_second,
        description: "**Click on the buttons to match emojis with their pairs.**",
      },
      timeoutTime: 60000,
      emojis: ["🍉", "🍇", "🍊", "🥭", "🍎", "🍏", "🥝", "🥥", "🍓", "🫐", "🍍", "🥕", "🥔"],
      winMessage: "**You won the Game! You turned a total of `{tilesTurned}` tiles.**",
      loseMessage: "**You lost the Game! You turned a total of `{tilesTurned}` tiles.**",
      playerOnlyMessage: "Only {player} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const outcome = result.result === "win" ? "win" : "loss";

      await this.updatePlayerStats(client, guildId, interaction.user.id, outcome);

      const resultMessage =
        outcome === "win"
          ? `🎉 Congratulations! You matched all pairs!`
          : `😢 You lost! Try again to improve your skills.`;

      const resultEmbed = new EmbedBuilder()
        .setTitle("Match Pairs Results")
        .setDescription(resultMessage.replace("{tilesTurned}", result.tilesTurned.toString()))
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
    let playerStats = (await client.db.GameStatistics.get(statsKey)) as
      | { matchPairs: { gamesPlayed: number; wins: number; losses: number } }
      | undefined;

    if (!playerStats) {
      playerStats = {
        matchPairs: { gamesPlayed: 0, wins: 0, losses: 0 },
      };
    }

    if (!playerStats.matchPairs) {
      playerStats.matchPairs = { gamesPlayed: 0, wins: 0, losses: 0 };
    }

    playerStats.matchPairs.gamesPlayed += 1;
    if (result === "win") playerStats.matchPairs.wins += 1;
    else playerStats.matchPairs.losses += 1;

    await client.db.GameStatistics.set(statsKey, playerStats);
  }
}
