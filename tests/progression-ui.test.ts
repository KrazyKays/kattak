// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COMPANIONS,
  GameProgression,
  MAX_COMPANION_LEVEL,
  SUMMON_COST,
  SUMMON_COST_INCREMENT,
} from "../src/game/progression";
import { TutorialGuide } from "../src/game/tutorial";
import { bindProgressionUi } from "../src/ui/ProgressionUi";

let unsubscribe: (() => void) | undefined;

function mountUi(progression: GameProgression): () => void {
  document.body.innerHTML = `
    <output id="resource-count"></output>
    <span id="resource-unit"></span>
    <button id="summon-button" type="button"></button>
    <button id="summon-all-button" type="button"></button>
    <p id="summon-preview"></p>
    <p id="summon-result"></p>
    <details class="summon-chance-help">
      <summary>?</summary>
      <ul id="companion-chances"></ul>
    </details>
    <ul id="companion-list"></ul>
    <ol id="action-history" role="log"></ol>
  `;

  unsubscribe = bindProgressionUi(progression, new TutorialGuide());
  return unsubscribe;
}

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe("progression UI", () => {
  it("shows the renamed companions and their bonuses", () => {
    const progression = new GameProgression(() => 0.99);
    mountUi(progression);

    expect(document.getElementById("companion-list")?.textContent).toContain(
      "Crabe trou noir",
    );
    expect(document.getElementById("companion-list")?.textContent).toContain(
      "3 jetons aspirants actifs",
    );
    expect(document.getElementById("companion-list")?.textContent).toContain(
      "Écureuil prévoyant",
    );
    expect(document.getElementById("companion-list")?.textContent).toContain(
      "+6 pépites de base au maximum à l’écran",
    );
    expect(
      [...document.querySelectorAll("#companion-list summary strong")].map(
        (name) => name.textContent,
      ),
    ).toEqual([
      "Moustique magnétique",
      "Lapin rapide",
      "Écureuil prévoyant",
      "Singe productif",
      "Crabe trou noir",
      "Pie glaneuse",
    ]);
    expect(document.getElementById("companion-list")?.textContent).toContain(
      "Commun",
    );
    expect(
      document.querySelector(
        "#companion-list details:first-child summary",
      )?.textContent,
    ).not.toContain("%");
    expect(document.querySelector(".summon-chance-help")?.hasAttribute("open")).toBe(false);
    expect(document.getElementById("companion-chances")?.textContent).toContain(
      "Moustique magnétique · 25 %",
    );
    expect(document.getElementById("companion-chances")?.textContent).toContain(
      "Singe productif · 17,5 %",
    );

    for (let i = 0; i < SUMMON_COST; i += 1) {
      progression.collectResource();
    }
    progression.summon();

    expect(
      document.querySelector(
        "#companion-list details:nth-child(6) summary output",
      )?.textContent,
    ).toBe("Niv. 1");
  });

  it("shows pépites as the loot unit, including the singular form", () => {
    const progression = new GameProgression();
    mountUi(progression);
    const unit = document.getElementById("resource-unit");

    expect(unit?.textContent).toBe("pépites");
    progression.collectResource();
    expect(unit?.textContent).toBe("pépite");
    progression.collectResource();
    expect(unit?.textContent).toBe("pépites");
  });

  it("keeps the history log unchanged on collection and updates it on summon", () => {
    const progression = new GameProgression(() => 0);
    mountUi(progression);
    const history = document.getElementById("action-history");
    const historyUpdates = vi.spyOn(history as HTMLOListElement, "replaceChildren");

    for (let i = 0; i < SUMMON_COST; i += 1) {
      progression.collectResource();
    }

    expect(historyUpdates).not.toHaveBeenCalled();
    expect(history?.childElementCount).toBe(0);

    (document.getElementById("summon-button") as HTMLButtonElement).click();

    expect(historyUpdates).toHaveBeenCalledOnce();
    expect(history?.textContent).toContain("Moustique magnétique invoqué");
  });

  it("shows the batch cost in its label and highlights it only for multiple summons", () => {
    const progression = new GameProgression(() => 0);
    mountUi(progression);
    const summonAllButton = document.getElementById(
      "summon-all-button",
    ) as HTMLButtonElement;

    for (let i = 0; i < 12; i += 1) {
      progression.collectResource();
    }

    expect(summonAllButton.textContent).toContain("2 fois");
    expect(summonAllButton.textContent).toContain("11 pépites");
    expect(summonAllButton.classList.contains("is-multi-summon")).toBe(true);

    (document.getElementById("summon-button") as HTMLButtonElement).click();

    expect(summonAllButton.textContent).toContain("1 fois");
    expect(summonAllButton.classList.contains("is-multi-summon")).toBe(false);
  });

  it("enables both summon buttons when enough resources are collected", () => {
    const progression = new GameProgression(() => 0);
    mountUi(progression);
    const summonButton = document.getElementById(
      "summon-button",
    ) as HTMLButtonElement;
    const summonAllButton = document.getElementById(
      "summon-all-button",
    ) as HTMLButtonElement;

    summonButton.click();
    expect(summonButton.disabled).toBe(true);
    expect(summonAllButton.disabled).toBe(true);

    for (let i = 0; i < SUMMON_COST; i += 1) {
      progression.collectResource();
    }

    expect(summonButton.disabled).toBe(false);
    expect(summonAllButton.disabled).toBe(false);
  });

  it("shows the max-level label on both buttons when all companions are maxed", () => {
    const progression = new GameProgression(() => 0);
    mountUi(progression);
    const summonButton = document.getElementById(
      "summon-button",
    ) as HTMLButtonElement;
    const summonAllButton = document.getElementById(
      "summon-all-button",
    ) as HTMLButtonElement;
    const totalSummons = COMPANIONS.length * MAX_COMPANION_LEVEL;
    const totalCost =
      (totalSummons *
        (2 * SUMMON_COST + (totalSummons - 1) * SUMMON_COST_INCREMENT)) /
      2;

    for (let i = 0; i < totalCost; i += 1) {
      progression.collectResource();
    }
    summonAllButton.click();

    expect(summonButton.textContent).toBe(summonAllButton.textContent);
    expect(summonButton.textContent).toBe(
      "Tous les compagnons sont au niveau max",
    );
    expect(summonButton.disabled).toBe(true);
    expect(summonAllButton.disabled).toBe(true);
  });
});
