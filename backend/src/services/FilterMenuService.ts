import { MewslinkPlayer } from "../mewslink/main.js";
import chalk from "chalk";
import { Manager } from "../manager.js";
import { GuildMember, Interaction, MessageFlags } from "discord.js";
import { PlayerControlService } from "./PlayerControlService.js";
import { DjRoleService } from "./DjRoleService.js";
export default class FilterMenuServices {
  async execute(client: Manager) {
    const filterInfo: { [key: string]: string } = {
      reset: client.config.COMMANDS_ACCESS.FILTER.Reset[0],
      threed: client.config.COMMANDS_ACCESS.FILTER.ThreeD[0],
      bass: client.config.COMMANDS_ACCESS.FILTER.Bass[0],
      bassboost: client.config.COMMANDS_ACCESS.FILTER.Bassboost[0],
      chipmunk: client.config.COMMANDS_ACCESS.FILTER.Chipmunk[0],
      darthvader: client.config.COMMANDS_ACCESS.FILTER.Darthvader[0],
      daycore: client.config.COMMANDS_ACCESS.FILTER.Daycore[0],
      doubletime: client.config.COMMANDS_ACCESS.FILTER.Doubletime[0],
      earrape: client.config.COMMANDS_ACCESS.FILTER.Earrape[0],
      karaoke: client.config.COMMANDS_ACCESS.FILTER.Karaoke[0],
      nightcore: client.config.COMMANDS_ACCESS.FILTER.Nightcore[0],
      pitch: client.config.COMMANDS_ACCESS.FILTER.Pitch[0],
      pop: client.config.COMMANDS_ACCESS.FILTER.Pop[0],
      rate: client.config.COMMANDS_ACCESS.FILTER.Rate[0],
      slowmotion: client.config.COMMANDS_ACCESS.FILTER.Slowmotion[0],
      soft: client.config.COMMANDS_ACCESS.FILTER.Soft[0],
      speed: client.config.COMMANDS_ACCESS.FILTER.Speed[0],
      superbass: client.config.COMMANDS_ACCESS.FILTER.Superbass[0],
      china: client.config.COMMANDS_ACCESS.FILTER.China[0],
      televison: client.config.COMMANDS_ACCESS.FILTER.Television[0],
      treblebass: client.config.COMMANDS_ACCESS.FILTER.Treblebass[0],
      tremolo: client.config.COMMANDS_ACCESS.FILTER.Tremolo[0],
      vaporwave: client.config.COMMANDS_ACCESS.FILTER.Vaporwave[0],
      vibrate: client.config.COMMANDS_ACCESS.FILTER.Vibrate[0],
      vibrato: client.config.COMMANDS_ACCESS.FILTER.Vibrato[0],
    };

    client.on("interactionCreate", async (interaction: Interaction): Promise<void> => {
      if (!interaction.isStringSelectMenu()) return;

      let player = client.mewslink.players.get(interaction.guild!.id) as MewslinkPlayer;

      const guildId = interaction.guild!.id;
      let guildModel = await client.db.language.get(guildId);
      const language = (guildModel = await client.db.language.set(
        guildId,
        client.config.bot.LANGUAGE
      ));

      if (interaction.customId == "filter") {
        const { values } = interaction;
        const selectedFilter = values[0];
        const userId = interaction.user.id;

        const { channel } = (interaction.member as GuildMember)!.voice;
        if (
          !channel ||
          (interaction.member as GuildMember)!.voice.channel !==
            interaction.guild!.members.me!.voice.channel
        ) {
          await interaction.reply({
            content: `${client.i18n.get(language, "events.player", "no_same_voice")}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        if (!player || !player.queue.current) {
          await interaction.reply({
            content: `${client.i18n.get(language, "events.player", "no_player_filter")}`,
            flags: MessageFlags.Ephemeral,
          });
          return;
        }

        const requiredAccess = filterInfo[selectedFilter];
        const hasPermission = await new PlayerControlService().check(
          client,
          interaction,
          language,
          requiredAccess
        );
        if (!hasPermission) return;

        // ========================DJ ROLE CHECK================================
        const isDjAuthorized = await new DjRoleService().check(client, interaction, language);
        if (!isDjAuthorized) return;

        switch (selectedFilter) {
          case "reset":
            const resetOptions = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {},
              },
            };
            await player?.send(resetOptions);
            await player?.setVolume(player?.volume);
            break;

          case "threed":
            const threed = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  rotation: { rotationHz: 0.2 },
                },
              },
            };

            await player?.send(threed);
            break;

          case "bass":
            const bass = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0.1 },
                    { band: 1, gain: 0.1 },
                    { band: 2, gain: 0.05 },
                    { band: 3, gain: 0.05 },
                    { band: 4, gain: -0.05 },
                    { band: 5, gain: -0.05 },
                    { band: 6, gain: 0 },
                    { band: 7, gain: -0.05 },
                    { band: 8, gain: -0.05 },
                    { band: 9, gain: 0 },
                    { band: 10, gain: 0.05 },
                    { band: 11, gain: 0.05 },
                    { band: 12, gain: 0.1 },
                    { band: 13, gain: 0.1 },
                  ],
                },
              },
            };

            await player?.send(bass);
            break;

          case "bassboost":
            const bassboost = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0.1 },
                    { band: 1, gain: 0.1 },
                    { band: 2, gain: 0.05 },
                    { band: 3, gain: 0.05 },
                    { band: 4, gain: -0.05 },
                    { band: 5, gain: -0.05 },
                    { band: 6, gain: 0 },
                    { band: 7, gain: -0.05 },
                    { band: 8, gain: -0.05 },
                    { band: 9, gain: 0 },
                    { band: 10, gain: 0.05 },
                    { band: 11, gain: 0.05 },
                    { band: 12, gain: 0.1 },
                    { band: 13, gain: 0.1 },
                  ],
                },
              },
            };

            await player?.send(bassboost);
            break;

          case "china":
            const china = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: {
                    speed: 0.75,
                    pitch: 1.25,
                    rate: 1.25,
                  },
                },
              },
            };

            await player?.send(china);
            break;

          case "chipmunk":
            const chipmunk = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: {
                    speed: 1.05,
                    pitch: 1.35,
                    rate: 1.25,
                  },
                },
              },
            };

            await player?.send(chipmunk);
            break;

          case "darthvader":
            const darthvader = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: {
                    speed: 0.975,
                    pitch: 0.5,
                    rate: 0.8,
                  },
                },
              },
            };

            await player?.send(darthvader);
            break;

          case "daycore":
            const daycore = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0 },
                    { band: 1, gain: 0 },
                    { band: 2, gain: 0 },
                    { band: 3, gain: 0 },
                    { band: 4, gain: 0 },
                    { band: 5, gain: 0 },
                    { band: 6, gain: 0 },
                    { band: 7, gain: 0 },
                    { band: 8, gain: -0.25 },
                    { band: 9, gain: -0.25 },
                    { band: 10, gain: -0.25 },
                    { band: 11, gain: -0.25 },
                    { band: 12, gain: -0.25 },
                    { band: 13, gain: -0.25 },
                  ],
                  timescale: {
                    pitch: 0.63,
                    rate: 1.05,
                  },
                },
              },
            };

            await player?.send(daycore);
            break;

          case "doubletime":
            const doubletime = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: {
                    speed: 1.165,
                  },
                },
              },
            };

            await player?.send(doubletime);
            break;

          case "earrape":
            const earrape = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {},
              },
            };

            await player?.send(earrape);
            await player?.setVolume(500);
            break;

          case "karaoke":
            const karaoke = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  karaoke: {
                    level: 1.0,
                    monoLevel: 1.0,
                    filterBand: 220.0,
                    filterWidth: 100.0,
                  },
                },
              },
            };

            await player?.send(karaoke);
            break;

          case "nightcore":
            const nightcore = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: {
                    speed: 1.05,
                    pitch: 1.125,
                    rate: 1.05,
                  },
                },
              },
            };

            await player?.send(nightcore);
            break;

          case "pitch":
            const pitch = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: { pitch: Number(2) },
                },
              },
            };
            await player?.send(pitch);
            break;

          case "pop":
            const pop = {
              op: "filters",
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0.65 },
                    { band: 1, gain: 0.45 },
                    { band: 2, gain: -0.45 },
                    { band: 3, gain: -0.65 },
                    { band: 4, gain: -0.35 },
                    { band: 5, gain: 0.45 },
                    { band: 6, gain: 0.55 },
                    { band: 7, gain: 0.6 },
                    { band: 8, gain: 0.6 },
                    { band: 9, gain: 0.6 },
                    { band: 10, gain: 0 },
                    { band: 11, gain: 0 },
                    { band: 12, gain: 0 },
                    { band: 13, gain: 0 },
                  ],
                },
              },
            };

            await player?.send(pop);
            break;

          case "rate":
            const rate = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: { rate: Number(1) },
                },
              },
            };

            await player?.send(rate);
            break;

          case "slowmotion":
            const slowmotion = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: {
                    speed: 0.5,
                    pitch: 1.0,
                    rate: 0.8,
                  },
                },
              },
            };

            await player?.send(slowmotion);
            break;

          case "soft":
            const soft = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0 },
                    { band: 1, gain: 0 },
                    { band: 2, gain: 0 },
                    { band: 3, gain: 0 },
                    { band: 4, gain: 0 },
                    { band: 5, gain: 0 },
                    { band: 6, gain: 0 },
                    { band: 7, gain: 0 },
                    { band: 8, gain: -0.25 },
                    { band: 9, gain: -0.25 },
                    { band: 10, gain: -0.25 },
                    { band: 11, gain: -0.25 },
                    { band: 12, gain: -0.25 },
                    { band: 13, gain: -0.25 },
                  ],
                },
              },
            };

            await player?.send(soft);
            break;

          case "speed":
            const speed = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  timescale: { speed: Number(2) },
                },
              },
            };

            await player?.send(speed);
            break;

          case "superbass":
            const superbass = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0.2 },
                    { band: 1, gain: 0.3 },
                    { band: 2, gain: 0 },
                    { band: 3, gain: 0.8 },
                    { band: 4, gain: 0 },
                    { band: 5, gain: 0.5 },
                    { band: 6, gain: 0 },
                    { band: 7, gain: -0.5 },
                    { band: 8, gain: 0 },
                    { band: 9, gain: 0 },
                    { band: 10, gain: 0 },
                    { band: 11, gain: 0 },
                    { band: 12, gain: 0 },
                    { band: 13, gain: 0 },
                  ],
                },
              },
            };

            await player?.send(superbass);
            break;

          case "television":
            const television = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0 },
                    { band: 1, gain: 0 },
                    { band: 2, gain: 0 },
                    { band: 3, gain: 0 },
                    { band: 4, gain: 0 },
                    { band: 5, gain: 0 },
                    { band: 6, gain: 0 },
                    { band: 7, gain: 0.65 },
                    { band: 8, gain: 0.65 },
                    { band: 9, gain: 0.65 },
                    { band: 10, gain: 0.65 },
                    { band: 11, gain: 0.65 },
                    { band: 12, gain: 0.65 },
                    { band: 13, gain: 0.65 },
                  ],
                },
              },
            };

            await player?.send(television);
            break;

          case "treblebass":
            const treblebass = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0.6 },
                    { band: 1, gain: 0.67 },
                    { band: 2, gain: 0.67 },
                    { band: 3, gain: 0 },
                    { band: 4, gain: -0.5 },
                    { band: 5, gain: 0.15 },
                    { band: 6, gain: -0.45 },
                    { band: 7, gain: 0.23 },
                    { band: 8, gain: 0.35 },
                    { band: 9, gain: 0.45 },
                    { band: 10, gain: 0.55 },
                    { band: 11, gain: 0.6 },
                    { band: 12, gain: 0.55 },
                    { band: 13, gain: 0 },
                  ],
                },
              },
            };

            await player?.send(treblebass);
            break;

          case "tremolo":
            const tremolo = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  tremolo: {
                    frequency: 4.0,
                    depth: 0.75,
                  },
                },
              },
            };

            await player?.send(tremolo);
            break;

          case "vaporwave":
            const vaporwave = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  equalizer: [
                    { band: 0, gain: 0 },
                    { band: 1, gain: 0 },
                    { band: 2, gain: 0 },
                    { band: 3, gain: 0 },
                    { band: 4, gain: 0 },
                    { band: 5, gain: 0 },
                    { band: 6, gain: 0 },
                    { band: 7, gain: 0 },
                    { band: 8, gain: 0.15 },
                    { band: 9, gain: 0.15 },
                    { band: 10, gain: 0.15 },
                    { band: 11, gain: 0.15 },
                    { band: 12, gain: 0.15 },
                    { band: 13, gain: 0.15 },
                  ],
                  timescale: {
                    pitch: 0.55,
                  },
                },
              },
            };

            await player?.send(vaporwave);
            break;

          case "vibrate":
            const vibrate = {
              guildId: interaction.guild!.id,
              playerOptions: {
                filters: {
                  vibrato: {
                    frequency: 4.0,
                    depth: 0.75,
                  },
                  tremolo: {
                    frequency: 4.0,
                    depth: 0.75,
                  },
                },
              },
            };

            await player?.send(vibrate);
            break;

          case "vibrato":
            const vibrato = {
              guildId: interaction.guild!.id,
              playerOptions: {
                vibrato: {
                  frequency: 4.0,
                  depth: 0.75,
                },
                filters: {
                  vibrato: {
                    frequency: 4.0,
                    depth: 0.75,
                  },
                },
              },
            };

            await player?.send(vibrato);
            break;
        }

        await interaction.reply({
          content: `${client.i18n.get(language, "events.player", "filter_menu_on", {
            name: selectedFilter,
          })}`,
          flags: MessageFlags.Ephemeral,
        });
        client.logger.info(
          "FilterMenu",
          `${chalk.hex("#00D100").bold(selectedFilter)} used by ${chalk.hex("#00D100").bold(`${interaction.user.displayName} (${interaction.user.id})`)} from ${chalk.hex("#00D100").bold(`${interaction.guild!.name} (${interaction.guild!.id})`)}`
        );
      }
    });
  }
}
