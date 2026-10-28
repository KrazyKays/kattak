import { DEFAULT_WALLS } from "./obstacles";
import {
  COMPANIONS,
  MAX_COMPANION_LEVEL,
  MAX_REACHABLE_COMPANION_LEVEL,
  PRESTIGE_UPGRADES,
  type GameProgression,
  type ProgressionSnapshot,
} from "./progression";

/** Durée de partie maximale pour le défi « Éclair ». */
export const SPEED_PRESTIGE_LIMIT = 3 * 60 * 1000;

export const ACHIEVEMENT_CATEGORIES = [
  { id: "discovery", name: "Découverte" },
  { id: "companions", name: "Compagnons" },
  { id: "wealth", name: "Richesse" },
  { id: "prestige", name: "Prestige" },
  { id: "challenge", name: "Défis" },
] as const;

export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]["id"];

export interface LastPrestige {
  /** Temps de jeu de la partie terminée, ou null s’il est inconnu. */
  runTime: number | null;
  /** État juste avant le prestige. */
  previous: ProgressionSnapshot;
}

export interface AchievementContext {
  snapshot: ProgressionSnapshot;
  lastPrestige: LastPrestige | null;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  /** Valeur à atteindre ; au-delà de 1, une jauge de progression est affichée. */
  target: number;
  measure: (context: AchievementContext) => number;
}

const TOTAL_TALENT_LEVELS = PRESTIGE_UPGRADES.reduce(
  (total, { costs }) => total + costs.length,
  0,
);

function companionsAtLevel(snapshot: ProgressionSnapshot, level: number): number {
  return COMPANIONS.filter(({ id }) => snapshot.companions[id] >= level).length;
}

function highestCompanionLevel(snapshot: ProgressionSnapshot): number {
  return Math.max(...COMPANIONS.map(({ id }) => snapshot.companions[id]));
}

function talentLevels(snapshot: ProgressionSnapshot): number {
  return snapshot.prestigeUpgrades.reduce((total, { level }) => total + level, 0);
}

const flag = (value: boolean): number => (value ? 1 : 0);

