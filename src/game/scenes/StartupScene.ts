import Phaser from "phaser";
import {
  getNearestResources,
  isResourceTouchingCollectionZone,
  type Point,
} from "../collection";
import type { GameProgression, ProgressionSnapshot } from "../progression";
import { RENDER_SCALE } from "../renderScale";
import type { TutorialGuide } from "../tutorial";
import {
  DEFAULT_WALLS,
  isCircleCollidingWithAnyObstacle,
  moveCircleWithObstacles,
  resolveCirclePosition,
  scaleObstacle,
  type ObstacleRect,
} from "../obstacles";

const ARENA = {
  left: 24 * RENDER_SCALE,
  top: 24 * RENDER_SCALE,
  right: 616 * RENDER_SCALE,
  bottom: 616 * RENDER_SCALE,
};
const GAME_SIZE = 640 * RENDER_SCALE;
const ARENA_TEXTURE_KEY = "arena-background";
const PLAYER_RADIUS = 16 * RENDER_SCALE;
const PLAYER_SPEED = 240 * RENDER_SCALE;
const RESOURCE_RADIUS = 12 * RENDER_SCALE;
const RESOURCE_RESPAWN_DELAY = 3000;
const SPECIAL_TOKEN_RESPAWN_DELAY = 6000;
const FRAGMENT_RESPAWN_DELAY = 8000;
const SPECIAL_TOKEN_ABSORBED_RESOURCE_COUNT = 3;
const RESOURCE_RESPAWN_RETRY_DELAY = 1000;
const RESOURCE_SPAWN_SPACING = RESOURCE_RADIUS * 2 + 8 * RENDER_SCALE;
const PLAYER_SPAWN_CLEARANCE = PLAYER_RADIUS + RESOURCE_RADIUS + 8 * RENDER_SCALE;
const FEEDBACK_POOL_SIZE = 16;
const RESOURCE_LOCATIONS = [
  { x: 112, y: 128 },
  { x: 520, y: 136 },
  { x: 160, y: 304 },
  { x: 504, y: 352 },
  { x: 120, y: 520 },
  { x: 488, y: 512 },
];

const FEEDBACK_COLORS = {
  resource: "#c93324",
  golden: "#b07a12",
  fragment: "#23766b",
  token: "#7157a5",
} as const;

