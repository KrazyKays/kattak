import { DEFAULT_WALLS } from "./obstacles";

export const SUMMON_COST = 5;
export const MIN_SUMMON_COST = 2;
export const SUMMON_COST_INCREMENT = 1;
export const MAX_COMPANION_LEVEL = 3;
export const MAX_RECENT_ACTIONS = 5;
export const WALL_REMOVAL_COST = 10;
export const AUTO_SUMMON_COST = 20;
/** Pépites récoltées pendant une partie pour la première couronne. */
export const CROWN_RESOURCE_STEP = 20;
export const PRESTIGE_MIN_CROWNS = 3;
export const STARTING_RESOURCES_PER_LEVEL = 15;
export const STARTING_FRAGMENTS_PER_LEVEL = 5;
export const GOLDEN_CHANCE_PER_LEVEL = 0.2;

export const COMPANION_RARITIES = [
  { id: "common", name: "Commun", weight: 50 },
  { id: "uncommon", name: "Peu commun", weight: 35 },
  { id: "rare", name: "Rare", weight: 15 },
] as const;

export type CompanionRarity = (typeof COMPANION_RARITIES)[number]["id"];

function plural(count: number, word: string): string {
  return count > 1 ? `${word}s` : word;
}

export const COMPANIONS = [
  {
    id: "mosquito",
    name: "Moustique magnétique",
    rarity: "common",
    passive: "+25 % au rayon de collecte par niveau.",
    describeLevel: (level: number) => `+${level * 25} % au rayon de collecte`,
  },
  {
    id: "rabbit",
    name: "Lapin rapide",
    rarity: "common",
    passive: "+15 % à la vitesse de déplacement par niveau.",
    describeLevel: (level: number) =>
      `+${level * 15} % à la vitesse de déplacement`,
  },
  {
    id: "squirrel",
    name: "Écureuil prévoyant",
    rarity: "uncommon",
    passive: "Augmente le nombre maximal de pépites de base dans l’arène.",
    describeLevel: (level: number) =>
      `+${level * 2} pépites de base au maximum à l’écran`,
  },
  {
    id: "snail",
    name: "Singe productif",
    rarity: "uncommon",
    passive: "Réduit de 15 % le délai de réapparition par niveau.",
    describeLevel: (level: number) =>
      `−${level * 15} % au délai de réapparition`,
  },
  {
    id: "crab",
    name: "Crabe trou noir",
    rarity: "rare",
    passive:
      "Fait apparaître un jeton aspirant par niveau ; chaque jeton absorbe les trois pépites les plus proches.",
    describeLevel: (level: number) =>
      `${level} ${plural(level, "jeton")} ${plural(level, "aspirant")} ${plural(level, "actif")}`,
  },
  {
    id: "magpie",
    name: "Pie glaneuse",
    rarity: "rare",
    passive:
      "Fait apparaître 2 fragments par niveau dans l’arène ; chaque fragment ramassé rejoint votre réserve.",
    describeLevel: (level: number) => `${level * 2} fragments à l’écran`,
  },
] as const;

export type Companion = (typeof COMPANIONS)[number];
export type CompanionId = Companion["id"];

export const PRESTIGE_UPGRADES = [
  {
    id: "golden",
    name: "Pépites dorées",
    description: "Chaque pépite ramassée peut compter double.",
    costs: [1, 2, 3, 4, 5],
    describeLevel: (level: number) =>
      `${Math.round(level * GOLDEN_CHANCE_PER_LEVEL * 100)} % de chances de pépite double`,
  },
  {
    id: "heritage",
    name: "Héritage",
    description: "Des pépites vous attendent au début de chaque partie.",
    costs: [1, 2, 3, 4, 5],
    describeLevel: (level: number) =>
      `${level * STARTING_RESOURCES_PER_LEVEL} pépites au départ`,
  },
  {
    id: "bargain",
    name: "Marchandage",
    description: "Réduit le coût de base des invocations.",
    costs: [2, 3, 4],
    describeLevel: (level: number) => `−${level} au coût de base des invocations`,
  },
  {
    id: "nest",
    name: "Nid de pie",
    description: "Des fragments vous attendent au début de chaque partie.",
    costs: [1, 2, 3],
    describeLevel: (level: number) =>
      `${level * STARTING_FRAGMENTS_PER_LEVEL} fragments au départ`,
  },
  {
    id: "memory",
    name: "Mémoire mécanique",
    description: "L’invocation automatique reste débloquée d’une partie à l’autre.",
    costs: [2],
    describeLevel: () => "Invocation automatique toujours débloquée",
  },
  {
    id: "ascension",
    name: "Au-delà du plafond",
    description: "Les compagnons peuvent dépasser le niveau 3.",
    costs: [4, 8],
    describeLevel: (level: number) =>
      `Niveau maximal des compagnons : ${MAX_COMPANION_LEVEL + level}`,
  },
] as const;