export const ACHIEVEMENTS: readonly Achievement[] = [
  {
    id: "first-nugget",
    name: "Première pépite",
    description: "Ramasser une pépite.",
    category: "discovery",
    target: 1,
    measure: ({ snapshot }) => snapshot.stats.resourcesCollected,
  },
  {
    id: "first-summon",
    name: "Premier compagnon",
    description: "Invoquer un compagnon.",
    category: "discovery",
    target: 1,
    measure: ({ snapshot }) => snapshot.stats.summons,
  },
  {
    id: "first-fragment",
    name: "Éclat",
    description: "Ramasser un fragment.",
    category: "discovery",
    target: 1,
    measure: ({ snapshot }) => snapshot.stats.fragmentsCollected,
  },
  {
    id: "first-wall",
    name: "Brèche",
    description: "Supprimer un mur.",
    category: "discovery",
    target: 1,
    measure: ({ snapshot }) => snapshot.stats.wallsRemoved,
  },
  {
    id: "auto-summon",
    name: "Pilote automatique",
    description: "Débloquer l’invocation automatique.",
    category: "discovery",
    target: 1,
    measure: ({ snapshot }) => flag(snapshot.autoSummonUnlocked),
  },
  {
    id: "golden",
    name: "Coup de chance",
    description: "Obtenir une pépite dorée.",
    category: "discovery",
    target: 1,
    measure: ({ snapshot }) => snapshot.stats.goldenResources,
  },
  {
    id: "full-roster",
    name: "Ménagerie",
    description: "Réunir les 6 compagnons dans une même partie.",
    category: "companions",
    target: COMPANIONS.length,
    measure: ({ snapshot }) => companionsAtLevel(snapshot, 1),
  },
  {
    id: "level-3",
    name: "Vétéran",
    description: `Amener un compagnon au niveau ${MAX_COMPANION_LEVEL}.`,
    category: "companions",
    target: MAX_COMPANION_LEVEL,
    measure: ({ snapshot }) => highestCompanionLevel(snapshot),
  },
  {
    id: "all-level-3",
    name: "Escouade d’élite",
    description: `Avoir tous les compagnons au niveau ${MAX_COMPANION_LEVEL} dans une même partie.`,
    category: "companions",
    target: COMPANIONS.length,
    measure: ({ snapshot }) => companionsAtLevel(snapshot, MAX_COMPANION_LEVEL),
  },
  {
    id: "level-max",
    name: "Transcendance",
    description: `Amener un compagnon au niveau ${MAX_REACHABLE_COMPANION_LEVEL}.`,
    category: "companions",
    target: MAX_REACHABLE_COMPANION_LEVEL,
    measure: ({ snapshot }) => highestCompanionLevel(snapshot),
  },
  {
    id: "all-level-max",
    name: "Panthéon",
    description: `Avoir tous les compagnons au niveau ${MAX_REACHABLE_COMPANION_LEVEL} dans une même partie.`,
    category: "companions",
    target: COMPANIONS.length,
    measure: ({ snapshot }) =>
      companionsAtLevel(snapshot, MAX_REACHABLE_COMPANION_LEVEL),
  },
  {
    id: "summoner",
    name: "Grand invocateur",
    description: "Réaliser 100 invocations au total.",
    category: "companions",
    target: 100,
    measure: ({ snapshot }) => snapshot.stats.summons,
  },
  {
    id: "hoard",
    name: "Magot",
    description: "Posséder 100 pépites en même temps.",
    category: "wealth",
    target: 100,
    measure: ({ snapshot }) => snapshot.resources,
  },
  {
    id: "treasure",
    name: "Trésor de dragon",
    description: "Posséder 500 pépites en même temps.",
    category: "wealth",
    target: 500,
    measure: ({ snapshot }) => snapshot.resources,
  },
  {
    id: "gold-digger",
    name: "Chercheur d’or",
    description: "Récolter 1 000 pépites au total.",
    category: "wealth",
    target: 1000,
    measure: ({ snapshot }) => snapshot.stats.resourcesCollected,
  },
  {
    id: "gold-rush",
    name: "Ruée vers l’or",
    description: "Récolter 5 000 pépites au total.",
    category: "wealth",
    target: 5000,
    measure: ({ snapshot }) => snapshot.stats.resourcesCollected,
  },
  {
    id: "midas",
    name: "Toucher de Midas",
    description: "Obtenir 100 pépites dorées.",
    category: "wealth",
    target: 100,
    measure: ({ snapshot }) => snapshot.stats.goldenResources,
  },
  {
    id: "black-hole",
    name: "Horizon des événements",
    description: "Faire aspirer 100 pépites par les jetons du crabe.",
    category: "wealth",
    target: 100,
    measure: ({ snapshot }) => snapshot.stats.absorbedResources,
  },
  {
    id: "open-arena",
    name: "Grand ménage",
    description: `Supprimer les ${DEFAULT_WALLS.length} murs dans une même partie.`,
    category: "wealth",
    target: DEFAULT_WALLS.length,
    measure: ({ snapshot }) => DEFAULT_WALLS.length - snapshot.wallsRemaining,
  },
  {
    id: "first-prestige",
    name: "Couronnement",
    description: "Faire un premier prestige.",
    category: "prestige",
    target: 1,
    measure: ({ snapshot }) => snapshot.prestigeCount,
  },
  {
    id: "dynasty",
    name: "Dynastie",
    description: "Faire 5 prestiges.",
    category: "prestige",
    target: 5,
    measure: ({ snapshot }) => snapshot.prestigeCount,
  },
  {
    id: "royal-harvest",
    name: "Récolte royale",
    description: "Avoir 6 couronnes en attente dans une même partie.",
    category: "prestige",
    target: 6,
    measure: ({ snapshot }) => snapshot.pendingCrowns,
  },
  {
    id: "first-talent",
    name: "Savoir-faire",
    description: "Acheter un talent de prestige.",
    category: "prestige",
    target: 1,
    measure: ({ snapshot }) => talentLevels(snapshot),
  },
  {
    id: "talent-max",
    name: "Spécialiste",
    description: "Monter un talent au niveau maximal.",
    category: "prestige",
    target: 1,
    measure: ({ snapshot }) =>
      flag(snapshot.prestigeUpgrades.some(({ nextCost }) => nextCost === null)),
  },
  {
    id: "all-talents",
    name: "Omniscience",
    description: "Monter tous les talents au niveau maximal.",
    category: "prestige",
    target: TOTAL_TALENT_LEVELS,
    measure: ({ snapshot }) => talentLevels(snapshot),
  },
  {
    id: "speed-prestige",
    name: "Éclair",
    description: "Faire un prestige moins de 3 minutes de jeu après le début de la partie.",
    category: "challenge",
    target: 1,
    measure: ({ lastPrestige }) =>
      flag(
        lastPrestige?.runTime != null &&
          lastPrestige.runTime <= SPEED_PRESTIGE_LIMIT,
      ),
  },
  {
    id: "ascetic",
    name: "Ascète",
    description: "Faire un prestige sans avoir invoqué de compagnon pendant la partie.",
    category: "challenge",
    target: 1,
    measure: ({ lastPrestige }) =>
      flag(
        lastPrestige !== null &&
          companionsAtLevel(lastPrestige.previous, 1) === 0,
      ),
  },
  {
    id: "fortress",
    name: "Forteresse",
    description: "Faire un prestige sans avoir supprimé de mur pendant la partie.",
    category: "challenge",
    target: 1,
    measure: ({ lastPrestige }) =>
      flag(
        lastPrestige !== null &&
          lastPrestige.previous.wallsRemaining === DEFAULT_WALLS.length,
      ),
  },
];

