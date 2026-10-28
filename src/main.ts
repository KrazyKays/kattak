import Phaser from "phaser";
import { AchievementTracker } from "./game/achievements";
import { createGameConfig } from "./game/config";
import { GameProgression } from "./game/progression";
import { bindAutosave, getBrowserStorage, loadGame } from "./game/save";
import { TutorialGuide } from "./game/tutorial";
import { bindAchievementsUi } from "./ui/AchievementsUi";
import { bindActionsUi } from "./ui/ActionsUi";
import { bindPrestigeUi } from "./ui/PrestigeUi";
import { bindProgressionUi } from "./ui/ProgressionUi";
import { bindSaveUi } from "./ui/SaveUi";
import { bindSummonPopupUi } from "./ui/SummonPopupUi";
import { bindTabsUi } from "./ui/TabsUi";
import { bindTutorialUi } from "./ui/TutorialUi";
import "./style.css";

const progression = new GameProgression();
const tutorial = new TutorialGuide();
const achievements = new AchievementTracker();
const storage = getBrowserStorage();
loadGame(storage, progression, tutorial, achievements);
achievements.observe(progression);

// Le chrono démarre à la première commande dans l’arène et suit la visibilité de la page.
const arena = document.getElementById("game");
const startClock = (): void => {
  achievements.start();
  arena?.removeEventListener("pointerdown", startClock, true);
};
arena?.addEventListener("pointerdown", startClock, true);
achievements.setHidden(document.visibilityState === "hidden");
document.addEventListener("visibilitychange", () => {
  achievements.setHidden(document.visibilityState === "hidden");
});

new Phaser.Game(createGameConfig(progression, tutorial));
bindProgressionUi(progression, tutorial);
bindActionsUi(progression, tutorial);
bindPrestigeUi(progression);
// Après le prestige : la visibilité de son onglet doit déjà être à jour.
bindTabsUi(progression);
bindSummonPopupUi(progression);
bindTutorialUi(tutorial);
bindAchievementsUi(achievements);
bindSaveUi(bindAutosave(storage, progression, tutorial, achievements));
