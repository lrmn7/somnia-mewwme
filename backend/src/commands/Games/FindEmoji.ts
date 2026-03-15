import { CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";
import { FindEmoji } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["find-emoji"];
  public description = "Play a game of Find Emoji!";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.FindEmoji;
  public usage = "";
  public aliases = ["fe"];
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

    const loseMessages = [
      "❌ Oh no! How could you miss such an easy emoji? The correct one was {emoji}.",
      "🙃 Really? Even a bot could find {emoji} faster than you.",
      "😅 Guessing isn't your strong suit, huh? The correct emoji was {emoji}.",
      "🫠 Oops! Better luck next time! It was {emoji}.",
      "🤦 Wow, you managed to fail at this? The correct emoji was {emoji}.\nMaybe concentrate a bit more next time, champ!",
      "😂 You picked the wrong emoji? The correct one was {emoji}.\nThis game isn’t supposed to be that hard, but okay!",
      "😵‍💫 Seriously? {emoji} was right there! Did you even try?",
      "😜 Well, I guess emoji spotting isn't for everyone. The correct one was {emoji}.",
      "🧐 Hmm, maybe you should start practicing with flashcards. It was {emoji}.",
      "🙄 Wow, even my grandma could’ve found {emoji} faster!",
      "🥴 That was a trainwreck! The correct emoji was {emoji}. Better luck next time.",
      "🤔 Are you sure you're awake? The correct emoji was {emoji}.",
      "😬 Ouch, that hurt to watch. {emoji} was the answer you needed.",
      "🤣 Not even close! The emoji you were looking for was {emoji}.",
      "🤷‍♂️ Wow... just wow. It was {emoji}, not whatever you picked.",
      "😩 I can’t believe this. The emoji was {emoji}. Have you considered glasses?",
      "😏 That was... disappointing. It’s {emoji}, plain and simple.",
      "🫣 Maybe this game isn’t for you. {emoji} was the one you needed.",
      "💀 RIP your emoji skills. The answer was {emoji}, in case you missed it (which you did).",
      "🙌 Bravo! Oh wait, you lost. The correct emoji was {emoji}.",
    ];

    const winMessages = [
      "🎉 Outstanding! You nailed it. The emoji was {emoji}.",
      "👏 Bravo! You crushed it with the correct emoji: {emoji}.",
      "💪 A true emoji master! {emoji} was the right choice.",
      "🔥 Unstoppable! You found {emoji} in record time!",
    ];

    const game = new FindEmoji({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Find Emoji",
        color: client.color_second,
        description: "Please Wait...\nRemember the emojis from the board below.",
        findDescription: "Find the {emoji} emoji before the time runs out.",
      },
      timeoutTime: 60000,
      hideEmojiTime: 5000,
      buttonStyle: "SECONDARY",
      emojis: ["🍉", "🍇", "🍊", "🍋", "🥭", "🍎", "🍏", "🥝"],
      winMessage: winMessages[Math.floor(Math.random() * winMessages.length)],
      loseMessage: loseMessages[Math.floor(Math.random() * loseMessages.length)],
      timeoutMessage: "⏳ You ran out of time! The correct emoji was {emoji}.",
      playerOnlyMessage: "Only {player} can use these buttons.",
    });

    game.on("gameOver", async (result) => {
      const outcome = result.result === "win" ? "win" : "loss";

      await this.updatePlayerStats(client, guildId, interaction.user.id, outcome);
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
      findEmoji: { gamesPlayed: 0, wins: 0, losses: 0 },
    };

    if (!playerStats) {
      playerStats = {
        findEmoji: { gamesPlayed: 0, wins: 0, losses: 0 },
      };
    }

    if (!playerStats.findEmoji) {
      playerStats.findEmoji = { gamesPlayed: 0, wins: 0, losses: 0 };
    }

    playerStats.findEmoji.gamesPlayed += 1;
    if (result === "win") playerStats.findEmoji.wins += 1;
    else playerStats.findEmoji.losses += 1;

    await client.db.GameStatistics.set(statsKey, playerStats);
  }
}
