import {
  CommandInteraction,
  ApplicationCommandOptionType,
  CommandInteractionOptionResolver,
  EmbedBuilder,
  ImageURLOptions,
} from "discord.js";
import { WouldYouRather } from "discord-gamecord";
import { Command } from "../../structures/Command.js";
import { CommandHandler } from "../../structures/CommandHandler.js";
import { Manager } from "../../manager.js";
import { Config } from "../../@types/Config.js";
import { ConfigDataService } from "../../services/ConfigDataService.js";
const data: Config = new ConfigDataService().data;

export default class implements Command {
  public name = ["wouldyourather"];
  public description = "Play a fun 'Would You Rather' game";
  public category = "Games";
  public accessableby = data.COMMANDS_ACCESS.GAMES.WouldYouRather;
  public usage = "<buttonstyle>";
  public aliases = ["wyr"];
  public lavalink = true;
  public playerCheck = false;
  public usingInteraction = true;
  public sameVoiceCheck = false;
  public permissions = [];
  public djRole = false;
  public options = [
    {
      name: "buttonstyle",
      description: "Style of the buttons (Primary, Secondary, etc.)",
      type: ApplicationCommandOptionType.String,
      choices: [
        { name: "Primary", value: "PRIMARY" },
        { name: "Secondary", value: "SECONDARY" },
        { name: "Success", value: "SUCCESS" },
        { name: "Danger", value: "DANGER" },
      ],
      required: false,
    },
  ];

  public async execute(client: Manager, handler: CommandHandler) {
    if (!handler.interaction) return;
    const interaction = handler.interaction as CommandInteraction;
    // @ts-ignore
    const options = interaction.options as CommandInteractionOptionResolver;

    const buttonStyle = (options.getString("buttonstyle") ?? "PRIMARY") as
      | "PRIMARY"
      | "SECONDARY"
      | "SUCCESS"
      | "DANGER";

    const game = new WouldYouRather({
      message: interaction,
      isSlashGame: true,
      embed: {
        title: "Would You Rather",
        color: client.color_second,
      },
      buttons: {
        option1: "Option 1",
        option2: "Option 2",
      },
      buttonStyle: buttonStyle,
      errMessage: "Unable to fetch a question! Please try again later.",
      playerOnlyMessage: "Only {player} can interact with these buttons.",
    });

    game.on("gameOver", async (result) => {
      const player = interaction.user;
      const selectedOption = result.selected;
      const question = result.question;

      const option1Votes = parseInt(question.option1Votes || "0");
      const option2Votes = parseInt(question.option2Votes || "0");
      const totalVotes = option1Votes + option2Votes;

      const option1Percent = totalVotes > 0 ? Math.floor((option1Votes / totalVotes) * 100) : 0;
      const option2Percent = totalVotes > 0 ? Math.floor((option2Votes / totalVotes) * 100) : 0;

      const embed = new EmbedBuilder()
        .setColor(client.color_main)
        .setTitle("Would You Rather Results")
        .setDescription(
          selectedOption === question.option1
            ? `**1. ${question.option1} (${option1Percent}%)**\n2. ${question.option2} (${option2Percent}%)`
            : `1. ${question.option1} (${option1Percent}%)\n**2. ${question.option2} (${option2Percent}%)**`
        )
        .setAuthor({
          name: player.tag,
          iconURL: player.displayAvatarURL({ dynamic: true } as ImageURLOptions),
        });

      await interaction.editReply({ embeds: [embed], components: [] });
    });

    game.startGame();
  }
}
