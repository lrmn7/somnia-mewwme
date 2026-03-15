import {
  CommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
  CommandInteractionOptionResolver,
  ApplicationCommandOptionType,
  MessageFlags,
} from "discord.js";
import { Wordle } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["wordle"];
  public description = "Play a Wordle game!";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.Wordle;
  public usage = "";
  public aliases = ["wrld"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "word",
      description: "Provide a custom word for the Wordle game (5 letters)",
      type: ApplicationCommandOptionType.String,
      required: false,
    },
    {
      name: "time",
      description: "Time limit for the game (in seconds)",
      type: ApplicationCommandOptionType.Integer,
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;
    // @ts-ignore
    const options = interaction.options as CommandInteractionOptionResolver;

    const guildId = interaction.guild?.id;

    if (!guildId) {
      return interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const timeLimit = options.getInteger("time") ?? 60; // Default: 60 seconds

    const customWord = options.getString("word");
    if (customWord && customWord.length !== 5) {
      return interaction.reply({
        content: "The custom word must be exactly 5 letters long.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const game = new Wordle({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Wordle Game",
        color: client.color_second,
      },
      customWord: customWord ?? undefined,
      timeoutTime: timeLimit * 1000,
      winMessage: "🎉 Congratulations! You guessed the word!",
      loseMessage: "❌ Better luck next time! The word was **{word}**.",
    });

    game.on("gameOver", async (result) => {
      const isWin = result.result === "win";
      const player = interaction.user;

      await this.updatePlayerStats(client, guildId, player.id, isWin ? "win" : "loss");
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

    const playerStats = (await client.db.GameStatistics.get(statsKey)) || {
      wordle: { totalGames: 0, wins: 0, losses: 0 },
    };

    if (!playerStats.wordle) {
      playerStats.wordle = {
        totalGames: 0,
        wins: 0,
        losses: 0,
      };
    }

    playerStats.wordle.totalGames += 1;
    if (result === "win") {
      playerStats.wordle.wins += 1;
    } else if (result === "loss") {
      playerStats.wordle.losses += 1;
    }

    await client.db.GameStatistics.set(statsKey, playerStats);
  }
}
