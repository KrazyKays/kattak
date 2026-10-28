import type { AutosaveController } from "../game/save";

export function bindSaveUi(
  autosave: AutosaveController,
  confirmReset: (message: string) => boolean = (message) =>
    window.confirm(message),
  reload: () => void = () => window.location.reload(),
): () => void {
  const resetButton = document.getElementById("save-reset-button");
  if (!(resetButton instanceof HTMLButtonElement)) {
    throw new Error("Le bouton de réinitialisation est introuvable.");
  }

  const reset = (): void => {
    if (
      confirmReset(
        "Effacer définitivement la sauvegarde, couronnes et talents compris ?",
      )
    ) {
      autosave.reset();
      reload();
    }
  };

  resetButton.addEventListener("click", reset);
  return () => resetButton.removeEventListener("click", reset);
}
