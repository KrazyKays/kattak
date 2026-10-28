import { describe, expect, it } from "vitest";
import {
  AUTO_SUMMON_COST,
  COMPANIONS,
  CROWN_RESOURCE_STEP,
  GameProgression,
  MAX_COMPANION_LEVEL,
  PRESTIGE_MIN_CROWNS,
  STARTING_FRAGMENTS_PER_LEVEL,
  STARTING_RESOURCES_PER_LEVEL,
  SUMMON_COST,
  WALL_REMOVAL_COST,
  getCrownsForResources,
  getResourcesForCrowns,
  type SummonEvent,
} from "../src/game/progression";

function collect(progression: GameProgression, amount: number): void {
  for (let i = 0; i < amount; i += 1) {
    progression.collectResource();
  }
}

describe("prestige", () => {
  it("converts the resources collected during a run with diminishing returns", () => {
    expect(getCrownsForResources(CROWN_RESOURCE_STEP - 1)).toBe(0);
    expect(getCrownsForResources(CROWN_RESOURCE_STEP)).toBe(1);
    expect(getCrownsForResources(CROWN_RESOURCE_STEP * 4)).toBe(2);
    expect(getCrownsForResources(CROWN_RESOURCE_STEP * 9)).toBe(3);

    const progression = new GameProgression(() => 0);
    collect(progression, CROWN_RESOURCE_STEP * 4 + 1);
    expect(progression.getSnapshot()).toMatchObject({
      pendingCrowns: 2,
      currentCrownAt: CROWN_RESOURCE_STEP * 4,
      nextCrownAt: CROWN_RESOURCE_STEP * 9,
      canPrestige: false,
    });
  });

  it("counts collected resources even after they are spent", () => {
    const progression = new GameProgression(() => 0);
    collect(progression, SUMMON_COST);
    progression.summon();

    expect(progression.getSnapshot()).toMatchObject({
      resources: 0,
      runResourcesCollected: SUMMON_COST,
    });
  });

  it("refuses to prestige before the minimum crowns are pending", () => {
    const progression = new GameProgression(() => 0);
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS) - 1);

    expect(progression.prestige()).toEqual({ kind: "insufficient-progress" });
    expect(progression.getSnapshot().crowns).toBe(0);
  });

  it("resets the run but keeps crowns and history", () => {
    const progression = new GameProgression(() => 0);
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));
    progression.summonAll();
    progression.collectFragment(AUTO_SUMMON_COST + WALL_REMOVAL_COST);
    progression.unlockAutoSummon();
    progression.removeRandomWall();

    expect(progression.prestige()).toEqual({
      kind: "success",
      crowns: PRESTIGE_MIN_CROWNS,
    });
    const snapshot = progression.getSnapshot();
    expect(snapshot).toMatchObject({
      crowns: PRESTIGE_MIN_CROWNS,
      prestigeCount: 1,
      resources: 0,
      fragments: 0,
      wallsRemaining: 4,
      walls: [0, 1, 2, 3],
      autoSummonUnlocked: false,
      autoSummonEnabled: false,
      summonCost: SUMMON_COST,
      runResourcesCollected: 0,
      pendingCrowns: 0,
    });
    expect(Object.values(snapshot.companions).every((level) => level === 0)).toBe(
      true,
    );
    expect(snapshot.recentActions[0]).toContain("Prestige n° 1");
  });

  it("buys upgrades with crowns until their maximum level", () => {
    const progression = new GameProgression(() => 0);
    collect(progression, getResourcesForCrowns(4));
    progression.prestige();

    expect(progression.buyPrestigeUpgrade("memory")).toBe("bought");
    expect(progression.getSnapshot().autoSummonUnlocked).toBe(true);
    expect(progression.buyPrestigeUpgrade("memory")).toBe("maxed");
    expect(progression.buyPrestigeUpgrade("bargain")).toBe("bought");
    expect(progression.getSnapshot()).toMatchObject({
      crowns: 0,
      summonCost: SUMMON_COST - 1,
    });
    expect(progression.buyPrestigeUpgrade("golden")).toBe("insufficient-crowns");
    expect(
      progression.getSnapshot().prestigeUpgrades.find(({ id }) => id === "bargain"),
    ).toEqual({ id: "bargain", level: 1, maxLevel: 3, nextCost: 3 });
  });

  it("grants starting resources and fragments immediately and on every run", () => {
    const progression = new GameProgression(() => 0);
    collect(progression, getResourcesForCrowns(5));
    progression.prestige();

    progression.buyPrestigeUpgrade("heritage");
    progression.buyPrestigeUpgrade("nest");
    expect(progression.getSnapshot()).toMatchObject({
      resources: STARTING_RESOURCES_PER_LEVEL,
      fragments: STARTING_FRAGMENTS_PER_LEVEL,
    });

    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));
    progression.prestige();
    expect(progression.getSnapshot()).toMatchObject({
      resources: STARTING_RESOURCES_PER_LEVEL,
      fragments: STARTING_FRAGMENTS_PER_LEVEL,
    });
  });

  it("doubles collected resources with golden nuggets", () => {
    const rolls = [0.99, 0.1];
    const progression = new GameProgression(() => rolls.shift() ?? 0);
    progression.restoreState({ prestigeUpgrades: { golden: 1 } });

    expect(progression.collectResource()).toBe(1);
    expect(progression.collectResource()).toBe(2);
    expect(progression.getSnapshot()).toMatchObject({
      resources: 3,
      runResourcesCollected: 3,
    });
  });

  it("raises the companion level cap with ascension", () => {
    const progression = new GameProgression(() => 0);
    progression.restoreState({
      prestigeUpgrades: { ascension: 1 },
      companions: { mosquito: MAX_COMPANION_LEVEL },
    });

    expect(progression.getSnapshot().maxCompanionLevel).toBe(
      MAX_COMPANION_LEVEL + 1,
    );
    expect(progression.getSnapshot().companionChances.mosquito).toBeGreaterThan(0);
    collect(progression, SUMMON_COST);
    expect(progression.summon()).toMatchObject({
      kind: "success",
      companion: { id: "mosquito" },
      level: MAX_COMPANION_LEVEL + 1,
    });
  });

  it("emits summon events for manual and automatic summons", () => {
    const progression = new GameProgression(() => 0);
    const events: SummonEvent[] = [];
    progression.onSummon((event) => events.push(event));

    collect(progression, SUMMON_COST);
    progression.summon();
    progression.collectFragment(AUTO_SUMMON_COST);
    progression.unlockAutoSummon();
    progression.setAutoSummon(true);
    collect(progression, SUMMON_COST + 1);

    expect(
      events.map(({ automatic, summons }) => [automatic, summons.length]),
    ).toEqual([
      [false, 1],
      [true, 1],
    ]);
  });
});

