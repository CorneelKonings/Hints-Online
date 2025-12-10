
export enum GamePhase {
  LOBBY = 'LOBBY',
  SPINNING = 'SPINNING',
  ROUND_INTRO = 'ROUND_INTRO', // Selected player comes forward
  ROUND_ACTIVE = 'ROUND_ACTIVE', // Timer running, guessing
  ROUND_FEEDBACK = 'ROUND_FEEDBACK', // Correct or Wrong?
  ROUND_SUMMARY = 'ROUND_SUMMARY',
}

export type ThemeId = 'standard' | 'christmas' | 'summer' | 'winter' | 'autumn';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Player {
  id: string;
  name: string;
  avatarSeed: number;
  score: number; // Individual score
}

export interface Guess {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}

// Network Events (Simulated via BroadcastChannel)
export type NetworkMessage = 
  | { type: 'JOIN_LOBBY'; player: Player }
  | { type: 'STATE_UPDATE'; state: GameStateSync }
  | { type: 'SEND_GUESS'; guess: Guess }
  | { type: 'START_ROUND'; playerId: string }; // New: Player starts the timer

export interface GameStateSync {
  phase: GamePhase;
  players: Player[]; // Sync scores
  themeId: ThemeId; // Sync active theme
  currentRound?: {
    playerId: string;
    timeLeft: number;
    currentCardIndex: number;
    totalCards: number;
    secretWord?: string; // The word the active player needs to describe
  };
  winnerNotification?: { // New field to sync "Guessed by..." to phones
    guesserName: string;
    timestamp: number;
  };
  guesses: Guess[];
}
