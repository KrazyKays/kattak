import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  formatPlayTime,
  type AchievementSnapshot,
  type AchievementTracker,
} from "../game/achievements";

export const ACHIEVEMENT_TOAST_DURATION = 3200;
const CLOCK_REFRESH = 100;

interface ToastEntry {
  label: string;
  name: string;
  detail: string;
  complete: boolean;
}

export function bindAchievementsUi(achievements: AchievementTracker): () => void {
  const clock = document.getElementById("play-time");
  const clockChip = document.getElementById("play-time-chip");
  const tab = document.getElementById("tab-achievements");
  const count = document.getElementById("achievement-count");
  const percent = document.getElementById("achievement-percent");
  const meter = document.getElementById("achievement-meter-fill");
  const runNote = document.getElementById("achievement-run");
  const list = document.getElementById("achievement-list");
  const toast = document.getElementById("achievement-toast");

  if (
    !(clock instanceof HTMLOutputElement) ||
    !(clockChip instanceof HTMLElement) ||
    !(tab instanceof HTMLElement) ||
    !(count instanceof HTMLOutputElement) ||
    !(percent instanceof HTMLElement) ||
    !(meter instanceof HTMLElement) ||
    !(runNote instanceof HTMLElement) ||
    !(list instanceof HTMLElement) ||
    !(toast instanceof HTMLElement)
  ) {
    throw new Error("L’interface des succès est incomplète.");
  }

  const entries = new Map<
    string,
    { item: HTMLLIElement; status: HTMLElement; bar: HTMLElement | null }
  >();

  for (const category of ACHIEVEMENT_CATEGORIES) {
    const heading = document.createElement("h3");
    heading.className = "achievement-category";
    heading.textContent = category.name;
    const group = document.createElement("ul");
    group.className = "achievement-group";
    group.setAttribute("aria-label", category.name);

    for (const achievement of ACHIEVEMENTS) {
      if (achievement.category !== category.id) {
        continue;
      }
      const item = document.createElement("li");
      item.className = "achievement";
      item.dataset.achievement = achievement.id;

      const mark = document.createElement("span");
      mark.className = "achievement-mark";
      mark.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      text.className = "achievement-text";
      const name = document.createElement("strong");
      name.textContent = achievement.name;
      const description = document.createElement("span");
      description.className = "achievement-description";
      description.textContent = achievement.description;
      text.append(name, description);

      const status = document.createElement("span");
      status.className = "achievement-status";
      item.append(mark, text, status);

      let bar: HTMLElement | null = null;
      if (achievement.target > 1) {
        const track = document.createElement("span");
        track.className = "achievement-bar";
        track.setAttribute("aria-hidden", "true");
        bar = document.createElement("span");
        track.append(bar);
        item.append(track);
      }

      group.append(item);
      entries.set(achievement.id, { item, status, bar });
    }
    list.append(heading, group);
  }

  let snapshot: AchievementSnapshot = achievements.getSnapshot();

  const renderClock = (): void => {
    const time = formatPlayTime(snapshot.completedAt ?? achievements.getPlayTime());
    if (clock.value !== time) {
      clock.value = time;
    }
  };

  const render = (next: AchievementSnapshot): void => {
    snapshot = next;
    const ratio = snapshot.total > 0 ? snapshot.unlockedCount / snapshot.total : 0;
    count.value = `${snapshot.unlockedCount}/${snapshot.total}`;
    percent.textContent = `${Math.floor(ratio * 100)} %`;
    meter.style.width = `${Math.round(ratio * 100)}%`;

    const complete = snapshot.completedAt !== null;
    clockChip.classList.toggle("is-complete", complete);
    clockChip.title = complete ? "Temps final · 100 %" : "Temps de jeu";
    runNote.textContent = complete
      ? `100 % en ${formatPlayTime(snapshot.completedAt ?? 0)} · chrono arrêté. Bravo !`
      : "Le chrono s’arrête à 100 %. Pour une nouvelle tentative : Journal › Recommencer de zéro.";
    runNote.classList.toggle("is-complete", complete);
    renderClock();

    for (const achievement of ACHIEVEMENTS) {
      const entry = entries.get(achievement.id);
      if (!entry) {
        continue;
      }
      const unlockedAt = snapshot.unlocked[achievement.id];
      const unlocked = unlockedAt !== undefined;
      const value = snapshot.progress[achievement.id] ?? 0;
      entry.item.classList.toggle("is-unlocked", unlocked);
      const status = unlocked
        ? formatPlayTime(unlockedAt)
        : achievement.target > 1
          ? `${value}/${achievement.target}`
          : "";
      if (entry.status.textContent !== status) {
        entry.status.textContent = status;
      }
      entry.status.title = unlocked ? "Obtenu à ce temps de jeu" : "";
      if (entry.bar) {
        entry.bar.style.width = `${Math.round(
          ((unlocked ? achievement.target : value) / achievement.target) * 100,
        )}%`;
      }
    }
  };

  const queue: ToastEntry[] = [];
  let toastTimer: ReturnType<typeof setTimeout> | null = null;

  const showNextToast = (): void => {
    const next = queue.shift();
    if (!next) {
      toast.hidden = true;
      toast.classList.remove("is-visible");
      toastTimer = null;
      return;
    }
    const label = document.createElement("span");
    label.className = "achievement-toast-label";
    label.textContent = next.label;
    const name = document.createElement("strong");
    name.className = "achievement-toast-name";
    name.textContent = next.name;
    const detail = document.createElement("span");
    detail.className = "achievement-toast-detail";
    detail.textContent = next.detail;
    toast.replaceChildren(label, name, detail);
    toast.classList.toggle("is-complete", next.complete);
    toast.hidden = false;
    toast.classList.remove("is-visible");
    // Relance l’animation d’apparition pour chaque succès de la file.
    void toast.offsetWidth;
    toast.classList.add("is-visible");
    toastTimer = setTimeout(showNextToast, ACHIEVEMENT_TOAST_DURATION);
  };

  const unsubscribeUnlock = achievements.onUnlock(({ achievements: unlocked, completed }) => {
    const current = achievements.getSnapshot();
    for (const achievement of unlocked) {
      queue.push({
        label: `Succès débloqué · ${formatPlayTime(current.unlocked[achievement.id] ?? 0)}`,
        name: achievement.name,
        detail: achievement.description,
        complete: false,
      });
    }
    if (completed) {
      queue.push({
        label: "100 % · Jeu terminé",
        name: formatPlayTime(current.completedAt ?? 0),
        detail: "Temps final : tous les succès sont débloqués !",
        complete: true,
      });
    }
    if (tab.getAttribute("aria-selected") !== "true") {
      tab.setAttribute("data-alert", "");
    }
    if (toastTimer === null) {
      showNextToast();
    }
  });

  const unsubscribe = achievements.subscribe(render);
  const clockTimer = setInterval(renderClock, CLOCK_REFRESH);

  return () => {
    unsubscribe();
    unsubscribeUnlock();
    clearInterval(clockTimer);
    if (toastTimer !== null) {
      clearTimeout(toastTimer);
    }
  };
}
