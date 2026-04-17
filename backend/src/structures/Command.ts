import { ApplicationCommandOptionType } from "discord.js";
import { Manager } from "../manager.js";
import { CommandHandler } from "./CommandHandler.js";

export enum Accessableby {
  Owner = "Owner",
  Admin = "Admin",
  UserPremiumCode = "UserPremiumCode",
  GuildPremiumCode = "GuildPremiumCode",
  Premium = "Premium",
  PremiumRole = "PremiumRole",
  Manager = "Manager",
  Voter = "Voter",
  Member = "Member",
  Web3User = "Web3User",
  Web3Guild = "Web3Guild",
}

export type CommandOptionChoiceInterface = {
  name: string;
  value: string;
};

export type CommandOptionInterface = {
  name: string;
  description: string;
  required?: boolean;
  type: ApplicationCommandOptionType | undefined;
  autocomplete?: boolean;
  choices?: CommandOptionChoiceInterface[];
};

export class Command {
  name: string[] = [];
  description: string = "";
  category: string = "";
  accessableby: string[] = [];
  usage: string = "";
  aliases: string[] = [];
  lavalink: boolean = false;
  playerCheck: boolean = false;
  djRole: boolean = false;
  usingInteraction: boolean = false;
  sameVoiceCheck: boolean = false;
  options: CommandOptionInterface[] = [];
  permissions: bigint[] = [];
  async execute(client: Manager, handler: CommandHandler): Promise<any> {}
}
