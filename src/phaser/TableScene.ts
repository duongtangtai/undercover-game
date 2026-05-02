import Phaser from "phaser";
import type { SceneSnapshot } from "../game/types";

export class TableScene extends Phaser.Scene {
  private board!: Phaser.GameObjects.Graphics;
  private snapshot: SceneSnapshot = {
    phase: "setup",
    round: 0,
    aliveCount: 0,
    playerCount: 0,
    winnerTeam: null,
  };

  constructor() {
    super("TableScene");
  }

  create(): void {
    this.board = this.add.graphics();

    window.addEventListener("undercover:scene", this.handleSceneEvent);
    this.scale.on("resize", this.redraw, this);
    this.events.once("shutdown", () => {
      window.removeEventListener("undercover:scene", this.handleSceneEvent);
    });

    this.redraw();
  }

  private handleSceneEvent = (event: Event): void => {
    this.snapshot = (event as CustomEvent<SceneSnapshot>).detail;
    this.redraw();
  };

  private redraw(): void {
    if (!this.board) {
      return;
    }

    const width = this.scale.width;
    const height = this.scale.height;
    const phaseColor = getPhaseColor(this.snapshot);

    this.board.clear();
    this.drawRoom(width, height, phaseColor);
    this.drawTable(width, height, phaseColor);
    this.drawPlayerSilhouettes(width, height, phaseColor);
    this.drawClueCards(width, height, phaseColor);
  }

  private drawRoom(width: number, height: number, phaseColor: number): void {
    const wallHeight = height * 0.68;
    const panelCount = Math.max(4, Math.ceil(width / 180));
    const panelWidth = width / panelCount;

    this.board.fillStyle(0x0b1118, 1);
    this.board.fillRect(0, 0, width, height);

    this.board.fillStyle(0x111827, 0.9);
    this.board.fillRect(0, 0, width, wallHeight);
    this.board.fillStyle(0x17100d, 0.9);
    this.board.fillRect(0, wallHeight, width, height - wallHeight);

    for (let index = 0; index <= panelCount; index += 1) {
      const x = index * panelWidth;
      this.board.lineStyle(1, 0xffffff, 0.035);
      this.board.beginPath();
      this.board.moveTo(x, 0);
      this.board.lineTo(x + panelWidth * 0.18, wallHeight);
      this.board.strokePath();
    }

    this.board.fillStyle(phaseColor, 0.055);
    this.board.beginPath();
    this.board.moveTo(width * 0.5, 0);
    this.board.lineTo(width * 0.18, wallHeight);
    this.board.lineTo(width * 0.82, wallHeight);
    this.board.closePath();
    this.board.fillPath();

    this.board.fillStyle(0x020617, 0.24);
    this.board.fillRect(0, 0, width * 0.18, height);
    this.board.fillRect(width * 0.82, 0, width * 0.18, height);

    this.board.fillStyle(phaseColor, 0.16);
    this.board.fillRoundedRect(width * 0.12, 18, width * 0.76, 4, 2);
  }

  private drawTable(width: number, height: number, phaseColor: number): void {
    const tableWidth = Math.min(width * 0.92, 980);
    const tableHeight = Math.max(170, Math.min(300, height * 0.28));
    const tableX = (width - tableWidth) / 2;
    const tableY = height - tableHeight - Math.max(28, height * 0.06);

    this.board.fillStyle(0x2a1b14, 0.94);
    this.board.fillRoundedRect(tableX, tableY, tableWidth, tableHeight, 34);
    this.board.lineStyle(2, phaseColor, 0.24);
    this.board.strokeRoundedRect(tableX + 6, tableY + 6, tableWidth - 12, tableHeight - 12, 28);

    this.board.fillStyle(0x0f1720, 0.34);
    this.board.fillRoundedRect(tableX + 18, tableY + 18, tableWidth - 36, tableHeight - 36, 24);

    const grainLines = width < 520 ? 5 : 8;
    for (let index = 0; index < grainLines; index += 1) {
      const y = tableY + 36 + (index / grainLines) * (tableHeight - 72);
      this.board.lineStyle(1, 0xf8fafc, 0.035);
      this.board.beginPath();
      this.board.moveTo(tableX + 34, y);
      this.board.lineTo(tableX + tableWidth - 34, y + (index % 2 === 0 ? 8 : -8));
      this.board.strokePath();
    }
  }

