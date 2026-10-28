import type { GameProgression, ProgressionSnapshot } from "../game/progression";
import type { TutorialGuide } from "../game/tutorial";

export function bindActionsUi(
  progression: GameProgression,
  tutorial: TutorialGuide,
): () => void {
  const fragmentCount = document.getElementById("fragment-count");
  const fragmentUnit = document.getElementById("fragment-unit");
  const wallRemovalButton = document.getElementById("wall-removal-button");
  const autoSummonButton = document.getElementById("auto-summon-button");

  if (
    !(fragmentCount instanceof HTMLOutputElement) ||
    !(fragmentUnit instanceof HTMLElement) ||
    !(wallRemovalButton instanceof HTMLButtonElement) ||
    !(autoSummonButton instanceof HTMLButtonElement)
  ) {
    throw new Error("L’interface des actions est incomplète.");
  }

  const render = (snapshot: ProgressionSnapshot): void => {
    fragmentCount.value = String(snapshot.fragments);
    fragmentUnit.textContent =
      snapshot.fragments > 1 ? "fragments disponibles" : "fragment disponible";

    const cost = snapshot.wallRemovalCost;
    const noWalls = snapshot.wallsRemaining === 0;
    const canRemoveWall = !noWalls && snapshot.fragments >= cost;

    wallRemovalButton.disabled = !canRemoveWall;
    wallRemovalButton.textContent = noWalls
      ? "Tous les murs sont supprimés"
      : `Supprimer un mur aléatoire · ${cost} fragments`;

    const unlocked = snapshot.autoSummonUnlocked;
    autoSummonButton.disabled =
      !unlocked && snapshot.fragments < snapshot.autoSummonCost;
    autoSummonButton.classList.toggle("fragment-action", !unlocked);
    autoSummonButton.classList.toggle("is-active", snapshot.autoSummonEnabled);
    if (unlocked) {
      autoSummonButton.setAttribute(
        "aria-pressed",
        String(snapshot.autoSummonEnabled),
      );
    } else {
      autoSummonButton.removeAttribute("aria-pressed");
    }
    autoSummonButton.textContent = !unlocked
      ? `Débloquer l’invocation automatique · ${snapshot.autoSummonCost} fragments`
      : snapshot.autoSummonEnabled
        ? "Invocation automatique : activée"
        : "Invocation automatique : désactivée";
  };

  const unsubscribe = progression.subscribe(render);
  // Les invocations automatiques doivent aussi faire avancer le tutoriel.
  const unsubscribeSummons = progression.onSummon(({ automatic }) => {
    if (automatic) {
      tutorial.onCompanionSummoned();
    }
  });
  const removeWall = (): void => {
    progression.removeRandomWall();
  };
  const toggleAutoSummon = (): void => {
    if (!progression.getSnapshot().autoSummonUnlocked) {
      progression.unlockAutoSummon();
      return;
    }
    progression.setAutoSummon(!progression.getSnapshot().autoSummonEnabled);
  };

  wallRemovalButton.addEventListener("click", removeWall);
  autoSummonButton.addEventListener("click", toggleAutoSummon);
  return () => {
    unsubscribe();
    unsubscribeSummons();
    wallRemovalButton.removeEventListener("click", removeWall);
    autoSummonButton.removeEventListener("click", toggleAutoSummon);
  };
}
