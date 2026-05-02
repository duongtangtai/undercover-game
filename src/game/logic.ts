import type {
  GameConfig,
  GameState,
  Player,
  Role,
  RoleCounts,
  SceneSnapshot,
  Winner,
  WordPair,
} from "./types";
import { createRng, createSeed, shuffle } from "./random";

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;

export function createDefaultNames(count = 6): string[] {
  return Array.from({ length: count }, (_, index) => `Người chơi ${index + 1}`);
}

export function defaultSpyCount(playerCount: number): number {
  return Math.max(1, Math.floor(playerCount / 4));
}

export function getFixedRoleCounts(playerCount: number): RoleCounts {
  const normalizedPlayerCount = clamp(playerCount, MIN_PLAYERS, MAX_PLAYERS);
  const spies = defaultSpyCount(normalizedPlayerCount);
  const whites = 1;

  return {
    civilians: normalizedPlayerCount - spies - whites,
    spies,
    whites,
  };
}

export function createDefaultConfig(): GameConfig {
  const playerNames = createDefaultNames();

  return {
    playerNames,
    spyCount: defaultSpyCount(playerNames.length),
    whiteCount: 1,
    seed: createSeed(),
  };
}

export function normalizeConfig(config: GameConfig): GameConfig {
  const playerNames = config.playerNames
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
    .slice(0, MAX_PLAYERS);
  const playerCount = clamp(playerNames.length, MIN_PLAYERS, MAX_PLAYERS);
  const roleCounts = getFixedRoleCounts(playerCount);

  return {
    playerNames: playerNames.slice(0, playerCount),
    spyCount: roleCounts.spies,
    whiteCount: roleCounts.whites,
    seed: config.seed.trim() || createSeed(),
  };
}

export function validateConfig(config: GameConfig): string[] {
  const errors: string[] = [];
  const names = config.playerNames.map((name) => name.trim()).filter(Boolean);
  const uniqueNames = new Set(names.map((name) => normalizeText(name)));

  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) {
    errors.push(`Cần ${MIN_PLAYERS}-${MAX_PLAYERS} người chơi.`);
  }

  if (names.length !== config.playerNames.length) {
    errors.push("Tên người chơi không được để trống.");
  }

  if (uniqueNames.size !== names.length) {
    errors.push("Tên người chơi không được trùng nhau.");
  }

  return errors;
}

export function createGame(config: GameConfig, wordPairs: WordPair[]): GameState {
  const normalizedConfig = normalizeConfig(config);
  const errors = validateConfig(normalizedConfig);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  if (wordPairs.length === 0) {
    throw new Error("Word data is empty.");
  }

  const rng = createRng(normalizedConfig.seed);
  const selectedWordPair = wordPairs[Math.floor(rng() * wordPairs.length)];
  const roles = buildRoleDeck(
    normalizedConfig.playerNames.length,
    normalizedConfig.spyCount,
    normalizedConfig.whiteCount,
  );
  const shuffledRoles = shuffle(roles, rng);

  const players = normalizedConfig.playerNames.map<Player>((name, index) => {
    const role = shuffledRoles[index];

    return {
      id: `p-${index + 1}`,
      name,
      role,
      word: wordForRole(role, selectedWordPair),
      alive: true,
    };
  });

  return {
    phase: "revealCover",
    config: normalizedConfig,
    players,
    selectedWordPair,
    currentRevealIndex: 0,
    round: 1,
    eliminatedPlayerIds: [],
    pendingWhiteGuessForPlayerId: null,
    winner: null,
  };
}

export function getPlayerById(state: GameState, playerId: string | null): Player | null {
  if (!playerId) {
    return null;
  }

  return state.players.find((player) => player.id === playerId) ?? null;
}

export function revealCurrentPlayer(state: GameState): GameState {
  assertPhase(state, "revealCover");
  return { ...state, phase: "revealShown" };
}

export function advanceReveal(state: GameState): GameState {
  assertPhase(state, "revealShown");

  if (state.currentRevealIndex >= state.players.length - 1) {
    return startDiscussion({ ...state, currentRevealIndex: state.players.length });
  }

  return {
    ...state,
    phase: "revealCover",
    currentRevealIndex: state.currentRevealIndex + 1,
  };
}

export function startDiscussion(state: GameState): GameState {
  return {
    ...state,
    phase: "discussion",
    pendingWhiteGuessForPlayerId: null,
  };
}

export function startVote(state: GameState): GameState {
  return {
    ...state,
    phase: "vote",
  };
}