export type PrestigeUpgrade = (typeof PRESTIGE_UPGRADES)[number];
export type PrestigeUpgradeId = PrestigeUpgrade["id"];

export const MAX_REACHABLE_COMPANION_LEVEL =
  MAX_COMPANION_LEVEL +
  (PRESTIGE_UPGRADES.find(({ id }) => id === "ascension")?.costs.length ?? 0);

export interface SummonedCompanion {
  companion: Companion;
  level: number;
}

export interface SummonEvent {
  summons: readonly SummonedCompanion[];
  automatic: boolean;
}

export interface PrestigeUpgradeState {
  id: PrestigeUpgradeId;
  level: number;
  maxLevel: number;
  /** Coût du prochain niveau, ou null si le talent est au maximum. */
  nextCost: number | null;
}

/** Compteurs cumulés sur toutes les parties, conservés au prestige. */
export interface LifetimeStats {
  resourcesCollected: number;
  goldenResources: number;
  absorbedResources: number;
  fragmentsCollected: number;
  summons: number;
  wallsRemoved: number;
  crownsEarned: number;
}

export interface ProgressionSnapshot {
  resources: number;
  fragments: number;
  wallRemovalCost: number;
  /** Indices (dans DEFAULT_WALLS) des murs encore présents. */
  walls: readonly number[];
  wallsRemaining: number;
  lastRemovedWallIndex: number | null;
  autoSummonUnlocked: boolean;
  autoSummonCost: number;
  autoSummonEnabled: boolean;
  summonCost: number;
  affordableSummons: number;
  affordableSummonCost: number;
  maxCompanionLevel: number;
  companions: Readonly<Record<CompanionId, number>>;
  companionChances: Readonly<Record<CompanionId, number>>;
  recentActions: readonly string[];
  runResourcesCollected: number;
  crowns: number;
  pendingCrowns: number;
  currentCrownAt: number;
  nextCrownAt: number;
  canPrestige: boolean;
  prestigeCount: number;
  prestigeUpgrades: readonly PrestigeUpgradeState[];
  stats: Readonly<LifetimeStats>;
}

/** État sérialisable, utilisé par la sauvegarde locale. */
export interface ProgressionState {
  resources: number;
  fragments: number;
  walls: number[];
  autoSummonUnlocked: boolean;
  autoSummonEnabled: boolean;
  successfulSummons: number;
  companions: Record<CompanionId, number>;
  recentActions: string[];
  runResourcesCollected: number;
  crowns: number;
  prestigeCount: number;
  prestigeUpgrades: Record<PrestigeUpgradeId, number>;
  stats: LifetimeStats;
}

export type SummonResult =
  | { kind: "success"; companion: Companion; level: number }
  | { kind: "insufficient-resources" }
  | { kind: "all-maxed" };

export type SummonAllResult =
  | { kind: "success"; summons: readonly SummonedCompanion[] }
  | { kind: "insufficient-resources" }
  | { kind: "all-maxed" };

export type PrestigeResult =
  | { kind: "success"; crowns: number }
  | { kind: "insufficient-progress" };

export type PrestigeUpgradeResult = "bought" | "insufficient-crowns" | "maxed";

type ProgressionListener = (snapshot: ProgressionSnapshot) => void;
type SummonListener = (event: SummonEvent) => void;

export type WallRemovalResult =
  | "removed"
  | "insufficient-fragments"
  | "no-walls";

function createCompanionLevels(): Record<CompanionId, number> {
  return {
    mosquito: 0,
    rabbit: 0,
    snail: 0,
    crab: 0,
    squirrel: 0,
    magpie: 0,
  };
}

function createUpgradeLevels(): Record<PrestigeUpgradeId, number> {
  return {
    golden: 0,
    heritage: 0,
    bargain: 0,
    nest: 0,
    memory: 0,
    ascension: 0,
  };
}