describe("progression state", () => {
  it("round-trips through export and restore", () => {
    const original = new GameProgression(() => 0);
    collect(original, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));
    original.prestige();
    original.buyPrestigeUpgrade("golden");
    collect(original, 40);
    original.summonAll();
    original.collectFragment(WALL_REMOVAL_COST);
    original.removeRandomWall();

    const restored = new GameProgression(() => 0);
    expect(
      restored.restoreState(JSON.parse(JSON.stringify(original.exportState()))),
    ).toBe(true);
    const { lastRemovedWallIndex: _ignored, ...expected } =
      original.getSnapshot();
    expect(restored.getSnapshot()).toMatchObject(expected);
  });

  it("sanitizes invalid saved values", () => {
    const progression = new GameProgression();
    expect(progression.restoreState("corrompu")).toBe(false);
    expect(
      progression.restoreState({
        resources: -10,
        fragments: "beaucoup",
        walls: [3, 3, 9, -1, 1.5, 0],
        companions: { mosquito: 99, unknown: 2 },
        prestigeUpgrades: { memory: 5 },
        autoSummonEnabled: true,
        recentActions: ["ok", 12],
      }),
    ).toBe(true);

    const snapshot = progression.getSnapshot();
    expect(snapshot).toMatchObject({
      resources: 0,
      fragments: 0,
      walls: [3, 0],
      autoSummonUnlocked: true,
      autoSummonEnabled: true,
      recentActions: ["ok"],
    });
    expect(snapshot.companions.mosquito).toBe(MAX_COMPANION_LEVEL);
    expect(Object.keys(snapshot.companions)).toHaveLength(COMPANIONS.length);
  });
});
