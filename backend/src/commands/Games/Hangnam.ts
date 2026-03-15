import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { Hangman } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["hangman"];
  public description = "Start a game of Hangman";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.Hangman;
  public usage = "";
  public aliases = ["hm"];
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

    const words = [
      "trees",
      "rivers",
      "sunsets",
      "vampires",
      "cultures",
      "history",
      "landmarks",
      "pizza",
      "sushi",
      "zombies",
      "thriller",
      "ghosts",
      "continents",
      "action",
      "mountains",
      "cults",
    ];
    const randomWord = words[Math.floor(Math.random() * words.length)];

    const game = new Hangman({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Hangman",
        color: client.color_second,
      },
      hangman: {
        hat: "🎩",
        head: "😟",
        shirt: "👕",
        pants: "🩳",
        boots: "👞👞",
      },
      customWord: randomWord,
      timeoutTime: 60000,
      theme: "winter",
      winMessage: "🎉 You won! The word was **{word}**.",
      loseMessage: "😢 You lost! The word was **{word}**.",
      playerOnlyMessage: "Only {player} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const winner = result.result === "win" ? interaction.user.id : null;
      const mappedResult = result.result === "lose" ? "loss" : "win";

      await this.updatePlayerStats(client, guildId, interaction.user.id, mappedResult);

      await this.storeGameHistory(
        client,
        guildId,
        interaction.user.id,
        result.word,
        result.incorrectGuesses,
        winner
      );
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
      hangman: { gamesPlayed: 0, wins: 0, losses: 0 },
    };

    if (!playerStats) {
      playerStats = {
        hangman: { gamesPlayed: 0, wins: 0, losses: 0 },
      };
    }

    if (!playerStats.hangman) {
      playerStats.hangman = { gamesPlayed: 0, wins: 0, losses: 0 };
    }

    playerStats.hangman.gamesPlayed += 1;
    if (result === "win") playerStats.hangman.wins += 1;
    else playerStats.hangman.losses += 1;

    await client.db.GameStatistics.set(statsKey, playerStats);
  }

  private async storeGameHistory(
    client: Manager,
    guildId: string,
    challenger: string,
    word: string,
    incorrectGuesses: number,
    winner: string | null
  ) {
    const match = {
      matchId: `${guildId}-${Date.now()}`,
      guildId,
      challenger,
      challenged: null,
      winner,
      gameType: "hangman",
      word,
      incorrectGuesses,
      timestamp: Date.now(),
    };
    await client.db.GameHistory.push("matches", match);
  }
}
