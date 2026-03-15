export interface GameHistory {
  matchId: string;
  guildId: string;
  challenger: string;
  challenged: string | null; // Single-player games may not have an opponent
  winner: string | null;
  gameType:
    | "twoZeroFourEight"
    | "connect4"
    | "findEmoji"
    | "flood"
    | "hangman"
    | "matchPairs"
    | "minesweeper"
    | "tictactoe"
    | "trivia"
    | "wordle";

  // 2048 and snake fields
  score?: number;

  // Hangman-specific fields
  word?: string;
  incorrectGuesses?: number;

  // Trivia-specific fields
  question?: string;
  correctAnswer?: string;
  playerAnswer?: string;

  // Minesweeper-specific fields
  minesRevealed?: number;
  totalMines?: number;

  // MatchPairs-specific fields
  tilesTurned?: number;

  // Flood-specific fields
  turns?: number;

  // FindEmoji-specific fields
  emoji?: string;

  timestamp: number;
}