function createStats(): LifetimeStats {
  return {
    resourcesCollected: 0,
    goldenResources: 0,
    absorbedResources: 0,
    fragmentsCollected: 0,
    summons: 0,
    wallsRemoved: 0,
    crownsEarned: 0,
  };
}

function readCount(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(0, Math.floor(value)))
    : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getCrownsForResources(resources: number): number {
  return Math.floor(Math.sqrt(resources / CROWN_RESOURCE_STEP));
}

export function getResourcesForCrowns(crowns: number): number {
  return crowns * crowns * CROWN_RESOURCE_STEP;
}

export class GameProgression {
  private resources = 0;
  private fragments = 0;
  private walls: number[] = DEFAULT_WALLS.map((_, index) => index);
  private lastRemovedWallIndex: number | null = null;
  private autoSummonUnlocked = false;
  private autoSummonEnabled = false;
  private successfulSummons = 0;
  private companionLevels = createCompanionLevels();
  private runResourcesCollected = 0;
  private crowns = 0;
  private prestigeCount = 0;
  private readonly prestigeUpgrades = createUpgradeLevels();
  private stats = createStats();
  private readonly recentActions: string[] = [];
  private readonly listeners = new Set<ProgressionListener>();
  private readonly summonListeners = new Set<SummonListener>();

  constructor(private readonly random: () => number = Math.random) {}

  getSnapshot(): ProgressionSnapshot {
    const affordableSummons = this.getAffordableSummons();
    const pendingCrowns = this.getPendingCrowns();
    return {
      resources: this.resources,
      fragments: this.fragments,
      wallRemovalCost: WALL_REMOVAL_COST,
      walls: [...this.walls],
      wallsRemaining: this.walls.length,
      lastRemovedWallIndex: this.lastRemovedWallIndex,
      autoSummonUnlocked: this.autoSummonUnlocked,
      autoSummonCost: AUTO_SUMMON_COST,
      autoSummonEnabled: this.autoSummonEnabled,
      summonCost: this.getSummonCost(),
      affordableSummons: affordableSummons.count,
      affordableSummonCost: affordableSummons.cost,
      maxCompanionLevel: this.getMaxCompanionLevel(),
      companions: { ...this.companionLevels },
      companionChances: this.getCompanionChances(),
      recentActions: [...this.recentActions],
      runResourcesCollected: this.runResourcesCollected,
      crowns: this.crowns,
      pendingCrowns,
      currentCrownAt: getResourcesForCrowns(pendingCrowns),
      nextCrownAt: getResourcesForCrowns(pendingCrowns + 1),
      canPrestige: pendingCrowns >= PRESTIGE_MIN_CROWNS,
      prestigeCount: this.prestigeCount,
      prestigeUpgrades: PRESTIGE_UPGRADES.map(({ id, costs }) => {
        const level = this.prestigeUpgrades[id];
        return {
          id,
          level,
          maxLevel: costs.length,
          nextCost: level < costs.length ? costs[level] : null,
        };
      }),
      stats: { ...this.stats },
    };
  }

  getSummonCost(): number {
    return (
      Math.max(MIN_SUMMON_COST, SUMMON_COST - this.prestigeUpgrades.bargain) +
      this.successfulSummons * SUMMON_COST_INCREMENT
    );
  }

  getMaxCompanionLevel(): number {
    return MAX_COMPANION_LEVEL + this.prestigeUpgrades.ascension;
  }

  getAffordableSummonCount(): number {
    return this.getAffordableSummons().count;
  }

  private getAffordableSummons(): { count: number; cost: number } {
    const maxLevel = this.getMaxCompanionLevel();
    let resources = this.resources;
    let summonCost = this.getSummonCost();
    let remainingSummons = COMPANIONS.reduce(
      (total, { id }) => total + maxLevel - this.companionLevels[id],
      0,
    );
    let count = 0;
    let cost = 0;

    while (remainingSummons > 0 && resources >= summonCost) {
      resources -= summonCost;
      cost += summonCost;
      summonCost += SUMMON_COST_INCREMENT;
      remainingSummons -= 1;
      count += 1;
    }

    return { count, cost };
  }

