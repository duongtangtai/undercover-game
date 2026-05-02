import {
  advanceReveal,
  createGame,
  eliminatePlayer,
  getAlivePlayers,
  getCurrentRevealPlayer,
  getFixedRoleCounts,
  getPlayerById,
  getRoleCounts,
  MIN_PLAYERS,
  MAX_PLAYERS,
  normalizeText,
  normalizeConfig,
  revealCurrentPlayer,
  startVote,
  submitWhiteGuess,
  toSceneSnapshot,
  validateConfig,
} from "../game/logic";
import { createSeed } from "../game/random";
import {
  clearGameProgress,
  loadGameProgress,
  loadSetupConfig,
  saveGameProgress,
  saveSetupConfig,
} from "../game/storage";
import type { GameConfig, GameState, Player, WordPair } from "../game/types";
import type { FeedbackPopup } from "../game/types";
import { escapeAttr, escapeHtml } from "./html";
import { closeIcon, clueIcon, menuIcon, playerIcon, replayIcon, roleIcon, setupIcon } from "./icons";
import { ROLE_LABELS, WINNER_LABELS, roleClass } from "./labels";

export class UndercoverApp {
  private readonly root: HTMLElement;
  private readonly wordPairs: WordPair[];
  private draft: GameConfig;
  private state: GameState | null = null;
  private selectedVoteId: string | null = null;
  private feedbackPopup: FeedbackPopup | null = null;
  private isActionMenuOpen = false;
  private notice = "";

  constructor(root: HTMLElement, wordPairs: WordPair[]) {
    this.root = root;
    this.wordPairs = wordPairs;
    const progress = loadGameProgress();
    this.draft = progress?.state.config ?? loadSetupConfig();
    this.state = progress?.state ?? null;
    this.feedbackPopup =
      progress?.feedbackPopup ??
      this.popupFromLegacyPlayerId(progress?.state ?? null, progress?.eliminatedPopupPlayerId ?? null);
    this.selectedVoteId = progress?.selectedVoteId ?? null;
  }

  start(): void {
    this.render();
  }

  private setState(state: GameState | null): void {
    this.state = state;
    this.selectedVoteId = null;

    if (state) {
      saveGameProgress(state, null, this.feedbackPopup, this.selectedVoteId);
    } else {
      clearGameProgress();
    }

    this.isActionMenuOpen = false;
    this.emitSceneSnapshot();
    this.render();
  }

  private render(): void {
    if (!this.state) {
      this.renderSetup();
      this.emitSceneSnapshot();
      return;
    }

    switch (this.state.phase) {
      case "revealCover":
        this.renderRevealCover();
        break;
      case "revealShown":
        this.renderRevealShown();
        break;
      case "discussion":
        this.renderDiscussion();
        break;
      case "vote":
        this.renderVote();
        break;
      case "whiteGuess":
        this.renderWhiteGuess();
        break;
      case "result":
        this.renderResult();
        break;
      default:
        this.renderSetup();
    }

    this.bindPopupActions();
    this.bindGameActionMenu();
  }

