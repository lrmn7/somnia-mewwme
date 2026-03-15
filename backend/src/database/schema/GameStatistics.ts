export interface GameStatistics {
  guildId: string;
  userId: string;
  connect4: { gamesPlayed: number; wins: number; losses: number; draws: number };
  hangman: { gamesPlayed: number; wins: number; losses: number };
  tictactoe: { gamesPlayed: number; wins: number; losses: number; draws: number };
  wordle: { totalGames: number; wins: number; losses: number };
  trivia: { gamesPlayed: number; wins: number; losses: number };
  minesweeper: { gamesPlayed: number; wins: number; losses: number };
  matchPairs: { gamesPlayed: number; wins: number; losses: number };
  flood: { gamesPlayed: number; wins: number; losses: number };
  findEmoji: { gamesPlayed: number; wins: number; losses: number };
  twoZeroFourEight: { gamesPlayed: number; wins: number };
}
