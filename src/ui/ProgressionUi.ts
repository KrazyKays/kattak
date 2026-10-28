import {
  COMPANION_RARITIES,
  COMPANIONS,
  GameProgression,
  MAX_REACHABLE_COMPANION_LEVEL,
} from "../game/progression";
import type { TutorialGuide } from "../game/tutorial";
import type { CompanionId, ProgressionSnapshot } from "../game/progression";

const chanceFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

export function bindProgressionUi(
  progression: GameProgression,
  tutorial: TutorialGuide,
): () => void {
  const resourceCount = document.getElementById("resource-count");
  const resourceUnit = document.getElementById("resource-unit");
  const summonButton = document.getElementById("summon-button");
  const summonAllButton = document.getElementById("summon-all-button");
  const summonPreview = document.getElementById("summon-preview");
  const summonResult = document.getElementById("summon-result");
  const companionChances = document.getElementById("companion-chances");
  const companionList = document.getElementById("companion-list");
  const actionHistory = document.getElementById("action-history");

  if (
    !(resourceCount instanceof HTMLOutputElement) ||
    !(resourceUnit instanceof HTMLElement) ||
    !(summonButton instanceof HTMLButtonElement) ||
    !(summonAllButton instanceof HTMLButtonElement) ||
    !(summonPreview instanceof HTMLElement) ||
    !(summonResult instanceof HTMLElement) ||
    !(companionChances instanceof HTMLUListElement) ||
    !(companionList instanceof HTMLElement) ||
    !(actionHistory instanceof HTMLOListElement)
  ) {
    throw new Error("L’interface de progression est incomplète.");
  }

  const companionEntries = new Map<
    CompanionId,
    {
      level: HTMLOutputElement;
      rarity: HTMLElement;
      rarityName: string;
      bonuses: HTMLLIElement[];
    }
  >();
  let renderedActions: readonly string[] | null = null;
  let renderedChances = "";

  for (const companion of COMPANIONS) {
    const rarityDefinition = COMPANION_RARITIES.find(
      ({ id }) => id === companion.rarity,
    );
    if (!rarityDefinition) {
      throw new Error(`La rareté de ${companion.name} ne peut pas être affichée.`);
    }

    const item = document.createElement("details");
    item.className = "companion-entry";

    const summary = document.createElement("summary");
    const identity = document.createElement("span");
    identity.className = "companion-identity";
    const name = document.createElement("strong");
    name.textContent = companion.name;

    const level = document.createElement("output");
    level.className = "companion-level";
    level.setAttribute("aria-label", `Niveau de ${companion.name}`);

    const passive = document.createElement("span");
    passive.textContent = companion.passive;

    const rarity = document.createElement("span");
    rarity.className = `companion-rarity rarity-${companion.rarity}`;
    identity.append(name, rarity);
    summary.append(identity, level);

    const bonusLevels = document.createElement("ol");
    bonusLevels.className = "companion-bonus-levels";
    const bonuses = Array.from(
      { length: MAX_REACHABLE_COMPANION_LEVEL },
      (_, index) => {
        const bonusLevel = document.createElement("li");
        bonusLevel.textContent = `Niv. ${index + 1} : ${companion.describeLevel(index + 1)}`;
        bonusLevels.append(bonusLevel);
        return bonusLevel;
      },
    );
    companionEntries.set(companion.id, {
      level,
      rarity,
      rarityName: rarityDefinition.name,
      bonuses,
    });

    item.append(summary, passive, bonusLevels);
    companionList.append(item);
  }

  const render = (snapshot: ProgressionSnapshot): void => {
    resourceCount.value = String(snapshot.resources);
    resourceUnit.textContent =
      snapshot.resources === 1 ? "pépite" : "pépites";

    const maxLevel = snapshot.maxCompanionLevel;
    let allMaxed = true;
    for (const companion of COMPANIONS) {
      const level = snapshot.companions[companion.id];
      const entry = companionEntries.get(companion.id);
      if (!entry) {
        throw new Error(`Le niveau de ${companion.name} ne peut pas être affiché.`);
      }

      entry.level.value =
        level === 0
          ? "Non obtenu"
          : level >= maxLevel
            ? `Niv. ${level} · Max`
            : `Niv. ${level}`;
      const chance = snapshot.companionChances[companion.id];
      entry.rarity.textContent =
        entry.rarityName;
      entry.rarity.setAttribute(
        "aria-label",
        chance > 0 ? entry.rarityName : `${entry.rarityName}, niveau max`,
      );
      entry.bonuses.forEach((bonus, index) => {
        bonus.hidden = index >= maxLevel;
        bonus.classList.toggle("is-unlocked", index < level);
        bonus.classList.toggle("is-next", index === level);
      });
      if (level < maxLevel) {
        allMaxed = false;
      }
    }

    // Les chances ne changent qu’à l’invocation : inutile de reconstruire
    // la liste à chaque pépite ramassée.
    const chancesKey = COMPANIONS.map(
      ({ id }) => snapshot.companionChances[id],
    ).join("|");
    if (chancesKey !== renderedChances) {
      renderedChances = chancesKey;
      companionChances.replaceChildren(
        ...COMPANIONS.map((companion) => {
          const item = document.createElement("li");
          const chance = snapshot.companionChances[companion.id];
          item.textContent =
            chance > 0
              ? `${companion.name} · ${chanceFormat.format(chance)} %`
              : `${companion.name} · Niveau max`;
          return item;
        }),
      );
    }

    summonButton.disabled = allMaxed || snapshot.resources < snapshot.summonCost;
    summonButton.textContent = allMaxed
      ? "Tous les compagnons sont au niveau max"
      : `Invoquer 1 fois · ${snapshot.summonCost} pépites`;
    summonAllButton.disabled = allMaxed || snapshot.affordableSummons === 0;
    summonAllButton.textContent = allMaxed
      ? "Tous les compagnons sont au niveau max"
      : snapshot.affordableSummons > 0
        ? `Invoquer tout · ${snapshot.affordableSummons} fois · ${snapshot.affordableSummonCost} pépites`
        : "Invoquer tout";
    summonAllButton.classList.toggle(
      "is-multi-summon",
      snapshot.affordableSummons > 1,
    );
    summonPreview.textContent = allMaxed
      ? "Chaque pépite récoltée rapproche maintenant votre prochaine couronne de prestige."
      : snapshot.affordableSummons === 0
        ? `Prochaine invocation : ${snapshot.summonCost} pépites.`
        : "";

    if (
      renderedActions === null ||
      renderedActions.length !== snapshot.recentActions.length ||
      renderedActions.some((action, index) => action !== snapshot.recentActions[index])
    ) {
      actionHistory.replaceChildren(
        ...snapshot.recentActions.map((action) => {
          const item = document.createElement("li");
          item.textContent = action;
          return item;
        }),
      );
      renderedActions = [...snapshot.recentActions];
    }
  };

  const unsubscribe = progression.subscribe(render);
  const summon = (): void => {
    const result = progression.summon();

    switch (result.kind) {
      case "success":
        summonResult.textContent = "";
        tutorial.onCompanionSummoned();
        break;
      case "insufficient-resources":
        summonResult.textContent = `Il faut ${progression.getSummonCost()} pépites pour invoquer.`;
        break;
      case "all-maxed":
        summonResult.textContent = "Tous les compagnons ont atteint leur niveau maximal.";
        break;
    }
  };

  const summonAll = (): void => {
    const result = progression.summonAll();

    switch (result.kind) {
      case "success":
        summonResult.textContent = "";
        tutorial.onCompanionSummoned();
        break;
      case "insufficient-resources":
        summonResult.textContent = `Il faut ${progression.getSummonCost()} pépites pour invoquer.`;
        break;
      case "all-maxed":
        summonResult.textContent = "Tous les compagnons ont atteint leur niveau maximal.";
        break;
    }
  };

  summonButton.addEventListener("click", summon);
  summonAllButton.addEventListener("click", summonAll);
  return () => {
    unsubscribe();
    summonButton.removeEventListener("click", summon);
    summonAllButton.removeEventListener("click", summonAll);
  };
}