export class StartupScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private collectionZone!: Phaser.GameObjects.Arc;
  private collectionZoneRadius = 0;
  private destination: Phaser.Math.Vector2 | null = null;
  private destinationMarker!: Phaser.GameObjects.Arc;
  private wallsGraphics!: Phaser.GameObjects.Graphics;
  private resources: Phaser.GameObjects.Arc[] = [];
  private observedResourceCapacity = RESOURCE_LOCATIONS.length;
  private specialTokens: Phaser.GameObjects.Star[] = [];
  private pendingSpecialTokenSpawns = 0;
  private fragments: Phaser.GameObjects.Rectangle[] = [];
  private pendingFragmentSpawns = 0;
  private walls: ObstacleRect[] = [];
  private wallsKey = "";
  private spawnCandidates: Point[] = [];
  private feedbackPool: Phaser.GameObjects.Text[] = [];
  private nextFeedback = 0;
  private prestigeCount = 0;

  constructor(
    private readonly progression: GameProgression,
    private readonly tutorial: TutorialGuide,
  ) {
    super("startup");
  }

  create(): void {
    // L’instance de scène est conservée lors d’un redémarrage (prestige).
    this.destination = null;
    this.resources = [];
    this.specialTokens = [];
    this.pendingSpecialTokenSpawns = 0;
    this.fragments = [];
    this.pendingFragmentSpawns = 0;
    this.observedResourceCapacity = RESOURCE_LOCATIONS.length;
    this.feedbackPool = [];
    this.nextFeedback = 0;
    this.wallsKey = "";

    this.add.image(0, 0, this.getArenaTexture()).setOrigin(0);

    this.wallsGraphics = this.add.graphics().setDepth(2);
    const initial = this.progression.getSnapshot();
    this.prestigeCount = initial.prestigeCount;
    this.syncWalls(initial.walls);
    const unsubscribe = this.progression.subscribe(this.onProgression);

    this.collectionZoneRadius = this.getCollectionZoneRadius();
    this.collectionZone = this.add
      .circle(
        320 * RENDER_SCALE,
        320 * RENDER_SCALE,
        this.collectionZoneRadius,
        0xc93324,
        0.08,
      )
      .setStrokeStyle(2 * RENDER_SCALE, 0xc93324, 1)
      .setDepth(1);

    this.resources = RESOURCE_LOCATIONS.map(({ x, y }) =>
      this.createResource(x * RENDER_SCALE, y * RENDER_SCALE),
    );

    this.player = this.add
      .circle(320 * RENDER_SCALE, 320 * RENDER_SCALE, PLAYER_RADIUS, 0xc93324)
      .setStrokeStyle(3 * RENDER_SCALE, 0x191815)
      .setDepth(4);

    this.destinationMarker = this.add
      .circle(320 * RENDER_SCALE, 320 * RENDER_SCALE, 8 * RENDER_SCALE)
      .setStrokeStyle(2 * RENDER_SCALE, 0x191815)
      .setDepth(4)
      .setVisible(false);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.setDestination, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.followPointer, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.setDestination, this);
      this.input.off(Phaser.Input.Events.POINTER_MOVE, this.followPointer, this);
    });
  }

  update(_time: number, delta: number): void {
    if (this.destination) {
      const step =
        this.progression.getMovementSpeed(PLAYER_SPEED) * (delta / 1000);
      const result = moveCircleWithObstacles(
        { x: this.player.x, y: this.player.y },
        this.destination,
        step,
        PLAYER_RADIUS,
        this.walls,
        ARENA,
      );

      this.player.setPosition(result.position.x, result.position.y);

      // Bloqué contre un mur : on s’arrête net plutôt que de trembler.
      if (result.reached || result.blocked) {
        this.destination = null;
        this.destinationMarker.setVisible(false);
      }
    }

    const collectionZoneRadius = this.getCollectionZoneRadius();
    this.collectionZone.setPosition(this.player.x, this.player.y);
    if (collectionZoneRadius !== this.collectionZoneRadius) {
      this.collectionZoneRadius = collectionZoneRadius;
      this.collectionZone.setRadius(collectionZoneRadius);
    }
    this.collectResources(collectionZoneRadius);
    this.ensureResourceCapacity();
    this.ensureSpecialTokens();
    this.collectSpecialTokens(collectionZoneRadius);
    this.ensureFragments();
    this.collectFragments(collectionZoneRadius);
  }

  private readonly onProgression = (snapshot: ProgressionSnapshot): void => {
    if (snapshot.prestigeCount !== this.prestigeCount) {
      this.prestigeCount = snapshot.prestigeCount;
      this.scene.restart();
      return;
    }
    this.syncWalls(snapshot.walls);
  };

  /** Le fond pointillé est dessiné une seule fois dans une texture. */
  private getArenaTexture(): string {
    if (this.textures.exists(ARENA_TEXTURE_KEY)) {
      return ARENA_TEXTURE_KEY;
    }

    const arena = this.make.graphics({}, false);
    arena.fillStyle(0xeee4ce);
    arena.fillRect(0, 0, GAME_SIZE, GAME_SIZE);
    arena.fillStyle(0x8a7962, 0.28);
    for (let y = ARENA.top + 10 * RENDER_SCALE; y < ARENA.bottom; y += 16 * RENDER_SCALE) {
      for (let x = ARENA.left + 10 * RENDER_SCALE; x < ARENA.right; x += 16 * RENDER_SCALE) {
        if (((x / RENDER_SCALE + y / RENDER_SCALE) / 16) % 3 !== 0) {
          arena.fillCircle(x, y, RENDER_SCALE);
        }
      }
    }
    arena.lineStyle(3 * RENDER_SCALE, 0x191815, 1);
    arena.strokeRect(
      ARENA.left,
      ARENA.top,
      ARENA.right - ARENA.left,
      ARENA.bottom - ARENA.top,
    );
    arena.generateTexture(ARENA_TEXTURE_KEY, GAME_SIZE, GAME_SIZE);
    arena.destroy();
    return ARENA_TEXTURE_KEY;
  }

  private syncWalls(wallIndices: readonly number[]): void {
    const key = wallIndices.join(",");
    if (key === this.wallsKey) {
      return;
    }
    this.wallsKey = key;
    this.walls = wallIndices.map((index) =>
      scaleObstacle(DEFAULT_WALLS[index], RENDER_SCALE),
    );
    this.spawnCandidates = this.computeSpawnCandidates();
    this.drawWalls();
  }

  private showFeedback(x: number, y: number, label: string, color: string): void {
    let feedback = this.feedbackPool[this.nextFeedback];
    if (!feedback) {
      feedback = this.add
        .text(0, 0, label, {
          fontFamily: "Impact, Arial, sans-serif",
          fontSize: `${16 * RENDER_SCALE}px`,
          fontStyle: "bold",
          color,
          stroke: "#f4eddf",
          strokeThickness: 3 * RENDER_SCALE,
        })
        .setOrigin(0.5)
        .setDepth(10);
      this.feedbackPool[this.nextFeedback] = feedback;
    } else {
      this.tweens.killTweensOf(feedback);
      // Ne redessine le texte que s’il change réellement.
      if (feedback.style.color !== color) {
        feedback.setColor(color);
      }
      feedback.setText(label);
    }
    this.nextFeedback = (this.nextFeedback + 1) % FEEDBACK_POOL_SIZE;

    feedback
      .setPosition(x, y - 20 * RENDER_SCALE)
      .setAlpha(1)
      .setScale(1)
      .setVisible(true);
    this.tweens.add({
      targets: feedback,
      y: feedback.y - 24 * RENDER_SCALE,
      alpha: 0,
      scale: 1.1,
      duration: 1000,
      ease: "Cubic.Out",
      onComplete: () => feedback.setVisible(false),
    });
  }

  private ensureFragments(): void {
    const missingCount =
      this.progression.getFragmentCapacity() -
      this.fragments.length -
      this.pendingFragmentSpawns;

    for (let i = 0; i < missingCount; i += 1) {
      this.scheduleFragmentSpawn(0);
    }
  }

  private collectFragments(collectionZoneRadius: number): void {
    for (let i = this.fragments.length - 1; i >= 0; i -= 1) {
      const fragment = this.fragments[i];
      if (
        !isResourceTouchingCollectionZone(
          this.player,
          fragment,
          collectionZoneRadius,
          RESOURCE_RADIUS,
        )
      ) {
        continue;
      }

      this.fragments.splice(i, 1);
      this.showFeedback(fragment.x, fragment.y, "+1 FRAGMENT", FEEDBACK_COLORS.fragment);
      fragment.destroy();
      this.progression.collectFragment();
      this.scheduleFragmentSpawn(FRAGMENT_RESPAWN_DELAY);
    }
  }

  private scheduleFragmentSpawn(delay: number): void {
    this.pendingFragmentSpawns += 1;
    this.time.delayedCall(delay, this.spawnPendingFragment, [], this);
  }

  private spawnPendingFragment(): void {
    const position = this.findAvailableResourcePosition();
    if (!position) {
      this.time.delayedCall(
        RESOURCE_RESPAWN_RETRY_DELAY,
        this.spawnPendingFragment,
        [],
        this,
      );
      return;
    }

    this.pendingFragmentSpawns -= 1;
    this.fragments.push(
      this.add
        .rectangle(
          position.x,
          position.y,
          RESOURCE_RADIUS * 1.4,
          RESOURCE_RADIUS * 1.4,
          0x2f9e8f,
        )
        .setAngle(45)
        .setStrokeStyle(3 * RENDER_SCALE, 0x191815)
        .setDepth(3),
    );
  }

  private drawWalls(): void {
    this.wallsGraphics.clear();
    for (const wall of this.walls) {
      // Solid dark ink fill
      this.wallsGraphics.fillStyle(0x231f1c, 1);
      this.wallsGraphics.fillRect(wall.x, wall.y, wall.width, wall.height);

      // Inner subtle border for printed relief effect
      this.wallsGraphics.lineStyle(RENDER_SCALE, 0x473e35, 0.85);
      this.wallsGraphics.strokeRect(
        wall.x + 2 * RENDER_SCALE,
        wall.y + 2 * RENDER_SCALE,
        wall.width - 4 * RENDER_SCALE,
        wall.height - 4 * RENDER_SCALE,
      );

      // Black outline matching arena borders and entities
      this.wallsGraphics.lineStyle(
        3 * RENDER_SCALE,
        0x191815,
        1,
      );
      this.wallsGraphics.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }
  }

  /** Maintenir le pointeur enfoncé fait suivre la destination. */
  private followPointer(pointer: Phaser.Input.Pointer): void {
    if (pointer.isDown) {
      this.setDestination(pointer);
    }
  }

  private setDestination(pointer: Phaser.Input.Pointer): void {
    if (
      pointer.x < ARENA.left ||
      pointer.x > ARENA.right ||
      pointer.y < ARENA.top ||
      pointer.y > ARENA.bottom
    ) {
      return;
    }

    const destinationX = Phaser.Math.Clamp(
      pointer.x,
      ARENA.left + PLAYER_RADIUS,
      ARENA.right - PLAYER_RADIUS,
    );
    const destinationY = Phaser.Math.Clamp(
      pointer.y,
      ARENA.top + PLAYER_RADIUS,
      ARENA.bottom - PLAYER_RADIUS,
    );

    const resolved = resolveCirclePosition(
      destinationX,
      destinationY,
      PLAYER_RADIUS,
      this.walls,
      ARENA,
    );

    if (this.destination) {
      this.destination.set(resolved.x, resolved.y);
    } else {
      this.destination = new Phaser.Math.Vector2(resolved.x, resolved.y);
    }
    this.destinationMarker
      .setPosition(resolved.x, resolved.y)
      .setVisible(true);
    this.tutorial.onMoveCommand();
  }

  /** Ramasse une pépite et renvoie le montant crédité (doublé par les pépites dorées). */
  private creditResource(
    resource: Phaser.GameObjects.Arc,
    absorbed = false,
  ): number {
    resource.destroy();
    const amount = this.progression.collectResource(absorbed);
    this.tutorial.onResourceCollected();
    this.scheduleResourceSpawn(
      this.progression.getResourceRespawnDelay(RESOURCE_RESPAWN_DELAY),
    );
    return amount;
  }

  private collectResources(collectionZoneRadius: number): void {
    for (let i = this.resources.length - 1; i >= 0; i -= 1) {
      const resource = this.resources[i];
      if (
        !isResourceTouchingCollectionZone(
          this.player,
          resource,
          collectionZoneRadius,
          RESOURCE_RADIUS,
        )
      ) {
        continue;
      }

      this.resources.splice(i, 1);
      const amount = this.creditResource(resource);
      this.showFeedback(
        resource.x,
        resource.y,
        amount > 1 ? `+${amount} PÉPITES !` : "+1 PÉPITE",
        amount > 1 ? FEEDBACK_COLORS.golden : FEEDBACK_COLORS.resource,
      );
    }
  }

  private getCollectionZoneRadius(): number {
    return this.progression.getCollectionDistance(
      PLAYER_RADIUS + RESOURCE_RADIUS,
    ) - RESOURCE_RADIUS;
  }

  private ensureResourceCapacity(): void {
    const capacity = this.progression.getBaseResourceCapacity(
      RESOURCE_LOCATIONS.length,
    );
    const additionalCapacity = capacity - this.observedResourceCapacity;
    this.observedResourceCapacity = capacity;

    for (let i = 0; i < additionalCapacity; i += 1) {
      this.scheduleResourceSpawn(0);
    }
  }

  private ensureSpecialTokens(): void {
    const desiredCount = this.progression.getCompanionLevel("crab");
    const missingCount =
      desiredCount - this.specialTokens.length - this.pendingSpecialTokenSpawns;

    for (let i = 0; i < missingCount; i += 1) {
      this.scheduleSpecialTokenSpawn(0);
    }
  }

  private collectSpecialTokens(collectionZoneRadius: number): void {
    for (let i = this.specialTokens.length - 1; i >= 0; i -= 1) {
      const token = this.specialTokens[i];
      if (
        !isResourceTouchingCollectionZone(
          this.player,
          token,
          collectionZoneRadius,
          RESOURCE_RADIUS,
        )
      ) {
        continue;
      }

      const absorbedResources = new Set(
        getNearestResources(
          token,
          this.resources,
          SPECIAL_TOKEN_ABSORBED_RESOURCE_COUNT,
        ),
      );
      let absorbed = 0;
      for (let j = this.resources.length - 1; j >= 0; j -= 1) {
        const resource = this.resources[j];
        if (absorbedResources.has(resource)) {
          this.resources.splice(j, 1);
          absorbed += this.creditResource(resource, true);
        }
      }

      this.specialTokens.splice(i, 1);
      this.showFeedback(
        token.x,
        token.y,
        `+${absorbed} PÉPITE${absorbed === 1 ? "" : "S"} ASPIRÉE${absorbed === 1 ? "" : "S"}`,
        FEEDBACK_COLORS.token,
      );
      token.destroy();
      this.scheduleSpecialTokenSpawn(SPECIAL_TOKEN_RESPAWN_DELAY);
    }
  }

  private scheduleSpecialTokenSpawn(delay: number): void {
    this.pendingSpecialTokenSpawns += 1;
    this.time.delayedCall(delay, this.spawnPendingSpecialToken, [], this);
  }

  private spawnPendingSpecialToken(): void {
    const position = this.findAvailableResourcePosition();
    if (!position) {
      this.time.delayedCall(
        RESOURCE_RESPAWN_RETRY_DELAY,
        this.spawnPendingSpecialToken,
        [],
        this,
      );
      return;
    }

    this.pendingSpecialTokenSpawns -= 1;
    this.specialTokens.push(
      this.add
        .star(
          position.x,
          position.y,
          4,
          RESOURCE_RADIUS * 0.55,
          RESOURCE_RADIUS,
          0x7157a5,
        )
        .setStrokeStyle(3 * RENDER_SCALE, 0x191815)
        .setDepth(3),
    );
  }

  private scheduleResourceSpawn(delay: number): void {
    this.time.delayedCall(delay, this.spawnPendingResource, [], this);
  }

  private createResource(x: number, y: number): Phaser.GameObjects.Arc {
    return this.add
      .circle(x, y, RESOURCE_RADIUS, 0xe2a82e)
      .setStrokeStyle(3 * RENDER_SCALE, 0x191815)
      .setDepth(3);
  }

  private spawnPendingResource(): void {
    const capacity = this.progression.getBaseResourceCapacity(
      RESOURCE_LOCATIONS.length,
    );
    if (this.resources.length >= capacity) {
      return;
    }

    const position = this.findAvailableResourcePosition();
    if (!position) {
      this.time.delayedCall(
        RESOURCE_RESPAWN_RETRY_DELAY,
        this.spawnPendingResource,
        [],
        this,
      );
      return;
    }

    this.resources.push(this.createResource(position.x, position.y));
  }

  /** Grille des emplacements hors murs, recalculée seulement quand les murs changent. */
  private computeSpawnCandidates(): Point[] {
    const candidates: Point[] = [];
    for (
      let y = ARENA.top + RESOURCE_RADIUS;
      y <= ARENA.bottom - RESOURCE_RADIUS;
      y += RESOURCE_SPAWN_SPACING
    ) {
      for (
        let x = ARENA.left + RESOURCE_RADIUS;
        x <= ARENA.right - RESOURCE_RADIUS;
        x += RESOURCE_SPAWN_SPACING
      ) {
        if (
          !isCircleCollidingWithAnyObstacle(
            x,
            y,
            RESOURCE_RADIUS + 4 * RENDER_SCALE,
            this.walls,
          )
        ) {
          candidates.push({ x, y });
        }
      }
    }
    return candidates;
  }

  private findAvailableResourcePosition(): Point | null {
    const minSpacingSquared = RESOURCE_SPAWN_SPACING * RESOURCE_SPAWN_SPACING;
    const playerClearanceSquared =
      PLAYER_SPAWN_CLEARANCE * PLAYER_SPAWN_CLEARANCE;
    const isClear = (
      x: number,
      y: number,
      items: readonly Point[],
    ): boolean => {
      for (const item of items) {
        const dx = x - item.x;
        const dy = y - item.y;
        if (dx * dx + dy * dy <= minSpacingSquared) {
          return false;
        }
      }
      return true;
    };

    const positions: Point[] = [];
    for (const candidate of this.spawnCandidates) {
      const dx = candidate.x - this.player.x;
      const dy = candidate.y - this.player.y;
      if (
        dx * dx + dy * dy > playerClearanceSquared &&
        isClear(candidate.x, candidate.y, this.resources) &&
        isClear(candidate.x, candidate.y, this.specialTokens) &&
        isClear(candidate.x, candidate.y, this.fragments)
      ) {
        positions.push(candidate);
      }
    }

    return positions.length > 0 ? Phaser.Utils.Array.GetRandom(positions) : null;
  }
}
