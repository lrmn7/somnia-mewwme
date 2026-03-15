declare module "discord-gamecord" {
  import { CommandInteraction, User, ColorResolvable } from "discord.js";

  // TicTacToe Class and Interfaces
  export class TicTacToe {
    constructor(options: TicTacToeOptions);
    options: TicTacToeOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: GameResult) => void): void;
  }

  export interface TicTacToeOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    opponent: User;
    embed: TicTacToeEmbedOptions;
    emojis: EmojiOptions;
    timeoutTime: number;
    xTurnMessage: string;
    oTurnMessage: string;
    drawMessage: string;
    winMessage: string;
    gameEndMessage: string;
    playerOnlyMessage: string;
    requestMessage?: string;
    timeoutMessage?: string;
  }

  export interface TicTacToeEmbedOptions {
    title: string;
    color: ColorResolvable;
    statusTitle: string;
    overTitle: string;
  }

  export interface EmojiOptions {
    xButton: string;
    oButton: string;
    blankButton: string;
  }

  export interface GameResult {
    winner: User | null;
    loser: User | null;
    draw: boolean;
    reason?: "timeout" | "finished";
  }

  // RockPaperScissors Class and Interfaces
  export class RockPaperScissors {
    constructor(options: RockPaperScissorsOptions);
    options: RockPaperScissorsOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: RPSGameResult) => void): void;
  }

  export interface RockPaperScissorsOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    opponent: User;
    embed: RPSEmbedOptions;
    buttons: {
      rock: string;
      paper: string;
      scissors: string;
    };
    emojis: {
      rock: string;
      paper: string;
      scissors: string;
    };
    timeoutTime: number;
    pickMessage: string;
    winMessage: string;
    drawMessage: string;
    gameEndMessage: string;
    playerOnlyMessage: string;
  }

  export interface RPSEmbedOptions {
    title: string;
    color: ColorResolvable;
    description: string;
  }

  export interface RPSGameResult {
    winner: User | null;
    loser: User | null;
    draw: boolean;
    playerPick: string | null;
    opponentPick: string | null;
  }

  // GuessThePokemon Class and Interfaces
  export class GuessThePokemon {
    constructor(options: GuessThePokemonOptions);
    options: GuessThePokemonOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: GuessThePokemonResult) => void): void;
  }

  export interface GuessThePokemonOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: PokemonEmbedOptions;
    timeoutTime: number;
    difficulty: "easy" | "medium" | "hard";
    winMessage: string;
    loseMessage: string;
    othersMessage: string;
  }

  export interface PokemonEmbedOptions {
    title: string;
    color: ColorResolvable;
    description: string;
  }

  export interface GuessThePokemonResult {
    result: "win" | "loss";
    answer: string;
  }

  // WouldYouRather Class and Interfaces
  export class WouldYouRather {
    constructor(options: WouldYouRatherOptions);
    options: WouldYouRatherOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: WouldYouRatherResult) => void): void;
  }

  export interface WouldYouRatherOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: WouldYouRatherEmbedOptions;
    buttons: {
      option1: string;
      option2: string;
    };
    buttonStyle: "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER";
    errMessage: string;
    playerOnlyMessage?: string;
  }

  export interface WouldYouRatherEmbedOptions {
    title: string;
    color: ColorResolvable;
  }

  export interface WouldYouRatherResult {
    result: "finish";
    player: User;
    question: {
      id: string;
      option1: string;
      option2: string;
      option1Votes: string;
      option2Votes: string;
    };
    selected: string;
  }

  // Wordle Class and Interfaces
  export class Wordle {
    constructor(options: WordleOptions);
    options: WordleOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: WordleResult) => void): void;
  }

  export interface WordleOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: {
      title: string;
      color: ColorResolvable;
    };
    customWord?: string;
    timeoutTime: number;
    winMessage: string;
    loseMessage: string;
  }

  export interface WordleEmbedOptions {
    title: string;
    color: ColorResolvable;
  }

  export interface WordleResult {
    result: "win" | "lose";
    player: User;
    word: string;
    guessed: string[];
  }

  // FastType Class and Interfaces
  export class FastType {
    constructor(options: FastTypeOptions);
    options: FastTypeOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: FastTypeResult) => void): void;
  }

  export interface FastTypeOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: FastTypeEmbedOptions;
    sentence: string;
    timeoutTime: number;
    winMessage: string;
    loseMessage: string;
  }

  export interface FastTypeEmbedOptions {
    title: string;
    color: ColorResolvable;
    description: string;
  }

  export interface FastTypeResult {
    result: "win" | "lose";
    player: User;
    timeTaken: number;
    wpm: number;
  }

  // Connect4 Class and Interfaces
  export class Connect4 {
    constructor(options: Connect4Options);
    options: Connect4Options;
    startGame(): void;
    on(event: "gameOver", listener: (result: Connect4Result) => void): void;
  }

  export interface Connect4Options {
    message: CommandInteraction;
    isSlashGame: boolean;
    opponent: User;
    embed: Connect4EmbedOptions;
    emojis: Connect4Emojis;
    timeoutTime: number;
    buttonStyle: string;
    turnMessage: string;
    winMessage: string;
    tieMessage: string;
    timeoutMessage: string;
    requestMessage: string;
    rejectMessage: string;
    playerOnlyMessage?: string;
  }

  export interface Connect4EmbedOptions {
    title: string;
    color: ColorResolvable;
    statusTitle: string;
  }

  export interface Connect4Emojis {
    board: string;
    player1: string;
    player2: string;
  }

  export interface Connect4Result {
    result: "win" | "tie" | "timeout";
    winner?: string;
    player: User;
    opponent: User;
  }

  // Hangman Class and Interfaces
  export class Hangman {
    constructor(options: HangmanOptions);
    options: HangmanOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: HangmanResult) => void): void;
  }

  export interface HangmanOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: HangmanEmbedOptions;
    hangman: HangmanAssets;
    customWord?: string;
    timeoutTime: number;
    theme?: string;
    winMessage: string;
    loseMessage: string;
    playerOnlyMessage: string;
  }

  export interface HangmanEmbedOptions {
    title: string;
    color: ColorResolvable;
  }

  export interface HangmanAssets {
    hat: string;
    head: string;
    shirt: string;
    pants: string;
    boots: string;
  }

  export interface HangmanResult {
    result: "win" | "lose";
    word: string;
    guessed: string[];
    incorrectGuesses: number;
  }

  // Slots Class and Interfaces
  export class Slots {
    constructor(options: SlotsOptions);
    options: SlotsOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: SlotsResult) => void): void;
  }

  export interface SlotsOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: SlotsEmbedOptions;
    slots: string[];
  }

  export interface SlotsEmbedOptions {
    title: string;
    color: ColorResolvable;
  }

  export interface SlotsResult {
    result: "win" | "loss";
    player: string;
  }

  // Trivia Class and Interfaces
  export class Trivia {
    constructor(options: TriviaOptions);
    options: TriviaOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: TriviaResult) => void): void;
  }

  export interface TriviaOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: TriviaEmbedOptions;
    timeoutTime: number;
    buttonStyle: string;
    trueButtonStyle: string;
    falseButtonStyle: string;
    mode: "multiple" | "single";
    difficulty: "easy" | "medium" | "hard";
    winMessage: string;
    loseMessage: string;
    errMessage: string;
    playerOnlyMessage: string;
  }

  export interface TriviaEmbedOptions {
    title: string;
    color: ColorResolvable;
    description: string;
  }

  export interface TriviaResult {
    result: "win" | "loss";
    player: string;
    correctAnswer: string;
  }
  // Minesweeper Class and Interfaces
  export class Minesweeper {
    constructor(options: MinesweeperOptions);
    options: MinesweeperOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: MinesweeperResult) => void): void;
  }

  export interface MinesweeperOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: MinesweeperEmbedOptions;
    emojis: MinesweeperEmojis;
    mines: number;
    timeoutTime: number;
    winMessage: string;
    loseMessage: string;
    playerOnlyMessage: string;
  }

  export interface MinesweeperEmbedOptions {
    title: string;
    color: ColorResolvable;
    description: string;
  }

  export interface MinesweeperEmojis {
    flag: string;
    mine: string;
  }

  export interface MinesweeperResult {
    result: "win" | "loss";
    player: string;
  }

  // MatchPairs Class and Interfaces
  export class MatchPairs {
    constructor(options: MatchPairsOptions);
    options: MatchPairsOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: MatchPairsResult) => void): void;
  }

  export interface MatchPairsOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: MatchPairsEmbedOptions;
    timeoutTime: number;
    emojis: string[];
    winMessage: string;
    loseMessage: string;
    playerOnlyMessage: string;
  }

  export interface MatchPairsEmbedOptions {
    title: string;
    color: ColorResolvable;
    description: string;
  }

  export interface MatchPairsResult {
    result: "win" | "loss";
    tilesTurned: number;
    player: string;
  }

  // Flood Class and Interfaces
  export class Flood {
    constructor(options: FloodOptions);
    options: FloodOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: FloodResult) => void): void;
  }

  export interface FloodOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: FloodEmbedOptions;
    difficulty: number;
    timeoutTime: number;
    buttonStyle: string;
    emojis: string[];
    winMessage: string;
    loseMessage: string;
    playerOnlyMessage: string;
  }

  export interface FloodEmbedOptions {
    title: string;
    color: ColorResolvable;
  }

  export interface FloodResult {
    result: "win" | "loss";
    turns: number;
    player: string;
  }

  // FindEmoji Class and Interfaces
  export class FindEmoji {
    constructor(options: FindEmojiOptions);
    options: FindEmojiOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: FindEmojiResult) => void): void;
  }

  export interface FindEmojiOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: FindEmojiEmbedOptions;
    timeoutTime: number;
    hideEmojiTime: number;
    buttonStyle: string;
    emojis: string[];
    winMessage: string;
    loseMessage: string;
    timeoutMessage: string;
    playerOnlyMessage: string;
  }

  export interface FindEmojiEmbedOptions {
    title: string;
    color: ColorResolvable;
    description: string;
    findDescription: string;
  }

  export interface FindEmojiResult {
    result: "win" | "loss";
    emoji: string;
    player: string;
  }

  // TwoZeroFourEight Class and Interfaces
  export class TwoZeroFourEight {
    constructor(options: TwoZeroFourEightOptions);
    options: TwoZeroFourEightOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: TwoZeroFourEightResult) => void): void;
  }

  export interface TwoZeroFourEightOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: TwoZeroFourEightEmbedOptions;
    timeoutTime: number;
    emojis: TwoZeroFourEightEmojis;
    buttonStyle: string;
    playerOnlyMessage: string;
  }

  export interface TwoZeroFourEightEmbedOptions {
    title: string;
    color: ColorResolvable;
  }

  export interface TwoZeroFourEightEmojis {
    up: string;
    down: string;
    left: string;
    right: string;
  }

  export interface TwoZeroFourEightResult {
    result: "win" | "loss";
    score: number;
    player: string;
  }

  // Snake Class and Interfaces
  export class Snake {
    constructor(options: SnakeOptions);
    options: SnakeOptions;
    startGame(): void;
    on(event: "gameOver", listener: (result: SnakeResult) => void): void;
  }

  export interface SnakeOptions {
    message: CommandInteraction;
    isSlashGame: boolean;
    embed: SnakeEmbedOptions;
    emojis: SnakeEmojis;
    stopButton: string;
    timeoutTime: number;
    snake: SnakeBodyParts;
    foods: string[];
    playerOnlyMessage: string;
  }

  export interface SnakeEmbedOptions {
    title: string;
    overTitle: string;
    color: ColorResolvable;
  }

  export interface SnakeEmojis {
    board: string;
    food: string;
    up: string;
    down: string;
    left: string;
    right: string;
  }

  export interface SnakeBodyParts {
    head: string;
    body: string;
    tail: string;
    over: string;
  }

  export interface SnakeResult {
    score: number;
    player: string;
  }
}