  private renderSetup(): void {
    const playerCount = this.draft.playerNames.length;
    const roleCounts = getFixedRoleCounts(playerCount);
    const errors = validateConfig(this.draft);
    const hasErrors = errors.length > 0;

    this.root.innerHTML = `
      <section class="screen setup-screen">
        <form class="panel setup-panel" data-form="setup">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Static web game</p>
              <h1>Undercover</h1>
            </div>
          </div>

          <div class="setup-grid setup-grid-main">
            <div class="field">
              <span>Số người chơi</span>
              <div class="stepper">
                <button type="button" data-action="player-decrement" aria-label="Giảm số người chơi">−</button>
                <input data-field="playerCount" type="number" inputmode="numeric" min="${MIN_PLAYERS}" max="${MAX_PLAYERS}" value="${playerCount}" />
                <button type="button" data-action="player-increment" aria-label="Tăng số người chơi">+</button>
              </div>
            </div>
          </div>

          <div class="role-summary" aria-label="Phân vai tự động">
            ${renderRoleCount("civilian", roleCounts.civilians)}
            ${renderRoleCount("spy", roleCounts.spies)}
            ${renderRoleCount("white", roleCounts.whites)}
          </div>

          <div class="players-editor">
            ${this.draft.playerNames
              .map(
                (name, index) => `
                  <label class="player-name-row">
                    <span>${index + 1}</span>
                    <input data-name-index="${index}" type="text" value="${escapeAttr(name)}" />
                  </label>
                `,
              )
              .join("")}
          </div>

          ${renderErrors(errors)}

          <div class="actions setup-actions">
            <button class="primary-button" data-action="start-game" type="submit" ${hasErrors ? "disabled" : ""}>Bắt đầu</button>
          </div>
        </form>
      </section>
    `;

    this.root
      .querySelector<HTMLFormElement>('[data-form="setup"]')
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        this.startGame();
      });

    this.root.querySelectorAll<HTMLInputElement>("[data-name-index]").forEach((input) => {
      input.addEventListener("input", () => {
        const index = Number(input.dataset.nameIndex);
        this.draft.playerNames[index] = input.value;
        this.updateSetupValidation();
      });
    });

    this.root.querySelectorAll<HTMLElement>("[data-field]").forEach((input) => {
      input.addEventListener("change", () => {
        this.updateDraftFromInput(input as HTMLInputElement | HTMLSelectElement);
      });
    });

    this.root.querySelector('[data-action="player-decrement"]')?.addEventListener("click", () => {
      this.setPlayerCount(playerCount - 1);
    });

    this.root.querySelector('[data-action="player-increment"]')?.addEventListener("click", () => {
      this.setPlayerCount(playerCount + 1);
    });

  }

  private renderRevealCover(): void {
    const player = this.getCurrentPlayerOrThrow();

    this.root.innerHTML = `
      <section class="screen centered-screen has-action-menu">
        <div class="panel reveal-panel">
          ${this.renderProgress()}
          <p class="eyebrow">Lượt xem thẻ</p>
          <h1>${escapeHtml(player.name)}</h1>
          <div class="hidden-card">
            <span>?</span>
          </div>
          <div class="actions reveal-actions">
            <button class="primary-button" data-action="show-role">Xem thẻ</button>
          </div>
        </div>
        ${this.renderGameActionMenu()}
      </section>
    `;

    this.root.querySelector('[data-action="show-role"]')?.addEventListener("click", () => {
      if (!this.state) {
        return;
      }

      this.setState(revealCurrentPlayer(this.state));
    });
  }

  private renderRevealShown(): void {
    const player = this.getCurrentPlayerOrThrow();
    const isWhite = player.role === "white";
    const word = player.word ?? "";
    const wordCard =
      isWhite
        ? `<div class="word-card blank-word-card" aria-label="White has no keyword"></div>`
        : `
          <div class="word-card">
            ${clueIcon()}
            <span>T&#7915; kho&#225; c&#7911;a b&#7841;n</span>
            <strong>${escapeHtml(word)}</strong>
          </div>
        `;
    const panelClass = isWhite ? roleClass("white") : "word-only";
    const revealTitle = isWhite
      ? `${roleIcon("white")} ${ROLE_LABELS.white}`
      : `${clueIcon()} T&#7915; kho&#225; c&#7911;a b&#7841;n`;
    const nextButtonLabel =
      this.state && this.state.currentRevealIndex >= this.state.players.length - 1
        ? "Bắt đầu thảo luận"
        : "Ẩn và chuyển máy";

    this.root.innerHTML = `
      <section class="screen centered-screen has-action-menu">
        <div class="panel reveal-panel ${panelClass}">
          ${this.renderProgress()}
          <p class="eyebrow">${escapeHtml(player.name)}</p>
          <h1>${revealTitle}</h1>
          ${wordCard}
          <div class="actions reveal-actions">
            <button class="primary-button" data-action="hide-role">${nextButtonLabel}</button>
          </div>
        </div>
        ${this.renderGameActionMenu()}
      </section>
    `;

    this.root.querySelector('[data-action="hide-role"]')?.addEventListener("click", () => {
      if (!this.state) {
        return;
      }

      this.setState(advanceReveal(this.state));
    });
  }

  private renderDiscussion(): void {
    if (!this.state) {
      return;
    }

    const alivePlayers = getAlivePlayers(this.state);
    const counts = getRoleCounts(alivePlayers);

    this.root.innerHTML = `
      <section class="screen game-screen has-action-menu">
        <div class="panel game-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Vòng ${this.state.round}</p>
              <h1>Thảo luận</h1>
            </div>
          </div>

          ${this.notice ? `<div class="notice">${escapeHtml(this.notice)}</div>` : ""}

          ${renderAliveSummary(alivePlayers.length, counts)}

          <div class="player-list compact">
            ${alivePlayers.map((player) => renderAlivePlayer(player)).join("")}
          </div>

          <div class="actions">
            <button class="primary-button" data-action="start-vote">Bỏ phiếu</button>
          </div>
        </div>
        ${this.renderFeedbackPopup()}
        ${this.renderGameActionMenu()}
      </section>
    `;
    this.notice = "";

    this.root.querySelector('[data-action="start-vote"]')?.addEventListener("click", () => {
      if (this.state) {
        this.setState(startVote(this.state));
      }
    });
  }

  private renderVote(): void {
    if (!this.state) {
      return;
    }

    const alivePlayers = getAlivePlayers(this.state);
    const counts = getRoleCounts(alivePlayers);
    const selected = this.selectedVoteId
      ? alivePlayers.find((player) => player.id === this.selectedVoteId)
      : null;

    this.root.innerHTML = `
      <section class="screen game-screen has-action-menu">
        <div class="panel game-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Vòng ${this.state.round}</p>
              <h1>Bỏ phiếu</h1>
            </div>
          </div>

          ${this.notice ? `<div class="notice">${escapeHtml(this.notice)}</div>` : ""}
          ${renderAliveSummary(alivePlayers.length, counts)}

          <div class="vote-grid">
            ${alivePlayers
              .map(
                (player) => `
                  <button class="vote-card ${
                    this.selectedVoteId === player.id ? "selected" : ""
                  }" data-vote-id="${player.id}">
                    ${playerIcon()}
                    <span class="player-name">${escapeHtml(player.name)}</span>
                  </button>
                `,
              )
              .join("")}
          </div>

          <div class="actions two-actions">
            <button class="secondary-button" data-action="back-discussion">Quay lại</button>
            <button class="primary-button" data-action="confirm-vote" ${
              selected ? "" : "disabled"
            }>Loại</button>
          </div>
        </div>
        ${this.renderFeedbackPopup()}
        ${this.renderGameActionMenu()}
      </section>
    `;

    this.root.querySelectorAll<HTMLButtonElement>("[data-vote-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedVoteId = button.dataset.voteId ?? null;
        if (this.state) {
          saveGameProgress(
            this.state,
            null,
            this.feedbackPopup,
            this.selectedVoteId,
          );
        }
        this.render();
      });
    });

    this.root.querySelector('[data-action="back-discussion"]')?.addEventListener("click", () => {
      if (this.state) {
        this.setState({ ...this.state, phase: "discussion" });
      }
    });

    this.root.querySelector('[data-action="confirm-vote"]')?.addEventListener("click", () => {
      if (!this.state || !this.selectedVoteId) {
        return;
      }

      const eliminated = this.state.players.find(
        (player) => player.id === this.selectedVoteId,
      );

      if (
        eliminated &&
        !window.confirm(`Bạn có chắc chắn muốn loại ${eliminated.name} không?`)
      ) {
        return;
      }

      const nextState = eliminatePlayer(this.state, this.selectedVoteId);

      if (eliminated) {
        this.feedbackPopup = popupForEliminatedPlayer(eliminated);
      }

      this.setState(nextState);
    });
  }

  private renderWhiteGuess(): void {
    if (!this.state) {
      return;
    }

    const player = this.state.players.find(
      (candidate) => candidate.id === this.state?.pendingWhiteGuessForPlayerId,
    );

    this.root.innerHTML = `
      <section class="screen centered-screen has-action-menu">
        <form class="eliminated-modal role-white" data-form="white-guess">
          <div class="modal-role-icon">${roleIcon("white")}</div>
          <p class="modal-player-name">${player ? escapeHtml(player.name) : "Mũ trắng"}</p>
          <h1>Chúc mừng mũ trắng đã bị loại!</h1>
          <label class="field guess-field">
            <span>Đoán từ khoá của dân (không bắt buộc)</span>
            <input data-field="whiteGuess" type="text" autocomplete="off" autofocus />
          </label>
          <div class="actions reveal-actions">
            <button class="primary-button" type="submit">Đoán và tiếp tục</button>
          </div>
        </form>
        ${this.renderGameActionMenu()}
      </section>
    `;
    this.notice = "";

    this.root
      .querySelector<HTMLFormElement>('[data-form="white-guess"]')
      ?.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!this.state) {
          return;
        }

        const input = this.root.querySelector<HTMLInputElement>('[data-field="whiteGuess"]');
        const guess = input?.value.trim() ?? "";

        input?.blur();
        window.scrollTo(0, 0);

        const nextState = submitWhiteGuess(this.state, guess);

        if (guess && nextState.phase !== "result") {
          this.notice = "";
          this.feedbackPopup = {
            kind: "whiteWrongGuess",
            playerId: player?.id ?? null,
          };
        }

        this.setState(nextState);
      });
  }

  private renderResult(): void {
    if (!this.state || !this.state.winner) {
      return;
    }

    const winner = this.state.winner;

    this.root.innerHTML = `
      <section class="screen game-screen">
        <div class="panel game-panel result-panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Kết quả</p>
              <h1>${WINNER_LABELS[winner.team]}</h1>
            </div>
            <div class="round-stat">
              <span>${this.state.round}</span>
              vòng
            </div>
          </div>

          ${this.notice ? `<div class="notice">${escapeHtml(this.notice)}</div>` : ""}
          <div class="notice strong">${escapeHtml(winner.reason)}</div>
          <div class="word-pair">
            <div><span>Từ khoá của dân</span><strong>${escapeHtml(
              this.state.selectedWordPair.civilianWord,
            )}</strong></div>
            <div><span>Từ khoá của gián điệp</span><strong>${escapeHtml(
              this.state.selectedWordPair.spyWord,
            )}</strong></div>
          </div>

          ${renderResultGroups(this.state.players)}

          <div class="actions two-actions">
            <button class="secondary-button" data-action="setup">Cài đặt</button>
            <button class="primary-button" data-action="replay">Chơi lại</button>
          </div>
        </div>
        ${this.renderFeedbackPopup()}
      </section>
    `;
    this.notice = "";

    this.root.querySelector('[data-action="setup"]')?.addEventListener("click", () => {
      this.confirmReplayToSetup();
    });

    this.root.querySelector('[data-action="replay"]')?.addEventListener("click", () => {
      if (!this.state) {
        return;
      }

      this.confirmReplay();
    });
  }

  private startGame(): void {
    const rawConfig = {
      ...this.draft,
      playerNames: this.draft.playerNames.map((name) => name.trim()),
      seed: createSeed(),
    };
    const errors = validateConfig(rawConfig);

    if (errors.length > 0) {
      this.renderSetup();
      return;
    }

    const config = normalizeConfig(rawConfig);
    saveSetupConfig(config);
    this.draft = config;
    this.feedbackPopup = null;
    this.setState(createGame(config, this.wordPairs));
  }

  private updateDraftFromInput(input: HTMLInputElement | HTMLSelectElement): void {
    const field = input.dataset.field;

    if (field === "playerCount") {
      this.setPlayerCount(Number(input.value));
      return;
    }

  }

  private updateSetupValidation(): void {
    const errors = validateConfig(this.draft);
    const errorList = this.root.querySelector<HTMLElement>("[data-setup-errors]");
    const startButton = this.root.querySelector<HTMLButtonElement>('[data-action="start-game"]');
    const duplicateIndexes = getDuplicateNameIndexes(this.draft.playerNames);

    if (errorList) {
      errorList.classList.toggle("is-hidden", errors.length === 0);
      errorList.innerHTML = errors.map((error) => `<p>${escapeHtml(error)}</p>`).join("");
    }

    if (startButton) {
      startButton.disabled = errors.length > 0;
    }

    this.root.querySelectorAll<HTMLInputElement>("[data-name-index]").forEach((input) => {
      const index = Number(input.dataset.nameIndex);
      const isInvalid = input.value.trim().length === 0 || duplicateIndexes.has(index);
      input.classList.toggle("invalid", isInvalid);
      input.setAttribute("aria-invalid", isInvalid ? "true" : "false");
    });
  }

  private setPlayerCount(value: number): void {
    const nextCount = clamp(value, MIN_PLAYERS, MAX_PLAYERS);
    const nextNames = [...this.draft.playerNames];

    while (nextNames.length < nextCount) {
      nextNames.push(`Người chơi ${nextNames.length + 1}`);
    }

    this.draft = normalizeConfig({
      ...this.draft,
      playerNames: nextNames.slice(0, nextCount),
    });
    this.renderSetup();
  }

  private getCurrentPlayerOrThrow(): Player {
    if (!this.state) {
      throw new Error("Game state is not ready.");
    }

    const player = getCurrentRevealPlayer(this.state);

    if (!player) {
      throw new Error("Current reveal player is missing.");
    }

    return player;
  }

  private renderProgress(): string {
    if (!this.state) {
      return "";
    }

    const current = Math.min(this.state.currentRevealIndex + 1, this.state.players.length);
    return `
      <div class="progress-track" aria-label="Tiến độ chia vai">
        <span style="width: ${(current / this.state.players.length) * 100}%"></span>
      </div>
      <p class="progress-copy">${current}/${this.state.players.length}</p>
    `;
  }

  private emitSceneSnapshot(): void {
    window.dispatchEvent(
      new CustomEvent("undercover:scene", {
        detail: toSceneSnapshot(this.state),
      }),
    );
  }

  private renderFeedbackPopup(): string {
    if (!this.state) {
      return "";
    }

    if (!this.feedbackPopup) {
      return "";
    }

    const player = getPlayerById(this.state, this.feedbackPopup.playerId);
    const role = popupRole(this.feedbackPopup, player);
    const title = popupTitle(this.feedbackPopup);

    return `
      <div class="modal-backdrop" role="dialog" aria-modal="true">
        <div class="eliminated-modal ${roleClass(role)}">
          <div class="modal-role-icon">${roleIcon(role)}</div>
          ${player ? `<p class="eyebrow reveal-player-meta">${escapeHtml(player.name)}</p>` : ""}
          <h1>${title}</h1>
          <div class="actions reveal-actions">
            <button class="primary-button" data-action="close-feedback-popup">Tiếp tục</button>
          </div>
        </div>
      </div>
    `;
  }

  private bindPopupActions(): void {
    this.root
      .querySelector('[data-action="close-feedback-popup"]')
      ?.addEventListener("click", () => {
        this.feedbackPopup = null;

        if (this.state) {
          saveGameProgress(
            this.state,
            null,
            this.feedbackPopup,
            this.selectedVoteId,
          );
        }

        this.render();
      });
  }

  private renderGameActionMenu(): string {
    if (!this.state || this.state.phase === "result") {
      return "";
    }

    return `
      ${this.isActionMenuOpen ? this.renderActionSheet() : ""}
      <nav class="bottom-action-bar" aria-label="Menu game">
        <button
          class="bottom-menu-button"
          type="button"
          data-action="open-action-menu"
          aria-expanded="${this.isActionMenuOpen ? "true" : "false"}"
        >
          ${menuIcon()}
          <span>Menu</span>
        </button>
      </nav>
    `;
  }

  private renderActionSheet(): string {
    return `
      <div class="action-sheet-backdrop" data-action="close-action-menu"></div>
      <div class="action-sheet" role="dialog" aria-modal="true" aria-label="Tính năng game">
        <div class="action-sheet-handle" aria-hidden="true"></div>
        <p class="action-sheet-title">Tính năng game</p>
        <button class="action-sheet-button primary-action" type="button" data-action="menu-replay">
          ${replayIcon()}
          <span>Chơi lại</span>
        </button>
        <button class="action-sheet-button" type="button" data-action="menu-setup">
          ${setupIcon()}
          <span>Về cài đặt</span>
        </button>
        <button class="action-sheet-button quiet-action" type="button" data-action="close-action-menu">
          ${closeIcon()}
          <span>Đóng</span>
        </button>
      </div>
    `;
  }

  private bindGameActionMenu(): void {
    this.root.querySelector('[data-action="open-action-menu"]')?.addEventListener("click", () => {
      this.isActionMenuOpen = true;
      this.render();
    });

    this.root.querySelectorAll('[data-action="close-action-menu"]').forEach((element) => {
      element.addEventListener("click", () => {
        this.isActionMenuOpen = false;
        this.render();
      });
    });

    this.root.querySelector('[data-action="menu-replay"]')?.addEventListener("click", () => {
      this.isActionMenuOpen = false;
      this.render();
      this.confirmReplay();
    });

    this.root.querySelector('[data-action="menu-setup"]')?.addEventListener("click", () => {
      this.isActionMenuOpen = false;
      this.render();
      this.confirmReplayToSetup();
    });
  }

  private confirmReplay(): void {
    if (!this.state) {
      return;
    }

    const config = {
      ...this.state.config,
      seed: createSeed(),
    };
    this.draft = config;
    this.feedbackPopup = null;
    this.setState(createGame(config, this.wordPairs));
  }

  private confirmReplayToSetup(): void {
    if (!this.state) {
      return;
    }

    this.draft = {
      ...this.state.config,
      seed: createSeed(),
    };
    this.feedbackPopup = null;
    this.setState(null);
  }

  private popupFromLegacyPlayerId(
    state: GameState | null,
    playerId: string | null,
  ): FeedbackPopup | null {
    const player = state ? getPlayerById(state, playerId) : null;

    if (!player) {
      return null;
    }

    return popupForEliminatedPlayer(player);
  }
}

