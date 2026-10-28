import type { GameProgression, ProgressionSnapshot } from "../game/progression";

const ACTIVE_TAB_KEY = "kattak:tab";

function readActiveTab(): string | null {
  try {
    return window.localStorage.getItem(ACTIVE_TAB_KEY);
  } catch {
    return null;
  }
}

function writeActiveTab(id: string): void {
  try {
    window.localStorage.setItem(ACTIVE_TAB_KEY, id);
  } catch {
    // Préférence de confort : on ignore un stockage indisponible.
  }
}

/** Un onglet signale une action possible tant qu’il n’est pas ouvert. */
function getTabAlerts(snapshot: ProgressionSnapshot): Record<string, boolean> {
  return {
    "tab-workshop":
      (snapshot.wallsRemaining > 0 &&
        snapshot.fragments >= snapshot.wallRemovalCost) ||
      (!snapshot.autoSummonUnlocked &&
        snapshot.fragments >= snapshot.autoSummonCost),
    "prestige-tab":
      snapshot.canPrestige ||
      snapshot.prestigeUpgrades.some(
        ({ nextCost }) => nextCost !== null && snapshot.crowns >= nextCost,
      ),
  };
}

export function bindTabsUi(progression: GameProgression): () => void {
  const tabList = document.querySelector<HTMLElement>("[role=tablist]");
  const tabs = tabList
    ? [...tabList.querySelectorAll<HTMLButtonElement>("[role=tab]")]
    : [];
  const panels = new Map<HTMLButtonElement, HTMLElement>();
  for (const tab of tabs) {
    const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
    if (panel) {
      panels.set(tab, panel);
    }
  }

  if (!tabList || tabs.length === 0 || panels.size !== tabs.length) {
    throw new Error("L’interface des onglets est incomplète.");
  }

  let activeTab = tabs[0];

  const activate = (tab: HTMLButtonElement, focus = false): void => {
    activeTab = tab;
    for (const candidate of tabs) {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", String(selected));
      candidate.tabIndex = selected ? 0 : -1;
      panels.get(candidate)!.hidden = !selected;
    }
    tab.removeAttribute("data-alert");
    if (focus) {
      tab.focus();
    }
  };

  const visibleTabs = (): HTMLButtonElement[] => tabs.filter((tab) => !tab.hidden);

  const savedTab = tabs.find(({ id }) => id === readActiveTab());
  activate(savedTab && !savedTab.hidden ? savedTab : tabs[0]);

  const onClick = (event: Event): void => {
    const target = event.target;
    const tab =
      target instanceof Element
        ? target.closest<HTMLButtonElement>("[role=tab]")
        : null;
    if (tab && tabs.includes(tab)) {
      activate(tab);
      writeActiveTab(tab.id);
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const visible = visibleTabs();
    const index = visible.indexOf(activeTab);
    const next =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? visible[(index + 1) % visible.length]
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? visible[(index - 1 + visible.length) % visible.length]
          : event.key === "Home"
            ? visible[0]
            : event.key === "End"
              ? visible[visible.length - 1]
              : null;
    if (next) {
      event.preventDefault();
      activate(next, true);
      writeActiveTab(next.id);
    }
  };

  const render = (snapshot: ProgressionSnapshot): void => {
    // Un onglet masqué (prestige après remise à zéro) ne peut rester ouvert.
    if (activeTab.hidden) {
      activate(visibleTabs()[0] ?? tabs[0]);
    }
    for (const [id, alert] of Object.entries(getTabAlerts(snapshot))) {
      const tab = tabs.find((candidate) => candidate.id === id);
      if (tab) {
        tab.toggleAttribute("data-alert", alert && tab !== activeTab);
      }
    }
  };

  const companionsTab = tabs.find(({ id }) => id === "tab-companions");
  const unsubscribeSummons = progression.onSummon(() => {
    if (companionsTab && companionsTab !== activeTab) {
      companionsTab.setAttribute("data-alert", "");
    }
  });
  const unsubscribe = progression.subscribe(render);
  tabList.addEventListener("click", onClick);
  tabList.addEventListener("keydown", onKeyDown);

  return () => {
    unsubscribe();
    unsubscribeSummons();
    tabList.removeEventListener("click", onClick);
    tabList.removeEventListener("keydown", onKeyDown);
  };
}