export type AchievementId = string;

export interface AchievementSnapshot {
  /** Temps de jeu (ms) auquel chaque succès a été obtenu. */
  unlocked: Readonly<Record<AchievementId, number>>;
  /** Avancement de chaque succès, plafonné à sa cible. */
  progress: Readonly<Record<AchievementId, number>>;
  unlockedCount: number;
  total: number;
  /** Temps de jeu au moment du 100 %, ou null. */
  completedAt: number | null;
}

export interface AchievementUnlockEvent {
  achievements: readonly Achievement[];
  completed: boolean;
}

/** État sérialisable, utilisé par la sauvegarde locale. */
export interface AchievementState {
  playTime: number;
  started: boolean;
  runStartedAt: number | null;
  completedAt: number | null;
  unlocked: Record<AchievementId, number>;
}

type AchievementListener = (snapshot: AchievementSnapshot) => void;
type UnlockListener = (event: AchievementUnlockEvent) => void;

function readTime(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

/** Formate un temps de jeu en `m:ss.d`, ou `h:mm:ss.d` au-delà d’une heure. */
export function formatPlayTime(ms: number): string {
  const tenths = Math.floor(Math.max(0, ms) / 100);
  const hours = Math.floor(tenths / 36000);
  const minutes = Math.floor(tenths / 600) % 60;
  const seconds = Math.floor(tenths / 10) % 60;
  const pad = (value: number): string => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}.${tenths % 10}`
    : `${minutes}:${pad(seconds)}.${tenths % 10}`;
}

/**
 * Suit les succès et le temps de jeu. Le chrono démarre à la première
 * commande du joueur, se met en pause quand la page est masquée (le jeu
 * l’est aussi) et s’arrête définitivement au 100 %.
 */
export class AchievementTracker {
  private elapsed = 0;
  private activeSince: number | null = null;
  private started = false;
  private hidden = false;
  private runStartedAt: number | null = 0;
  private completedAt: number | null = null;
  private unlocked: Record<AchievementId, number> = {};
  private progress: Record<AchievementId, number> = {};
  private previous: ProgressionSnapshot | null = null;
  private lastPrestige: LastPrestige | null = null;
  private readonly listeners = new Set<AchievementListener>();
  private readonly unlockListeners = new Set<UnlockListener>();

  constructor(private readonly now: () => number = () => performance.now()) {}

  getPlayTime(): number {
    return (
      this.elapsed +
      (this.activeSince !== null ? this.now() - this.activeSince : 0)
    );
  }

  isRunning(): boolean {
    return this.activeSince !== null;
  }

  /** Démarre le chrono ; sans effet s’il tourne déjà. */
  start(): void {
    if (!this.started) {
      this.started = true;
      this.syncClock();
    }
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.syncClock();
  }

  /** Suit la progression ; les succès déjà acquis au branchement sont débloqués sans notification. */
  observe(progression: GameProgression): () => void {
    let initial = true;
    const unsubscribe = progression.subscribe((snapshot) => {
      this.evaluate(snapshot, !initial);
    });
    initial = false;
    return unsubscribe;
  }

  getSnapshot(): AchievementSnapshot {
    const unlockedCount = Object.keys(this.unlocked).length;
    return {
      unlocked: { ...this.unlocked },
      progress: { ...this.progress },
      unlockedCount,
      total: ACHIEVEMENTS.length,
      completedAt: this.completedAt,
    };
  }

  subscribe(listener: AchievementListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  onUnlock(listener: UnlockListener): () => void {
    this.unlockListeners.add(listener);
    return () => this.unlockListeners.delete(listener);
  }

  exportState(): AchievementState {
    return {
      playTime: this.getPlayTime(),
      started: this.started,
      runStartedAt: this.runStartedAt,
      completedAt: this.completedAt,
      unlocked: { ...this.unlocked },
    };
  }

  /** Restaure un état sauvegardé en ignorant les valeurs invalides. */
  restoreState(state: unknown): void {
    if (typeof state !== "object" || state === null) {
      return;
    }
    const data = state as Record<string, unknown>;
    this.elapsed = readTime(data.playTime) ?? 0;
    this.activeSince = null;
    this.started = data.started === true || this.elapsed > 0;
    this.runStartedAt = readTime(data.runStartedAt);
    this.unlocked = {};
    const unlocked =
      typeof data.unlocked === "object" && data.unlocked !== null
        ? (data.unlocked as Record<string, unknown>)
        : {};
    for (const { id } of ACHIEVEMENTS) {
      const time = readTime(unlocked[id]);
      if (time !== null) {
        this.unlocked[id] = time;
      }
    }
    this.completedAt =
      Object.keys(this.unlocked).length === ACHIEVEMENTS.length
        ? (readTime(data.completedAt) ?? this.elapsed)
        : null;
    this.syncClock();
    this.notify();
  }

  /** Partie en cours commencée avant le suivi du temps : pas de défi chronométré. */
  forgetRunStart(): void {
    this.runStartedAt = null;
  }

  private syncClock(): void {
    const shouldRun = this.started && !this.hidden && this.completedAt === null;
    if (shouldRun && this.activeSince === null) {
      this.activeSince = this.now();
    } else if (!shouldRun && this.activeSince !== null) {
      this.elapsed += this.now() - this.activeSince;
      this.activeSince = null;
    }
  }

  private evaluate(snapshot: ProgressionSnapshot, announce: boolean): void {
    const playTime = this.getPlayTime();
    if (this.previous && snapshot.prestigeCount > this.previous.prestigeCount) {
      this.lastPrestige = {
        runTime:
          this.runStartedAt === null ? null : playTime - this.runStartedAt,
        previous: this.previous,
      };
      this.runStartedAt = playTime;
    }
    this.previous = snapshot;

    const context: AchievementContext = {
      snapshot,
      lastPrestige: this.lastPrestige,
    };
    const unlockedNow: Achievement[] = [];
    for (const achievement of ACHIEVEMENTS) {
      const value = Math.min(achievement.target, achievement.measure(context));
      this.progress[achievement.id] = value;
      if (!(achievement.id in this.unlocked) && value >= achievement.target) {
        this.unlocked[achievement.id] = playTime;
        unlockedNow.push(achievement);
      }
    }

    const completed =
      unlockedNow.length > 0 &&
      this.completedAt === null &&
      Object.keys(this.unlocked).length === ACHIEVEMENTS.length;
    if (completed) {
      this.completedAt = playTime;
      this.syncClock();
    }

    this.notify();
    if (announce && unlockedNow.length > 0) {
      const event: AchievementUnlockEvent = {
        achievements: unlockedNow,
        completed,
      };
      this.unlockListeners.forEach((listener) => listener(event));
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