function popupForEliminatedPlayer(player: Player): FeedbackPopup | null {
  if (player.role === "civilian") {
    return {
      kind: "civilianEliminated",
      playerId: player.id,
    };
  }

  if (player.role === "spy") {
    return {
      kind: "spyEliminated",
      playerId: player.id,
    };
  }

  return null;
}

function popupRole(popup: FeedbackPopup, player: Player | null): "civilian" | "spy" | "white" {
  if (popup.kind === "whiteWrongGuess") {
    return "white";
  }

  return player?.role === "spy" ? "spy" : "civilian";
}

function popupTitle(popup: FeedbackPopup): string {
  if (popup.kind === "civilianEliminated") {
    return "Đáng tiếc quá, dân đã bị loại rồi!";
  }

  if (popup.kind === "spyEliminated") {
    return "Chúc mừng gián điệp đã bị loại";
  }

  return "Bạn đã đoán sai từ khoá của dân";
}

function renderAliveSummary(total: number, counts: { civilians: number; spies: number; whites: number }): string {
  return `
    <div class="alive-summary">
      <div><strong>${total}</strong><span>Tổng còn sống</span></div>
      <div class="role-civilian">${roleIcon("civilian")}<strong>${counts.civilians}</strong><span>${ROLE_LABELS.civilian}</span></div>
      <div class="role-spy">${roleIcon("spy")}<strong>${counts.spies}</strong><span>${ROLE_LABELS.spy}</span></div>
      <div class="role-white">${roleIcon("white")}<strong>${counts.whites}</strong><span>${ROLE_LABELS.white}</span></div>
    </div>
  `;
}

