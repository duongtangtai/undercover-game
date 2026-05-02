import Phaser from "phaser";
import "./styles.css";
import { TableScene } from "./phaser/TableScene";
import { UndercoverApp } from "./ui/UndercoverApp";
import wordPairs from "./game/wordPairs.vi.json";
import type { WordPair } from "./game/types";

const gameParent = document.querySelector<HTMLElement>("#phaser-game");
const uiRoot = document.querySelector<HTMLElement>("#ui-root");

if (!gameParent || !uiRoot) {
  throw new Error("App root is missing.");
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: gameParent,
  backgroundColor: "#0f1720",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [TableScene],
});

const app = new UndercoverApp(uiRoot, wordPairs as WordPair[]);
app.start();
