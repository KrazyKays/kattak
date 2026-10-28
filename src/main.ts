import Phaser from "phaser";
import { createGameConfig } from "./game/config";
import { GameProgression } from "./game/progression";
import { bindAutosave, getBrowserStorage, loadGame } from "./game/save";
import { TutorialGuide } from "./game/tutorial";
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
const storage = getBrowserStorage();
loadGame(storage, progression, tutorial);

new Phaser.Game(createGameConfig(progression, tutorial));
bindProgressionUi(progression, tutorial);
bindActionsUi(progression, tutorial);
bindPrestigeUi(progression);
// Après le prestige : la visibilité de son onglet doit déjà être à jour.
bindTabsUi(progression);
bindSummonPopupUi(progression);
bindTutorialUi(tutorial);
bindSaveUi(bindAutosave(storage, progression, tutorial));