  private drawPlayerSilhouettes(width: number, height: number, phaseColor: number): void {
    const tableY = height - Math.max(170, Math.min(300, height * 0.28)) - Math.max(28, height * 0.06);
    const centerY = tableY - 20;
    const seats = width < 520
      ? [
          [0.22, centerY + 20, 0.7],
          [0.78, centerY + 20, 0.7],
          [0.34, centerY - 78, 0.56],
          [0.66, centerY - 78, 0.56],
        ]
      : [
          [0.16, centerY + 12, 0.74],
          [0.84, centerY + 12, 0.74],
          [0.28, centerY - 74, 0.58],
          [0.5, centerY - 102, 0.54],
          [0.72, centerY - 74, 0.58],
          [0.5, centerY + 46, 0.78],
        ];

    seats.forEach(([xRatio, y, scale], index) => {
      const x = width * xRatio;
      const headRadius = 17 * scale;
      const bodyWidth = 66 * scale;
      const bodyHeight = 46 * scale;

      this.board.fillStyle(0x020617, 0.34);
      this.board.fillCircle(x, y, headRadius);
      this.board.fillRoundedRect(
        x - bodyWidth / 2,
        y + headRadius * 0.75,
        bodyWidth,
        bodyHeight,
        18 * scale,
      );

      this.board.lineStyle(1, index % 2 === 0 ? phaseColor : 0xf8fafc, 0.16);
      this.board.strokeCircle(x, y, headRadius + 4);
    });
  }

  private drawClueCards(width: number, height: number, phaseColor: number): void {
    const cardWidth = Math.max(44, Math.min(72, width * 0.12));
    const cardHeight = cardWidth * 1.34;
    const centerX = width * 0.5;
    const y = height - Math.max(150, Math.min(260, height * 0.23));
    const cards = [
      { offset: -0.82, color: 0x38bdf8 },
      { offset: 0, color: phaseColor },
      { offset: 0.82, color: 0xf43f5e },
    ];

    cards.forEach(({ offset, color }) => {
      const x = centerX + offset * cardWidth - cardWidth / 2;
      const cardY = y + Math.abs(offset) * 8 - cardHeight / 2;

      this.board.fillStyle(0xf8fafc, 0.16);
      this.board.fillRoundedRect(x, cardY, cardWidth, cardHeight, 8);
      this.board.lineStyle(1, color, 0.34);
      this.board.strokeRoundedRect(x, cardY, cardWidth, cardHeight, 8);
      this.board.fillStyle(color, 0.16);
      this.board.fillRoundedRect(x + 8, cardY + 10, cardWidth - 16, 6, 3);
      this.board.fillRoundedRect(x + 8, cardY + cardHeight - 18, cardWidth - 16, 6, 3);
    });
  }
}

function getPhaseColor(snapshot: SceneSnapshot): number {
  if (snapshot.winnerTeam === "civilian") {
    return 0x38bdf8;
  }

  if (snapshot.winnerTeam === "spy") {
    return 0xf43f5e;
  }

  if (snapshot.winnerTeam === "white") {
    return 0xf8fafc;
  }

  const colors: Partial<Record<SceneSnapshot["phase"], number>> = {
    setup: 0xd6a94f,
    revealCover: 0x38bdf8,
    revealShown: 0xd6a94f,
    discussion: 0x22c55e,
    vote: 0xf97316,
    whiteGuess: 0xe2e8f0,
    result: 0xd6a94f,
  };

  return colors[snapshot.phase] ?? 0xd6a94f;
}
