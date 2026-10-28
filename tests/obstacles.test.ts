import { describe, expect, it } from "vitest";
import {
  ArenaBounds,
  DEFAULT_WALLS,
  isCircleCollidingWithAnyObstacle,
  isCircleCollidingWithRect,
  moveCircleWithObstacles,
  resolveCirclePosition,
  resolveCircleRectCollision,
  scaleObstacles,
} from "../src/game/obstacles";

const TEST_BOUNDS: ArenaBounds = {
  left: 24,
  top: 24,
  right: 616,
  bottom: 616,
};

const RESOURCE_LOCATIONS = [
  { x: 112, y: 128 },
  { x: 520, y: 136 },
  { x: 160, y: 304 },
  { x: 504, y: 352 },
  { x: 120, y: 520 },
  { x: 488, y: 512 },
];

describe("DEFAULT_WALLS configuration", () => {
  it("contains exactly 4 scattered walls", () => {
    expect(DEFAULT_WALLS).toHaveLength(4);
  });

  it("keeps all walls well within the arena boundaries", () => {
    for (const wall of DEFAULT_WALLS) {
      expect(wall.x).toBeGreaterThan(TEST_BOUNDS.left);
      expect(wall.y).toBeGreaterThan(TEST_BOUNDS.top);
      expect(wall.x + wall.width).toBeLessThan(TEST_BOUNDS.right);
      expect(wall.y + wall.height).toBeLessThan(TEST_BOUNDS.bottom);
    }
  });

  it("does not collide with the player spawn at the center", () => {
    const playerSpawn = { x: 320, y: 320 };
    const playerRadius = 16;
    expect(
      isCircleCollidingWithAnyObstacle(
        playerSpawn.x,
        playerSpawn.y,
        playerRadius,
        DEFAULT_WALLS,
      ),
    ).toBe(false);
  });

  it("does not collide with any of the initial resource spawn positions", () => {
    const resourceRadius = 12;
    for (const loc of RESOURCE_LOCATIONS) {
      expect(
        isCircleCollidingWithAnyObstacle(
          loc.x,
          loc.y,
          resourceRadius,
          DEFAULT_WALLS,
        ),
      ).toBe(false);
    }
  });

  it("scales obstacle dimensions and coordinates properly", () => {
    const scaled = scaleObstacles(DEFAULT_WALLS, 2);
    expect(scaled[0]).toEqual({
      x: DEFAULT_WALLS[0].x * 2,
      y: DEFAULT_WALLS[0].y * 2,
      width: DEFAULT_WALLS[0].width * 2,
      height: DEFAULT_WALLS[0].height * 2,
    });
  });
});

describe("isCircleCollidingWithRect", () => {
  const wall = { x: 100, y: 100, width: 80, height: 40 };

  it("returns false when circle is outside the rectangle", () => {
    expect(isCircleCollidingWithRect(50, 120, 10, wall)).toBe(false);
    expect(isCircleCollidingWithRect(220, 120, 10, wall)).toBe(false);
    expect(isCircleCollidingWithRect(140, 50, 10, wall)).toBe(false);
    expect(isCircleCollidingWithRect(140, 180, 10, wall)).toBe(false);
  });

  it("returns false when circle is touching the rectangle without penetrating", () => {
    expect(isCircleCollidingWithRect(90, 120, 10, wall)).toBe(false);
  });

  it("returns true when circle penetrates an edge", () => {
    expect(isCircleCollidingWithRect(95, 120, 10, wall)).toBe(true);
  });

  it("returns true when circle penetrates a corner", () => {
    expect(isCircleCollidingWithRect(95, 95, 10, wall)).toBe(true);
  });

  it("returns true when circle center is inside the rectangle", () => {
    expect(isCircleCollidingWithRect(120, 120, 10, wall)).toBe(true);
  });
});

describe("resolveCircleRectCollision", () => {
  const wall = { x: 100, y: 100, width: 80, height: 40 };

  it("leaves non-colliding circle intact", () => {
    const res = resolveCircleRectCollision(50, 50, 10, wall);
    expect(res.collided).toBe(false);
    expect(res.x).toBe(50);
    expect(res.y).toBe(50);
  });

  it("pushes a circle penetrating the left edge back outside", () => {
    const res = resolveCircleRectCollision(95, 120, 10, wall);
    expect(res.collided).toBe(true);
    expect(res.x).toBeCloseTo(90, 2);
    expect(res.y).toBe(120);
  });

  it("pushes a circle whose center is inside towards the closest edge", () => {
    // Closer to top edge (y=100) than left/right/bottom
    const res = resolveCircleRectCollision(120, 105, 10, wall);
    expect(res.collided).toBe(true);
    expect(res.y).toBe(90);
  });
});

describe("resolveCirclePosition", () => {
  const walls = [{ x: 100, y: 100, width: 80, height: 40 }];
  const bounds: ArenaBounds = { left: 0, top: 0, right: 300, bottom: 300 };

  it("clamps circle to arena bounds", () => {
    const res = resolveCirclePosition(-10, 150, 10, walls, bounds);
    expect(res.x).toBe(10);
  });

  it("resolves circle when starting inside an obstacle", () => {
    const res = resolveCirclePosition(140, 110, 10, walls, bounds);
    expect(isCircleCollidingWithRect(res.x, res.y, 10, walls[0])).toBe(false);
  });
});

