export type Role = "civilian" | "spy" | "white";

export type Phase =
  | "setup"
  | "revealCover"
  | "revealShown"
  | "discussion"
  | "vote"
  | "whiteGuess"
  | "result";

export type WinnerTeam = "civilian" | "spy" | "white";

export interface WordPair {
  category: string;
  civilianWord: string;
  spyWord: string;
}

export interface Player {
  id: string;
  name: string;
  order: number;
  role: Role;
  word: string | null;
  alive: boolean;
  eliminatedRound?: number;
}

export interface GameConfig {
  playerNames: string[];
  spyCount: number;
  whiteCount: number;
  seed: string;
}

export interface Winner {
  team: WinnerTeam;
  reason: string;
}

export interface GameState {
  phase: Phase;
  config: GameConfig;
  players: Player[];
  selectedWordPair: WordPair;
  currentRevealIndex: number;
  round: number;
  eliminatedPlayerIds: string[];
  pendingWhiteGuessForPlayerId: string | null;
  winner: Winner | null;
}

export interface SavedGameProgress {
  state: GameState;
  eliminatedPopupPlayerId: string | null;
  feedbackPopup: FeedbackPopup | null;
  selectedVoteId: string | null;
}

export type FeedbackPopupKind =
  | "civilianEliminated"
  | "spyEliminated"
  | "whiteWrongGuess";

export interface FeedbackPopup {
  kind: FeedbackPopupKind;
  playerId: string | null;
}

export interface RoleCounts {
  civilians: number;
  spies: number;
  whites: number;
}

export interface SceneSnapshot {
  phase: Phase;
  round: number;
  aliveCount: number;
  playerCount: number;
  winnerTeam: WinnerTeam | null;
}