  subscribe(listener: ProgressionListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  /** Notifié après chaque invocation réussie, manuelle ou automatique. */
  onSummon(listener: SummonListener): () => void {
    this.summonListeners.add(listener);
    return () => this.summonListeners.delete(listener);
  }

  /**
   * Ramasse une pépite et renvoie le nombre réellement crédité.
   * `absorbed` signale une pépite aspirée par un jeton du crabe.
   */
  collectResource(absorbed = false): number {
    const goldenChance =
      this.prestigeUpgrades.golden * GOLDEN_CHANCE_PER_LEVEL;
    const amount = goldenChance > 0 && this.random() < goldenChance ? 2 : 1;
    this.resources += amount;
    this.runResourcesCollected += amount;
    this.stats.resourcesCollected += amount;
    if (amount > 1) {
      this.stats.goldenResources += 1;
    }
    if (absorbed) {
      this.stats.absorbedResources += amount;
    }
    const summons = this.autoSummonEnabled ? this.autoSummon() : [];
    this.notify();
    this.emitSummons(summons, true);
    return amount;
  }

  collectFragment(amount = 1): void {
    this.fragments += amount;
    this.stats.fragmentsCollected += amount;
    this.notify();
  }

  setAutoSummon(enabled: boolean): void {
    if (
      this.autoSummonEnabled === enabled ||
      (enabled && !this.autoSummonUnlocked)
    ) {
      return;
    }

    this.autoSummonEnabled = enabled;
    const summons = enabled ? this.autoSummon() : [];
    this.notify();
    this.emitSummons(summons, true);
  }

  getFragmentCapacity(): number {
    return this.companionLevels.magpie * 2;
  }

  unlockAutoSummon(): boolean {
    if (this.autoSummonUnlocked || this.fragments < AUTO_SUMMON_COST) {
      return false;
    }

    this.fragments -= AUTO_SUMMON_COST;
    this.autoSummonUnlocked = true;
    this.recordAction(
      `Invocation automatique débloquée · ${AUTO_SUMMON_COST} fragments dépensés.`,
    );
    this.notify();
    return true;
  }

  removeRandomWall(): WallRemovalResult {
    if (this.walls.length === 0) {
      return "no-walls";
    }
    if (this.fragments < WALL_REMOVAL_COST) {
      return "insufficient-fragments";
    }

    this.fragments -= WALL_REMOVAL_COST;
    const index = Math.min(
      this.walls.length - 1,
      Math.floor(this.random() * this.walls.length),
    );
    [this.lastRemovedWallIndex] = this.walls.splice(index, 1);
    this.stats.wallsRemoved += 1;
    this.recordAction(
      `Mur aléatoire supprimé · ${WALL_REMOVAL_COST} fragments dépensés.`,
    );
    this.notify();
    return "removed";
  }

  summon(): SummonResult {
    const result = this.summonOne();
    if (result.kind === "success") {
      this.recordSummonAction(result.companion, result.level);
      this.notify();
      this.emitSummons([result], false);
    }
    return result;
  }

  summonAll(): SummonAllResult {
    if (this.getAffordableSummonCount() === 0) {
      return this.hasAvailableCompanions()
        ? { kind: "insufficient-resources" }
        : { kind: "all-maxed" };
    }

    const summons: SummonedCompanion[] = [];
    let result = this.summonOne();
    while (result.kind === "success") {
      summons.push({ companion: result.companion, level: result.level });
      this.recordSummonAction(result.companion, result.level);
      if (this.getAffordableSummonCount() === 0) {
        break;
      }
      result = this.summonOne();
    }

    this.notify();
    this.emitSummons(summons, false);
    return { kind: "success", summons };
  }

  getPendingCrowns(): number {
    return getCrownsForResources(this.runResourcesCollected);
  }

  /**
   * Termine la partie : les pépites récoltées sont converties en couronnes,
   * puis compagnons, ressources et murs sont réinitialisés.
   */
  prestige(): PrestigeResult {
    const crowns = this.getPendingCrowns();
    if (crowns < PRESTIGE_MIN_CROWNS) {
      return { kind: "insufficient-progress" };
    }

    this.crowns += crowns;
    this.stats.crownsEarned += crowns;
    this.prestigeCount += 1;
    this.startRun();
    this.recordAction(
      `Prestige n° ${this.prestigeCount} · +${crowns} couronnes.`,
    );
    this.notify();
    return { kind: "success", crowns };
  }

  buyPrestigeUpgrade(id: PrestigeUpgradeId): PrestigeUpgradeResult {
    const upgrade = PRESTIGE_UPGRADES.find((candidate) => candidate.id === id);
    const level = this.prestigeUpgrades[id];
    if (!upgrade || level >= upgrade.costs.length) {
      return "maxed";
    }
    const cost = upgrade.costs[level];
    if (this.crowns < cost) {
      return "insufficient-crowns";
    }

    this.crowns -= cost;
    this.prestigeUpgrades[id] = level + 1;
    // Les bonus de départ profitent aussi à la partie en cours.
    if (id === "heritage") {
      this.resources += STARTING_RESOURCES_PER_LEVEL;
    } else if (id === "nest") {
      this.fragments += STARTING_FRAGMENTS_PER_LEVEL;
    } else if (id === "memory") {
      this.autoSummonUnlocked = true;
    }
    this.recordAction(
      `${upgrade.name} niveau ${level + 1} · ${cost} ${plural(cost, "couronne")}.`,
    );
    const summons = this.autoSummonEnabled ? this.autoSummon() : [];
    this.notify();
    this.emitSummons(summons, true);
    return "bought";
  }

  getMovementSpeed(baseSpeed: number): number {
    return baseSpeed * (1 + this.companionLevels.rabbit * 0.15);
  }

  getCollectionDistance(baseDistance: number): number {
    return baseDistance * (1 + this.companionLevels.mosquito * 0.25);
  }

  getResourceRespawnDelay(baseDelay: number): number {
    return Math.max(500, baseDelay * (1 - this.companionLevels.snail * 0.15));
  }

  getBaseResourceCapacity(baseCapacity: number): number {
    return baseCapacity + this.companionLevels.squirrel * 2;
  }

  getCompanionLevel(id: CompanionId): number {
    return this.companionLevels[id];
  }

  exportState(): ProgressionState {
    return {
      resources: this.resources,
      fragments: this.fragments,
      walls: [...this.walls],
      autoSummonUnlocked: this.autoSummonUnlocked,
      autoSummonEnabled: this.autoSummonEnabled,
      successfulSummons: this.successfulSummons,
      companions: { ...this.companionLevels },
      recentActions: [...this.recentActions],
      runResourcesCollected: this.runResourcesCollected,
      crowns: this.crowns,
      prestigeCount: this.prestigeCount,
      prestigeUpgrades: { ...this.prestigeUpgrades },
      stats: { ...this.stats },
    };
  }

  /** Restaure un état sauvegardé en ignorant les valeurs invalides. */
  restoreState(state: unknown): boolean {
    if (!isRecord(state)) {
      return false;
    }

    const upgrades = isRecord(state.prestigeUpgrades)
      ? state.prestigeUpgrades
      : {};
    for (const { id, costs } of PRESTIGE_UPGRADES) {
      this.prestigeUpgrades[id] = readCount(upgrades[id], costs.length);
    }

    const maxLevel = this.getMaxCompanionLevel();
    const companions = isRecord(state.companions) ? state.companions : {};
    this.companionLevels = createCompanionLevels();
    for (const { id } of COMPANIONS) {
      this.companionLevels[id] = readCount(companions[id], maxLevel);
    }

    this.resources = readCount(state.resources);
    this.fragments = readCount(state.fragments);
    this.walls = Array.isArray(state.walls)
      ? [...new Set(state.walls)].filter(
          (index): index is number =>
            Number.isInteger(index) &&
            index >= 0 &&
            index < DEFAULT_WALLS.length,
        )
      : DEFAULT_WALLS.map((_, index) => index);
    this.lastRemovedWallIndex = null;
    this.autoSummonUnlocked =
      state.autoSummonUnlocked === true || this.prestigeUpgrades.memory > 0;
    this.autoSummonEnabled =
      this.autoSummonUnlocked && state.autoSummonEnabled === true;
    this.successfulSummons = readCount(state.successfulSummons);
    this.runResourcesCollected = readCount(state.runResourcesCollected);
    this.crowns = readCount(state.crowns);
    this.prestigeCount = readCount(state.prestigeCount);
    const stats = isRecord(state.stats) ? state.stats : {};
    this.stats = createStats();
    for (const key of Object.keys(this.stats) as (keyof LifetimeStats)[]) {
      this.stats[key] = readCount(stats[key]);
    }
    this.recentActions.length = 0;
    if (Array.isArray(state.recentActions)) {
      this.recentActions.push(
        ...state.recentActions
          .filter((action): action is string => typeof action === "string")
          .slice(0, MAX_RECENT_ACTIONS),
      );
    }

    this.notify();
    return true;
  }

  private startRun(): void {
    this.resources =
      this.prestigeUpgrades.heritage * STARTING_RESOURCES_PER_LEVEL;
    this.fragments = this.prestigeUpgrades.nest * STARTING_FRAGMENTS_PER_LEVEL;
    this.walls = DEFAULT_WALLS.map((_, index) => index);
    this.lastRemovedWallIndex = null;
    this.autoSummonUnlocked = this.prestigeUpgrades.memory > 0;
    this.autoSummonEnabled = this.autoSummonUnlocked && this.autoSummonEnabled;
    this.successfulSummons = 0;
    this.companionLevels = createCompanionLevels();
    this.runResourcesCollected = 0;
  }

  private hasAvailableCompanions(): boolean {
    const maxLevel = this.getMaxCompanionLevel();
    return COMPANIONS.some(({ id }) => this.companionLevels[id] < maxLevel);
  }

  private getCompanionChances(): Record<CompanionId, number> {
    const maxLevel = this.getMaxCompanionLevel();
    const chances = createCompanionLevels();
    const availableByRarity = COMPANION_RARITIES.map((rarity) => ({
      ...rarity,
      companions: COMPANIONS.filter(
        ({ id, rarity: companionRarity }) =>
          companionRarity === rarity.id && this.companionLevels[id] < maxLevel,
      ),
    })).filter(({ companions }) => companions.length > 0);
    const totalWeight = availableByRarity.reduce(
      (total, rarity) => total + rarity.weight,
      0,
    );

    for (const rarity of availableByRarity) {
      const chancePerCompanion =
        (rarity.weight / totalWeight / rarity.companions.length) * 100;
      for (const companion of rarity.companions) {
        chances[companion.id] = chancePerCompanion;
      }
    }

    return chances;
  }

  private recordSummonAction(
    companion: Companion,
    level: number,
    automatic = false,
  ): void {
    this.recordAction(
      `${companion.name} invoqué${automatic ? " automatiquement" : ""} · niveau ${level}.`,
    );
  }

  private autoSummon(): SummonedCompanion[] {
    const summons: SummonedCompanion[] = [];
    while (this.getAffordableSummonCount() > 0) {
      const result = this.summonOne();
      if (result.kind !== "success") {
        break;
      }
      summons.push({ companion: result.companion, level: result.level });
      this.recordSummonAction(result.companion, result.level, true);
    }
    return summons;
  }

  private recordAction(action: string): void {
    this.recentActions.unshift(action);
    this.recentActions.length = Math.min(
      this.recentActions.length,
      MAX_RECENT_ACTIONS,
    );
  }

  private summonOne(): SummonResult {
    const maxLevel = this.getMaxCompanionLevel();
    const availableCompanions = COMPANION_RARITIES.flatMap(({ id: rarity }) =>
      COMPANIONS.filter(
        (companion) =>
          companion.rarity === rarity &&
          this.companionLevels[companion.id] < maxLevel,
      ),
    );
    if (availableCompanions.length === 0) {
      return { kind: "all-maxed" };
    }

    const summonCost = this.getSummonCost();
    if (this.resources < summonCost) {
      return { kind: "insufficient-resources" };
    }

    this.resources -= summonCost;
    this.successfulSummons += 1;
    this.stats.summons += 1;
    const chances = this.getCompanionChances();
    let roll = this.random() * 100;
    let companion = availableCompanions[availableCompanions.length - 1];
    for (const candidate of availableCompanions) {
      roll -= chances[candidate.id];
      if (roll < 0) {
        companion = candidate;
        break;
      }
    }
    const level = ++this.companionLevels[companion.id];

    return { kind: "success", companion, level };
  }

  private emitSummons(
    summons: readonly SummonedCompanion[],
    automatic: boolean,
  ): void {
    if (summons.length === 0) {
      return;
    }
    const event: SummonEvent = { summons, automatic };
    this.summonListeners.forEach((listener) => listener(event));
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}
