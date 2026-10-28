// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPANIONS,
  GameProgression,
  PRESTIGE_MIN_CROWNS,
  PRESTIGE_UPGRADES,
  SUMMON_COST,
  getResourcesForCrowns,
} from "../src/game/progression";
import { bindPrestigeUi } from "../src/ui/PrestigeUi";
import {
  SUMMON_POPUP_DURATION,
  bindSummonPopupUi,
  pickFeaturedSummon,
} from "../src/ui/SummonPopupUi";

const cleanups: (() => void)[] = [];

function collect(progression: GameProgression, amount: number): void {
  for (let i = 0; i < amount; i += 1) {
    progression.collectResource();
  }
}

function mountPrestigeUi(progression: GameProgression): void {
  document.body.innerHTML = `
    <aside id="prestige-panel" hidden>
      <output id="crown-count"></output>
      <span id="crown-unit"></span>
      <div><span id="prestige-meter-fill"></span></div>
      <p id="prestige-progress"></p>
      <button id="prestige-button" type="button"></button>
      <ul id="prestige-upgrades"></ul>
    </aside>
  `;
  cleanups.push(bindPrestigeUi(progression));
}

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("prestige UI", () => {
  it("stays hidden until the first crown is in sight", () => {
    const progression = new GameProgression(() => 0);
    mountPrestigeUi(progression);
    const panel = document.getElementById("prestige-panel") as HTMLElement;

    expect(panel.hidden).toBe(true);
    collect(progression, getResourcesForCrowns(1));
    expect(panel.hidden).toBe(false);
    expect(document.getElementById("prestige-progress")?.textContent).toContain(
      "1 couronne en attente",
    );
    expect(
      (document.getElementById("prestige-button") as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("requires a confirmation click before resetting the run", () => {
    const progression = new GameProgression(() => 0);
    mountPrestigeUi(progression);
    const button = document.getElementById("prestige-button") as HTMLButtonElement;
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));

    expect(button.disabled).toBe(false);
    button.click();
    expect(button.textContent).toContain("Confirmer");
    expect(progression.getSnapshot().prestigeCount).toBe(0);

    button.click();
    expect(progression.getSnapshot()).toMatchObject({
      prestigeCount: 1,
      crowns: PRESTIGE_MIN_CROWNS,
    });
    expect(document.getElementById("crown-count")?.textContent).toBe(
      String(PRESTIGE_MIN_CROWNS),
    );
  });

  it("cancels the confirmation after a few seconds", () => {
    vi.useFakeTimers();
    const progression = new GameProgression(() => 0);
    mountPrestigeUi(progression);
    const button = document.getElementById("prestige-button") as HTMLButtonElement;
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));

    button.click();
    vi.advanceTimersByTime(5000);
    expect(button.textContent).not.toContain("Confirmer");
    button.click();
    expect(progression.getSnapshot().prestigeCount).toBe(0);
  });

  it("lists every upgrade and buys one on click", () => {
    const progression = new GameProgression(() => 0);
    mountPrestigeUi(progression);
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>("#prestige-upgrades button"),
    ];
    expect(buttons).toHaveLength(PRESTIGE_UPGRADES.length);
    expect(buttons.every((button) => button.disabled)).toBe(true);

    progression.restoreState({ crowns: 1 });
    const golden = buttons[0];
    expect(golden.disabled).toBe(false);
    golden.click();

    expect(progression.getSnapshot().crowns).toBe(0);
    expect(golden.textContent).toContain("1/5");
    expect(golden.textContent).toContain(
      "Actuel : 20 % de chances de pépite double",
    );
  });
});

describe("summon popup", () => {
  it("features the rarest companion of a batch", () => {
    const [mosquito, , , , crab] = COMPANIONS;
    expect(
      pickFeaturedSummon([
        { companion: mosquito, level: 3 },
        { companion: crab, level: 1 },
        { companion: mosquito, level: 2 },
      ]).companion.id,
    ).toBe("crab");
  });

  it("shows the summoned companion for a few seconds", () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<div id="summon-popup" hidden></div>`;
    const progression = new GameProgression(() => 0);
    cleanups.push(bindSummonPopupUi(progression));
    const popup = document.getElementById("summon-popup") as HTMLElement;

    collect(progression, SUMMON_COST);
    progression.summon();

    expect(popup.hidden).toBe(false);
    expect(popup.textContent).toContain("Moustique magnétique");
    expect(popup.textContent).toContain("Nouveau compagnon");
    expect(popup.classList.contains("rarity-common")).toBe(true);

    vi.advanceTimersByTime(SUMMON_POPUP_DURATION);
    expect(popup.hidden).toBe(true);
  });
});
