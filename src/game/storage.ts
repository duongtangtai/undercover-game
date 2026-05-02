import { createDefaultConfig, normalizeConfig } from "./logic";
import type { FeedbackPopup, GameConfig, GameState, SavedGameProgress } from "./types";

const SETUP_STORAGE_KEY = "undercover.setup.v1";
const GAME_STORAGE_KEY = "undercover.game.v1";

export function loadSetupConfig(): GameConfig {
  const fallback = createDefaultConfig();

  try {
    const raw = localStorage.getItem(SETUP_STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const saved = JSON.parse(raw) as Partial<GameConfig>;
    return normalizeConfig({
      playerNames: Array.isArray(saved.playerNames)
        ? saved.playerNames
        : fallback.playerNames,
      spyCount: fallback.spyCount,
      whiteCount: fallback.whiteCount,
      seed: fallback.seed,
    });
  } catch {
    return fallback;
  }
}

export function saveSetupConfig(config: GameConfig): void {
  const safeConfig = {
    playerNames: config.playerNames,
  };

  localStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(safeConfig));
}

export function loadGameProgress(): SavedGameProgress | null {
  try {
    const raw = localStorage.getItem(GAME_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SavedGameProgress>;

    if (!isGameState(parsed.state)) {
      return null;
    }

    return {
      state: parsed.state,
      eliminatedPopupPlayerId:
        typeof parsed.eliminatedPopupPlayerId === "string"
          ? parsed.eliminatedPopupPlayerId
          : null,
      feedbackPopup: isFeedbackPopup(parsed.feedbackPopup)
        ? parsed.feedbackPopup
        : legacyFeedbackPopup(parsed.eliminatedPopupPlayerId),
      selectedVoteId:
        typeof parsed.selectedVoteId === "string" ? parsed.selectedVoteId : null,
    };
  } catch {
    return null;
  }
}

export function saveGameProgress(
  state: GameState,
  eliminatedPopupPlayerId: string | null,
  feedbackPopup: FeedbackPopup | null,
  selectedVoteId: string | null,
): void {
  const progress: SavedGameProgress = {
    state,
    eliminatedPopupPlayerId,
    feedbackPopup,
    selectedVoteId,
  };

  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(progress));
}

function isFeedbackPopup(value: unknown): value is FeedbackPopup {
  if (!value || typeof value !== "object") {
    return false;
  }

  const popup = value as Partial<FeedbackPopup>;

  return (
    (popup.kind === "civilianEliminated" ||
      popup.kind === "spyEliminated" ||
      popup.kind === "whiteWrongGuess") &&
    (typeof popup.playerId === "string" || popup.playerId === null)
  );
}

function legacyFeedbackPopup(playerId: unknown): FeedbackPopup | null {
  if (typeof playerId !== "string") {
    return null;
  }

  return {
    kind: "civilianEliminated",
    playerId,
  };
}

export function clearGameProgress(): void {
  localStorage.removeItem(GAME_STORAGE_KEY);
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const state = value as Partial<GameState>;

  return (
    typeof state.phase === "string" &&
    Array.isArray(state.players) &&
    typeof state.currentRevealIndex === "number" &&
    typeof state.round === "number" &&
    Array.isArray(state.eliminatedPlayerIds) &&
    Boolean(state.config) &&
    Boolean(state.selectedWordPair)
  );
}
