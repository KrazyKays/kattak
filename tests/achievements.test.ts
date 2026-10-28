// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACHIEVEMENTS,
  AchievementTracker,
  SPEED_PRESTIGE_LIMIT,
  formatPlayTime,
} from "../src/game/achievements";
import {
  GameProgression,
  PRESTIGE_MIN_CROWNS,
  SUMMON_COST,
  getResourcesForCrowns,
} from "../src/game/progression";
import { bindAutosave, loadGame, SAVE_KEY } from "../src/game/save";
import { TutorialGuide } from "../src/game/tutorial";
import {
  ACHIEVEMENT_TOAST_DURATION,
  TIMER_VISIBLE_KEY,
  bindAchievementsUi,
} from "../src/ui/AchievementsUi";

function collect(progression: GameProgression, amount: number): void {
  for (let i = 0; i < amount; i += 1) {
    progression.collectResource();
  }
}

function createClock(): { now: () => number; advance: (ms: number) => void } {
  let time = 0;
  return { now: () => time, advance: (ms) => void (time += ms) };
}

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

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
  document.body.replaceChildren();
  vi.useRealTimers();
  localStorage.clear();
});

describe("formatPlayTime", () => {
  it("shows tenths, and hours only when needed", () => {
    expect(formatPlayTime(0)).toBe("0:00.0");
    expect(formatPlayTime(65_432)).toBe("1:05.4");
    expect(formatPlayTime(3_725_000)).toBe("1:02:05.0");
  });
});

describe("lifetime stats", () => {
  it("survive a prestige", () => {
    const progression = new GameProgression(() => 0);
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));
    progression.summon();
    progression.collectFragment(3);
    progression.prestige();

    const { stats } = progression.getSnapshot();
    expect(stats.resourcesCollected).toBe(
      getResourcesForCrowns(PRESTIGE_MIN_CROWNS),
    );
    expect(stats.summons).toBe(1);
    expect(stats.fragmentsCollected).toBe(3);
    expect(stats.crownsEarned).toBe(PRESTIGE_MIN_CROWNS);
  });

  it("counts golden and absorbed nuggets", () => {
    const progression = new GameProgression(() => 0);
    progression.restoreState({ prestigeUpgrades: { golden: 1 } });
    expect(progression.collectResource(true)).toBe(2);
    const { stats } = progression.getSnapshot();
    expect(stats.goldenResources).toBe(1);
    expect(stats.absorbedResources).toBe(2);
  });
});

describe("achievement tracker", () => {
  it("only runs the clock once started and while the page is visible", () => {
    const clock = createClock();
    const tracker = new AchievementTracker(clock.now);
    clock.advance(5000);
    expect(tracker.getPlayTime()).toBe(0);

    tracker.start();
    clock.advance(2000);
    tracker.setHidden(true);
    clock.advance(10_000);
    tracker.setHidden(false);
    clock.advance(1000);
    expect(tracker.getPlayTime()).toBe(3000);
  });

  it("unlocks achievements at the current play time and announces them", () => {
    const clock = createClock();
    const tracker = new AchievementTracker(clock.now);
    const progression = new GameProgression(() => 0);
    const announced: string[] = [];
    tracker.onUnlock(({ achievements }) =>
      announced.push(...achievements.map(({ id }) => id)),
    );
    tracker.observe(progression);
    tracker.start();

    clock.advance(1500);
    collect(progression, SUMMON_COST);
    progression.summon();

    const snapshot = tracker.getSnapshot();
    expect(announced).toEqual(["first-nugget", "first-summon"]);
    expect(snapshot.unlocked["first-nugget"]).toBe(1500);
    expect(snapshot.progress["full-roster"]).toBe(1);
  });

  it("unlocks silently what a loaded game already earned", () => {
    const progression = new GameProgression(() => 0);
    collect(progression, 100);
    const tracker = new AchievementTracker(createClock().now);
    const listener = vi.fn();
    tracker.onUnlock(listener);
    tracker.observe(progression);

    expect(tracker.getSnapshot().unlocked.hoard).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it("rewards prestige challenges from the finished run", () => {
    const clock = createClock();
    const tracker = new AchievementTracker(clock.now);
    const progression = new GameProgression(() => 0);
    tracker.observe(progression);
    tracker.start();

    clock.advance(SPEED_PRESTIGE_LIMIT - 1000);
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));
    progression.prestige();

    const { unlocked } = tracker.getSnapshot();
    expect(unlocked["speed-prestige"]).toBeDefined();
    expect(unlocked.ascetic).toBeDefined();
    expect(unlocked.fortress).toBeDefined();
  });

  it("measures the speed challenge from the start of the run", () => {
    const clock = createClock();
    const tracker = new AchievementTracker(clock.now);
    const progression = new GameProgression(() => 0);
    tracker.observe(progression);
    tracker.start();

    clock.advance(SPEED_PRESTIGE_LIMIT + 1000);
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));
    progression.summon();
    progression.prestige();

    const { unlocked } = tracker.getSnapshot();
    expect(unlocked["speed-prestige"]).toBeUndefined();
    expect(unlocked.ascetic).toBeUndefined();
  });

  it("skips the speed challenge for a run started before tracking", () => {
    const tracker = new AchievementTracker(createClock().now);
    const progression = new GameProgression(() => 0);
    tracker.forgetRunStart();
    tracker.observe(progression);
    collect(progression, getResourcesForCrowns(PRESTIGE_MIN_CROWNS));
    progression.prestige();

    expect(tracker.getSnapshot().unlocked["speed-prestige"]).toBeUndefined();
  });

  it("stops the clock at 100 %", () => {
    const clock = createClock();
    const tracker = new AchievementTracker(clock.now);
    tracker.restoreState({
      playTime: 1000,
      started: true,
      unlocked: Object.fromEntries(
        ACHIEVEMENTS.slice(1).map(({ id }) => [id, 500]),
      ),
    });
    const progression = new GameProgression(() => 0);
    const completed = vi.fn();
    tracker.onUnlock(({ completed: done }) => completed(done));
    tracker.observe(progression);

    clock.advance(4000);
    progression.collectResource();
    expect(completed).toHaveBeenCalledWith(true);
    expect(tracker.getSnapshot().completedAt).toBe(5000);

    clock.advance(60_000);
    expect(tracker.getPlayTime()).toBe(5000);
    expect(tracker.isRunning()).toBe(false);
  });

  it("is saved and restored with the game", () => {
    const clock = createClock();
    const storage = createStorage();
    const progression = new GameProgression(() => 0);
    const tracker = new AchievementTracker(clock.now);
    tracker.observe(progression);
    tracker.start();
    const autosave = bindAutosave(
      storage,
      progression,
      new TutorialGuide(),
      tracker,
    );
    clock.advance(7000);
    progression.collectResource();
    autosave.flush();
    autosave.dispose();

    const restored = new AchievementTracker(clock.now);
    expect(
      loadGame(storage, new GameProgression(), new TutorialGuide(), restored),
    ).toBe(true);
    expect(restored.getPlayTime()).toBe(7000);
    expect(restored.getSnapshot().unlocked["first-nugget"]).toBe(7000);
    expect(
      JSON.parse(storage.getItem(SAVE_KEY) ?? "{}").achievements.started,
    ).toBe(true);
  });
});

