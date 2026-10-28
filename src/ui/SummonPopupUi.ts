import {
  COMPANION_RARITIES,
  type GameProgression,
  type SummonedCompanion,
} from "../game/progression";

export const SUMMON_POPUP_DURATION = 2600;

function rarityRank(summon: SummonedCompanion): number {
  return COMPANION_RARITIES.findIndex(({ id }) => id === summon.companion.rarity);
}

/** Met en avant l’invocation la plus rare d’un lot, puis le niveau le plus haut. */
export function pickFeaturedSummon(
  summons: readonly SummonedCompanion[],
): SummonedCompanion {
  return summons.reduce((best, summon) =>
    rarityRank(summon) > rarityRank(best) ||
    (rarityRank(summon) === rarityRank(best) && summon.level > best.level)
      ? summon
      : best,
  );
}

export function bindSummonPopupUi(progression: GameProgression): () => void {
  const popup = document.getElementById("summon-popup");
  if (!(popup instanceof HTMLElement)) {
    throw new Error("La fenêtre d’invocation est introuvable.");
  }

  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  const unsubscribe = progression.onSummon(({ summons, automatic }) => {
    const featured = pickFeaturedSummon(summons);
    const rarity = COMPANION_RARITIES.find(
      ({ id }) => id === featured.companion.rarity,
    );
    const maxLevel = progression.getMaxCompanionLevel();

    const rarityLabel = document.createElement("span");
    rarityLabel.className = "summon-popup-rarity";
    rarityLabel.textContent = `${rarity?.name ?? ""}${automatic ? " · auto" : ""}`;
    const name = document.createElement("strong");
    name.className = "summon-popup-name";
    name.textContent = featured.companion.name;
    const detail = document.createElement("span");
    detail.className = "summon-popup-detail";
    detail.textContent =
      featured.level === 1
        ? `Nouveau compagnon ! ${featured.companion.describeLevel(1)}`
        : `Niveau ${featured.level}${featured.level >= maxLevel ? " · Max" : ""} · ${featured.companion.describeLevel(featured.level)}`;
    popup.replaceChildren(rarityLabel, name, detail);

    if (summons.length > 1) {
      const extra = document.createElement("span");
      extra.className = "summon-popup-extra";
      extra.textContent = `+${summons.length - 1} autre${summons.length > 2 ? "s" : ""} invocation${summons.length > 2 ? "s" : ""}`;
      popup.append(extra);
    }

    popup.className = `summon-popup rarity-${featured.companion.rarity}`;
    popup.hidden = false;
    // Relance l’animation d’apparition même si la fenêtre est déjà visible.
    void popup.offsetWidth;
    popup.classList.add("is-visible");

    if (hideTimer !== null) {
      clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
      popup.hidden = true;
      popup.classList.remove("is-visible");
      hideTimer = null;
    }, SUMMON_POPUP_DURATION);
  });

  return () => {
    unsubscribe();
    if (hideTimer !== null) {
      clearTimeout(hideTimer);
    }
  };
}
