// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { GameProgression, SUMMON_COST } from "../src/game/progression";
import { bindAutosave, loadGame, SAVE_KEY } from "../src/game/save";
import { TutorialGuide } from "../src/game/tutorial";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("local save", () => {
  it("writes progress after a short delay and restores it", () => {
    vi.useFakeTimers();
    const storage = createStorage();
    const progression = new GameProgression(() => 0);
    const tutorial = new TutorialGuide();
    const autosave = bindAutosave(storage, progression, tutorial);

    expect(storage.getItem(SAVE_KEY)).toBeNull();
    for (let i = 0; i < SUMMON_COST; i += 1) {
      progression.collectResource();
    }
    progression.summon();
    tutorial.dismiss();
    expect(storage.getItem(SAVE_KEY)).toBeNull();

    vi.advanceTimersByTime(1000);
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    autosave.dispose();

    const restored = new GameProgression();
    const restoredTutorial = new TutorialGuide();
    expect(loadGame(storage, restored, restoredTutorial)).toBe(true);
    expect(restored.getSnapshot().companions.mosquito).toBe(1);
    expect(restored.getSnapshot().summonCost).toBe(SUMMON_COST + 1);
    expect(restoredTutorial.getStep()).toBe("dismissed");
  });

  it("saves immediately when the page is hidden", () => {
    const storage = createStorage();
    const progression = new GameProgression();
    const autosave = bindAutosave(storage, progression, new TutorialGuide());
    progression.collectResource();

    window.dispatchEvent(new Event("pagehide"));
    expect(
      JSON.parse(storage.getItem(SAVE_KEY) ?? "{}").progression.resources,
    ).toBe(1);
    autosave.dispose();
  });

  it("ignores missing, corrupted or outdated saves", () => {
    const storage = createStorage();
    const progression = new GameProgression();
    const tutorial = new TutorialGuide();

    expect(loadGame(storage, progression, tutorial)).toBe(false);
    storage.setItem(SAVE_KEY, "{pas du json");
    expect(loadGame(storage, progression, tutorial)).toBe(false);
    storage.setItem(SAVE_KEY, JSON.stringify({ version: 0, progression: {} }));
    expect(loadGame(storage, progression, tutorial)).toBe(false);
    expect(loadGame(null, progression, tutorial)).toBe(false);
  });

  it("erases the save and stops writing after a reset", () => {
    const storage = createStorage();
    const progression = new GameProgression();
    const autosave = bindAutosave(storage, progression, new TutorialGuide());
    progression.collectResource();
    autosave.flush();
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();

    autosave.reset();
    progression.collectResource();
    window.dispatchEvent(new Event("pagehide"));
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });
});