describe("achievements UI", () => {
  function mount(tracker: AchievementTracker): void {
    document.body.innerHTML = `
      <p id="play-time-chip" hidden><output id="play-time"></output></p>
      <input id="timer-toggle" type="checkbox" />
      <button id="tab-achievements" aria-selected="false"></button>
      <output id="achievement-count"></output>
      <span id="achievement-percent"></span>
      <span id="achievement-meter-fill"></span>
      <p id="achievement-run"></p>
      <div id="achievement-list"></div>
      <div id="achievement-toast" hidden></div>
    `;
    cleanups.push(bindAchievementsUi(tracker));
  }

  it("hides the clock until speedrun mode is turned on", () => {
    const clock = createClock();
    const tracker = new AchievementTracker(clock.now);
    const progression = new GameProgression(() => 0);
    tracker.observe(progression);
    mount(tracker);
    tracker.start();
    clock.advance(2500);
    progression.collectResource();

    const chip = document.getElementById("play-time-chip") as HTMLElement;
    const status = document.querySelector(
      '[data-achievement="first-nugget"] .achievement-status',
    );
    expect(chip.hidden).toBe(true);
    expect(status?.textContent).toBe("");
    expect(document.getElementById("achievement-toast")?.textContent).not.toContain(
      "0:02.5",
    );

    const toggle = document.getElementById("timer-toggle") as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change"));
    expect(chip.hidden).toBe(false);
    expect(document.getElementById("play-time")?.textContent).toBe("0:02.5");
    expect(status?.textContent).toBe("0:02.5");
    expect(localStorage.getItem(TIMER_VISIBLE_KEY)).toBe("on");
  });

  it("lists every achievement and announces unlocks", () => {
    vi.useFakeTimers();
    localStorage.setItem(TIMER_VISIBLE_KEY, "on");
    const clock = createClock();
    const tracker = new AchievementTracker(clock.now);
    const progression = new GameProgression(() => 0);
    tracker.observe(progression);
    mount(tracker);

    expect(document.querySelectorAll("[data-achievement]")).toHaveLength(
      ACHIEVEMENTS.length,
    );
    tracker.start();
    clock.advance(2500);
    progression.collectResource();

    const toast = document.getElementById("achievement-toast") as HTMLElement;
    expect(toast.hidden).toBe(false);
    expect(toast.textContent).toContain("Première pépite");
    expect(toast.textContent).toContain("0:02.5");
    expect(document.getElementById("achievement-count")?.textContent).toBe(
      `1/${ACHIEVEMENTS.length}`,
    );
    expect(
      document.getElementById("tab-achievements")?.hasAttribute("data-alert"),
    ).toBe(true);
    expect(
      document
        .querySelector('[data-achievement="first-nugget"]')
        ?.classList.contains("is-unlocked"),
    ).toBe(true);

    vi.advanceTimersByTime(ACHIEVEMENT_TOAST_DURATION);
    expect(toast.hidden).toBe(true);
  });
});