describe("moveCircleWithObstacles", () => {
  const bounds: ArenaBounds = { left: 0, top: 0, right: 500, bottom: 500 };
  const radius = 10;
  const walls = [
    { x: 100, y: 100, width: 100, height: 30 }, // horizontal wall: x 100..200, y 100..130
  ];

  it("moves directly to reachable destination without obstacles", () => {
    const current = { x: 50, y: 50 };
    const destination = { x: 60, y: 50 };
    const step = 20;

    const result = moveCircleWithObstacles(
      current,
      destination,
      step,
      radius,
      walls,
      bounds,
    );
    expect(result.reached).toBe(true);
    expect(result.position.x).toBe(60);
    expect(result.position.y).toBe(50);
  });

  it("stops at wall surface when walking directly towards it", () => {
    // Moving from (150, 60) down towards (150, 120), wall top edge is at 100
    const current = { x: 150, y: 80 };
    const destination = { x: 150, y: 120 };
    const step = 30;

    const result = moveCircleWithObstacles(
      current,
      destination,
      step,
      radius,
      walls,
      bounds,
    );
    expect(result.reached).toBe(false);
    expect(result.position.x).toBe(150);
    // Wall top is 100, radius is 10, so max y is 90
    expect(result.position.y).toBeCloseTo(90, 1);
    expect(isCircleCollidingWithRect(result.position.x, result.position.y, radius, walls[0])).toBe(
      false,
    );
  });

  it("slides horizontally along a horizontal wall when moving diagonally", () => {
    // Wall top edge is at 100, player starts touching at y=90
    const current = { x: 120, y: 90 };
    // Player aims down-right towards (180, 150)
    const destination = { x: 180, y: 150 };
    const step = 10;

    const result = moveCircleWithObstacles(
      current,
      destination,
      step,
      radius,
      walls,
      bounds,
    );

    // Player should have advanced in X while remaining at y=90 along the wall
    expect(result.position.x).toBeGreaterThan(120);
    expect(result.position.y).toBeCloseTo(90, 1);
    expect(isCircleCollidingWithRect(result.position.x, result.position.y, radius, walls[0])).toBe(
      false,
    );
  });

  it("slides vertically along a vertical wall when moving diagonally", () => {
    const verticalWall = [{ x: 200, y: 100, width: 30, height: 100 }];
    // Wall left edge is 200, player is at x=190
    const current = { x: 190, y: 120 };
    // Player aims right-down towards (250, 180)
    const destination = { x: 250, y: 180 };
    const step = 10;

    const result = moveCircleWithObstacles(
      current,
      destination,
      step,
      radius,
      verticalWall,
      bounds,
    );

    // Player should have advanced in Y while remaining at x=190 along the wall
    expect(result.position.x).toBeCloseTo(190, 1);
    expect(result.position.y).toBeGreaterThan(120);
    expect(
      isCircleCollidingWithRect(
        result.position.x,
        result.position.y,
        radius,
        verticalWall[0],
      ),
    ).toBe(false);
  });

  it("prevents passing/tunneling through an obstacle even with a large step", () => {
    // Current is on left of wall (x: 100..200, y: 100..130)
    const current = { x: 80, y: 115 };
    // Destination is on the right of the wall
    const destination = { x: 220, y: 115 };
    // Large step trying to bypass the obstacle
    const step = 100;

    const result = moveCircleWithObstacles(
      current,
      destination,
      step,
      radius,
      walls,
      bounds,
    );

    expect(result.reached).toBe(false);
    // Should be stopped at left edge: wall.x - radius = 100 - 10 = 90
    expect(result.position.x).toBeCloseTo(90, 1);
    expect(result.position.y).toBe(115);
  });

  it("marks reached true when destination is arrived at", () => {
    const current = { x: 50, y: 50 };
    const destination = { x: 52, y: 50 };
    const step = 5;

    const result = moveCircleWithObstacles(
      current,
      destination,
      step,
      radius,
      walls,
      bounds,
    );

    expect(result.reached).toBe(true);
    expect(result.position.x).toBeCloseTo(52, 1);
    expect(result.position.y).toBe(50);
  });

  it("rounds a wall corner smoothly without jittering back and forth", () => {
    // Le joueur touche le coin haut-gauche et vise l’autre côté du mur.
    let position = { x: 92, y: 92 };
    const destination = { x: 260, y: 160 };
    let previousDistance = Math.hypot(
      destination.x - position.x,
      destination.y - position.y,
    );

    for (let frame = 0; frame < 120; frame += 1) {
      const result = moveCircleWithObstacles(
        position,
        destination,
        4,
        radius,
        walls,
        bounds,
      );
      const distance = Math.hypot(
        destination.x - result.position.x,
        destination.y - result.position.y,
      );
      expect(distance).toBeLessThanOrEqual(previousDistance + 1e-6);
      expect(
        isCircleCollidingWithRect(
          result.position.x,
          result.position.y,
          radius - 1e-6,
          walls[0],
        ),
      ).toBe(false);
      position = result.position;
      previousDistance = distance;
      if (result.reached || result.blocked) {
        break;
      }
    }

    expect(position.x).toBeGreaterThan(200);
  });

  it("stays still and reports blocked when the destination is straight behind a wall", () => {
    const current = { x: 150, y: 90 };
    const result = moveCircleWithObstacles(
      current,
      { x: 150, y: 200 },
      8,
      radius,
      walls,
      bounds,
    );

    expect(result.blocked).toBe(true);
    expect(result.reached).toBe(false);
    expect(result.position).toEqual(current);
  });

  it("does not tunnel through a thin wall at very high speed", () => {
    const thinWall = [{ x: 100, y: 0, width: 4, height: 500 }];
    const result = moveCircleWithObstacles(
      { x: 80, y: 250 },
      { x: 300, y: 250 },
      400,
      radius,
      thinWall,
      bounds,
    );

    expect(result.position.x).toBeLessThanOrEqual(90 + 1e-6);
  });
});