function renderRoleCount(role: "civilian" | "spy" | "white", count: number): string {
  return `
    <div class="role-count ${roleClass(role)}">
      ${roleIcon(role)}
      <strong>${count}</strong>
      <span>${ROLE_LABELS[role]}</span>
    </div>
  `;
}

function renderErrors(errors: string[]): string {
  return `
    <div class="error-list ${errors.length === 0 ? "is-hidden" : ""}" data-setup-errors>
      ${errors.map((error) => `<p>${escapeHtml(error)}</p>`).join("")}
    </div>
  `;
}

function getDuplicateNameIndexes(names: string[]): Set<number> {
  const indexesByName = new Map<string, number[]>();

  names.forEach((name, index) => {
    const normalizedName = normalizeText(name);

    if (!normalizedName) {
      return;
    }

    const indexes = indexesByName.get(normalizedName) ?? [];
    indexes.push(index);
    indexesByName.set(normalizedName, indexes);
  });

  const duplicateIndexes = new Set<number>();

  indexesByName.forEach((indexes) => {
    if (indexes.length > 1) {
      indexes.forEach((index) => duplicateIndexes.add(index));
    }
  });

  return duplicateIndexes;
}

function renderAlivePlayer(player: Player): string {
  return `
    <div class="player-row">
      ${renderPlayerOrder(player)}
      ${playerIcon()}
      <strong class="player-name">${escapeHtml(player.name)}</strong>
    </div>
  `;
}

