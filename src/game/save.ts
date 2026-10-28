import type { AchievementTracker } from "./achievements";
import type { GameProgression } from "./progression";
import type { TutorialGuide } from "./tutorial";

export const SAVE_KEY = "kattak:save";
const SAVE_VERSION = 1;
const AUTOSAVE_DELAY = 1000;

type SaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface AutosaveController {
  /** Écrit immédiatement la sauvegarde en attente. */
  flush(): void;
  /** Efface la sauvegarde et coupe l’écriture automatique. */
  reset(): void;
  dispose(): void;
}

export function getBrowserStorage(): SaveStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Charge la sauvegarde ; renvoie false si elle est absente ou illisible. */
export function loadGame(
  storage: SaveStorage | null,
  progression: GameProgression,
  tutorial: TutorialGuide,
  achievements?: AchievementTracker,
): boolean {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) {
      return false;
    }
    const data: unknown = JSON.parse(raw);
    if (
      typeof data !== "object" ||
      data === null ||
      !("version" in data) ||
      data.version !== SAVE_VERSION ||
      !("progression" in data)
    ) {
      return false;
    }
    if (!progression.restoreState(data.progression)) {
      return false;
    }
    if ("tutorial" in data) {
      tutorial.restore(data.tutorial);
    }
    if ("achievements" in data) {
      achievements?.restoreState(data.achievements);
    } else {
      // Sauvegarde antérieure aux succès : la partie en cours n’est pas chronométrée.
      achievements?.forgetRunStart();
    }
    return true;
  } catch {
    return false;
  }
}

export function bindAutosave(
  storage: SaveStorage | null,
  progression: GameProgression,
  tutorial: TutorialGuide,
  achievements?: AchievementTracker,
): AutosaveController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let enabled = storage !== null;

  const write = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    if (!enabled) {
      return;
    }
    try {
      storage?.setItem(
        SAVE_KEY,
        JSON.stringify({
          version: SAVE_VERSION,
          progression: progression.exportState(),
          tutorial: tutorial.getStep(),
          achievements: achievements?.exportState(),
        }),
      );
    } catch {
      // Stockage plein ou indisponible : la partie continue sans sauvegarde.
    }
  };

  // Les ressources changent souvent : on regroupe les écritures.
  const schedule = (): void => {
    if (enabled && timer === null) {
      timer = setTimeout(write, AUTOSAVE_DELAY);
    }
  };

  const onHide = (): void => {
    if (document.visibilityState === "hidden") {
      write();
    }
  };

  let initialized = false;
  const unsubscribeProgression = progression.subscribe(() => {
    if (initialized) {
      schedule();
    }
  });
  const unsubscribeTutorial = tutorial.subscribe(() => {
    if (initialized) {
      schedule();
    }
  });
  initialized = true;
  window.addEventListener("pagehide", write);
  document.addEventListener("visibilitychange", onHide);

  const dispose = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    unsubscribeProgression();
    unsubscribeTutorial();
    window.removeEventListener("pagehide", write);
    document.removeEventListener("visibilitychange", onHide);
  };

  return {
    flush: write,
    reset: () => {
      enabled = false;
      dispose();
      try {
        storage?.removeItem(SAVE_KEY);
      } catch {
        // Rien à effacer si le stockage est indisponible.
      }
    },
    dispose,
  };
}
