import {
  PRESTIGE_MIN_CROWNS,
  PRESTIGE_UPGRADES,
  type GameProgression,
  type PrestigeUpgradeId,
  type ProgressionSnapshot,
} from "../game/progression";

const CONFIRM_DELAY = 4000;

function crownsLabel(count: number): string {
  return count > 1 ? `${count} couronnes` : `${count} couronne`;
}

export function bindPrestigeUi(progression: GameProgression): () => void {
  const panel = document.getElementById("prestige-panel");
  const crownCount = document.getElementById("crown-count");
  const crownUnit = document.getElementById("crown-unit");
  const progress = document.getElementById("prestige-progress");
  const meter = document.getElementById("prestige-meter-fill");
  const prestigeButton = document.getElementById("prestige-button");
  const upgradeList = document.getElementById("prestige-upgrades");

  if (
    !(panel instanceof HTMLElement) ||
    !(crownCount instanceof HTMLOutputElement) ||
    !(crownUnit instanceof HTMLElement) ||
    !(progress instanceof HTMLElement) ||
    !(meter instanceof HTMLElement) ||
    !(prestigeButton instanceof HTMLButtonElement) ||
    !(upgradeList instanceof HTMLUListElement)
  ) {
    throw new Error("L’interface du prestige est incomplète.");
  }

  const upgradeEntries = new Map<
    PrestigeUpgradeId,
    { button: HTMLButtonElement; level: HTMLElement; effect: HTMLElement; cost: HTMLElement }
  >();

  for (const upgrade of PRESTIGE_UPGRADES) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "prestige-upgrade";
    button.dataset.upgrade = upgrade.id;

    const header = document.createElement("span");
    header.className = "prestige-upgrade-header";
    const name = document.createElement("strong");
    name.textContent = upgrade.name;
    const level = document.createElement("span");
    level.className = "prestige-upgrade-level";
    header.append(name, level);

    const description = document.createElement("span");
    description.className = "prestige-upgrade-description";
    description.textContent = upgrade.description;
    const effect = document.createElement("span");
    effect.className = "prestige-upgrade-effect";
    const cost = document.createElement("span");
    cost.className = "prestige-upgrade-cost";

    button.append(header, description, effect, cost);
    item.append(button);
    upgradeList.append(item);
    upgradeEntries.set(upgrade.id, { button, level, effect, cost });
  }

  let confirmTimer: ReturnType<typeof setTimeout> | null = null;
  let snapshot: ProgressionSnapshot = progression.getSnapshot();

  const disarm = (): void => {
    if (confirmTimer !== null) {
      clearTimeout(confirmTimer);
      confirmTimer = null;
    }
    prestigeButton.classList.remove("is-confirming");
  };

  const renderPrestigeButton = (): void => {
    const confirming = confirmTimer !== null;
    prestigeButton.disabled = !snapshot.canPrestige;
    prestigeButton.classList.toggle("crown-action", snapshot.canPrestige);
    prestigeButton.textContent = !snapshot.canPrestige
      ? `Prestige · ${PRESTIGE_MIN_CROWNS} couronnes en attente requises`
      : confirming
        ? `Confirmer : tout recommencer pour ${crownsLabel(snapshot.pendingCrowns)} ?`
        : `Prestige · +${crownsLabel(snapshot.pendingCrowns)}`;
  };

  const render = (next: ProgressionSnapshot): void => {
    snapshot = next;
    // Le panneau apparaît dès la première couronne en vue.
    panel.hidden =
      snapshot.prestigeCount === 0 &&
      snapshot.crowns === 0 &&
      snapshot.pendingCrowns === 0;

    crownCount.value = String(snapshot.crowns);
    crownUnit.textContent =
      snapshot.crowns > 1 ? "couronnes à dépenser" : "couronne à dépenser";

    progress.textContent =
      `${crownsLabel(snapshot.pendingCrowns)} en attente · ` +
      `${snapshot.runResourcesCollected}/${snapshot.nextCrownAt} pépites récoltées pour la suivante.`;
    const span = snapshot.nextCrownAt - snapshot.currentCrownAt;
    const ratio =
      span > 0
        ? (snapshot.runResourcesCollected - snapshot.currentCrownAt) / span
        : 0;
    meter.style.width = `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%`;

    if (!snapshot.canPrestige) {
      disarm();
    }
    renderPrestigeButton();

    for (const upgradeState of snapshot.prestigeUpgrades) {
      const entry = upgradeEntries.get(upgradeState.id);
      const upgrade = PRESTIGE_UPGRADES.find(({ id }) => id === upgradeState.id);
      if (!entry || !upgrade) {
        continue;
      }
      const maxed = upgradeState.nextCost === null;
      const affordable = !maxed && snapshot.crowns >= (upgradeState.nextCost ?? 0);
      entry.button.disabled = !affordable;
      entry.button.classList.toggle("crown-action", affordable);
      entry.button.classList.toggle("is-maxed", maxed);
      entry.level.textContent = `${upgradeState.level}/${upgradeState.maxLevel}`;
      entry.effect.textContent =
        upgradeState.level > 0
          ? `Actuel : ${upgrade.describeLevel(upgradeState.level)}`
          : `Niv. 1 : ${upgrade.describeLevel(1)}`;
      entry.cost.textContent = maxed
        ? "Niveau max"
        : `${crownsLabel(upgradeState.nextCost ?? 0)}`;
      entry.button.setAttribute(
        "aria-label",
        maxed
          ? `${upgrade.name}, niveau max`
          : `Acheter ${upgrade.name} niveau ${upgradeState.level + 1} pour ${crownsLabel(upgradeState.nextCost ?? 0)}`,
      );
    }
  };

  const onPrestigeClick = (): void => {
    if (!snapshot.canPrestige) {
      return;
    }
    // Un premier clic arme la confirmation pour éviter une remise à zéro accidentelle.
    if (confirmTimer === null) {
      prestigeButton.classList.add("is-confirming");
      confirmTimer = setTimeout(() => {
        disarm();
        renderPrestigeButton();
      }, CONFIRM_DELAY);
      renderPrestigeButton();
      return;
    }
    disarm();
    progression.prestige();
  };

  const onUpgradeClick = (event: Event): void => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest<HTMLButtonElement>("button[data-upgrade]");
    const id = button?.dataset.upgrade as PrestigeUpgradeId | undefined;
    if (id) {
      progression.buyPrestigeUpgrade(id);
    }
  };

  const unsubscribe = progression.subscribe(render);
  prestigeButton.addEventListener("click", onPrestigeClick);
  upgradeList.addEventListener("click", onUpgradeClick);

  return () => {
    disarm();
    unsubscribe();
    prestigeButton.removeEventListener("click", onPrestigeClick);
    upgradeList.removeEventListener("click", onUpgradeClick);
  };
}