function renderResultGroups(players: Player[]): string {
  return `
    <div class="result-groups">
      ${renderResultGroup("civilian", players)}
      ${renderResultGroup("spy", players)}
      ${renderResultGroup("white", players)}
    </div>
  `;
}

function renderResultGroup(role: "civilian" | "spy" | "white", players: Player[]): string {
  const rolePlayers = players.filter((player) => player.role === role);

  return `
    <div class="result-group ${roleClass(role)}">
      <div class="result-group-header">
        ${roleIcon(role)}
        <div>
          <strong>${ROLE_LABELS[role]}</strong>
          <span>${rolePlayers.length} người</span>
        </div>
      </div>
      <div class="result-group-list">
        ${rolePlayers.map((player) => renderResultGroupPlayer(player)).join("")}
      </div>
    </div>
  `;
}

function renderResultGroupPlayer(player: Player): string {
  return `
    <div class="result-group-player ${player.alive ? "" : "eliminated"}">
      ${playerIcon()}
      <span class="player-name">${escapeHtml(player.name)}</span>
    </div>
  `;
}

function renderPlayerOrder(player: Player): string {
  return `<span class="player-order" aria-label="Thứ tự ${getPlayerOrder(player)}">${getPlayerOrder(player)}</span>`;
}

function getPlayerOrder(player: Player): number {
  if (Number.isFinite(player.order)) {
    return player.order;
  }

  const parsedOrder = Number(player.id.replace(/^p-/, ""));
  return Number.isFinite(parsedOrder) && parsedOrder > 0 ? parsedOrder : 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