export function eliminatePlayer(state: GameState, playerId: string): GameState {
  assertPhase(state, "vote");
  const eliminated = findAlivePlayer(state, playerId);
  const players = state.players.map((player) =>
    player.id === playerId
      ? { ...player, alive: false, eliminatedRound: state.round }
      : player,
  );
  const nextState: GameState = {
    ...state,
    players,
    eliminatedPlayerIds: [...state.eliminatedPlayerIds, playerId],
  };

  if (eliminated.role === "white") {
    return {
      ...nextState,
      phase: "whiteGuess",
      pendingWhiteGuessForPlayerId: playerId,
    };
  }

  return advanceAfterElimination(nextState);
}

export function submitWhiteGuess(state: GameState, guess: string): GameState {
  assertPhase(state, "whiteGuess");

  if (isCorrectWhiteGuess(guess, state.selectedWordPair.civilianWord)) {
    return {
      ...state,
      phase: "result",
      pendingWhiteGuessForPlayerId: null,
      winner: {
        team: "white",
        reason: "Mũ trắng đoán đúng từ của dân thường sau khi bị loại.",
      },
    };
  }

  return advanceAfterElimination(
    {
      ...state,
      pendingWhiteGuessForPlayerId: null,
    },
  );
}

export function getCurrentRevealPlayer(state: GameState): Player | null {
  return state.players[state.currentRevealIndex] ?? null;
}

export function getAlivePlayers(state: GameState): Player[] {
  return state.players.filter((player) => player.alive);
}

export function getRoleCounts(players: Player[]): RoleCounts {
  return players.reduce<RoleCounts>(
    (counts, player) => {
      if (player.role === "civilian") {
        counts.civilians += 1;
      } else if (player.role === "spy") {
        counts.spies += 1;
      } else {
        counts.whites += 1;
      }

      return counts;
    },
    { civilians: 0, spies: 0, whites: 0 },
  );
}

export function checkWinner(state: GameState): Winner | null {
  const alivePlayers = getAlivePlayers(state);
  const counts = getRoleCounts(alivePlayers);

  if (counts.whites > 0 && alivePlayers.length <= 2) {
    return {
      team: "white",
      reason: "Mũ trắng sống tới vòng cuối.",
    };
  }

  if (counts.spies === 0 && counts.whites === 0) {
    return {
      team: "civilian",
      reason: "Dân thường loại hết gián điệp và mũ trắng.",
    };
  }

  if (counts.whites === 0 && counts.spies >= counts.civilians) {
    return {
      team: "spy",
      reason: "Gián điệp đạt số lượng ngang hoặc hơn dân thường.",
    };
  }

  return null;
}

export function isCorrectWhiteGuess(guess: string, civilianWord: string): boolean {
  return normalizeText(guess) === normalizeText(civilianWord);
}

export function toSceneSnapshot(state: GameState | null): SceneSnapshot {
  if (!state) {
    return {
      phase: "setup",
      round: 0,
      aliveCount: 0,
      playerCount: 0,
      winnerTeam: null,
    };
  }

  return {
    phase: state.phase,
    round: state.round,
    aliveCount: getAlivePlayers(state).length,
    playerCount: state.players.length,
    winnerTeam: state.winner?.team ?? null,
  };
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function advanceAfterElimination(state: GameState): GameState {
  const winner = checkWinner(state);

  if (winner) {
    return {
      ...state,
      phase: "result",
      winner,
    };
  }

  return startDiscussion({ ...state, round: state.round + 1 });
}

function buildRoleDeck(playerCount: number, spyCount: number, whiteCount: number): Role[] {
  return [
    ...Array.from<Role>({ length: spyCount }).fill("spy"),
    ...Array.from<Role>({ length: whiteCount }).fill("white"),
    ...Array.from<Role>({ length: playerCount - spyCount - whiteCount }).fill(
      "civilian",
    ),
  ];
}

function wordForRole(role: Role, pair: WordPair): string | null {
  if (role === "civilian") {
    return pair.civilianWord;
  }

  if (role === "spy") {
    return pair.spyWord;
  }

  return null;
}

function findAlivePlayer(state: GameState, playerId: string): Player {
  const player = state.players.find((candidate) => candidate.id === playerId);

  if (!player || !player.alive) {
    throw new Error("Player is not alive.");
  }

  return player;
}

function assertPhase(state: GameState, phase: GameState["phase"]): void {
  if (state.phase !== phase) {
    throw new Error(`Expected phase ${phase}, got ${state.phase}.`);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
