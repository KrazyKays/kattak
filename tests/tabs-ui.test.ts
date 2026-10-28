// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { GameProgression, WALL_REMOVAL_COST } from "../src/game/progression";
import { bindTabsUi } from "../src/ui/TabsUi";

let unsubscribe: (() => void) | undefined;

function mountTabs(progression: GameProgression): void {
  document.body.innerHTML = `
    <div role="tablist">
      <button id="tab-companions" role="tab" aria-controls="panel-companions"></button>
      <button id="tab-workshop" role="tab" aria-controls="panel-workshop"></button>
      <button id="prestige-tab" role="tab" aria-controls="prestige-panel" hidden></button>
    </div>
    <section id="panel-companions"></section>
    <section id="panel-workshop"></section>
    <section id="prestige-panel"></section>
  `;
  unsubscribe = bindTabsUi(progression);
}

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
  document.body.replaceChildren();
  localStorage.clear();
});

describe("tabs UI", () => {
  it("shows only the selected panel and switches on click", () => {
    mountTabs(new GameProgression());

    expect(byId("tab-companions").getAttribute("aria-selected")).toBe("true");
    expect(byId("panel-workshop").hidden).toBe(true);

    byId("tab-workshop").click();
    expect(byId("panel-workshop").hidden).toBe(false);
    expect(byId("panel-companions").hidden).toBe(true);
    expect(localStorage.getItem("kattak:tab")).toBe("tab-workshop");
  });

  it("skips hidden tabs with the keyboard", () => {
    mountTabs(new GameProgression());
    byId("tab-workshop").click();

    // Le prestige encore masqué est sauté : retour au premier onglet.
    byId("tab-workshop").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(byId("tab-companions").getAttribute("aria-selected")).toBe("true");
  });

  it("flags the workshop tab when a fragment action becomes affordable", () => {
    const progression = new GameProgression();
    mountTabs(progression);

    expect(byId("tab-workshop").hasAttribute("data-alert")).toBe(false);
    progression.collectFragment(WALL_REMOVAL_COST);
    expect(byId("tab-workshop").hasAttribute("data-alert")).toBe(true);

    byId("tab-workshop").click();
    expect(byId("tab-workshop").hasAttribute("data-alert")).toBe(false);
  });
});
