export interface ObstacleRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArenaBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Default configuration of 4 scattered walls in the arena.
 * Specified in unscaled arena coordinates.
 */
export const DEFAULT_WALLS: readonly ObstacleRect[] = [
  { x: 220, y: 140, width: 120, height: 24 }, // Top-left horizontal wall
  { x: 460, y: 220, width: 40, height: 72 }, // Top-right vertical block
  { x: 120, y: 400, width: 104, height: 24 }, // Bottom-left horizontal wall
  { x: 400, y: 380, width: 24, height: 120 }, // Bottom-right vertical wall
];

export function scaleObstacle(
  obstacle: ObstacleRect,
  scale: number,
): ObstacleRect {
  return {
    x: obstacle.x * scale,
    y: obstacle.y * scale,
    width: obstacle.width * scale,
    height: obstacle.height * scale,
  };
}

export function scaleObstacles(
  obstacles: readonly ObstacleRect[],
  scale: number,
): ObstacleRect[] {
  return obstacles.map((obstacle) => scaleObstacle(obstacle, scale));
}

export function isCircleCollidingWithRect(
  circleX: number,
  circleY: number,
  radius: number,
  rect: ObstacleRect,
): boolean {
  const closestX = Math.max(rect.x, Math.min(rect.x + rect.width, circleX));
  const closestY = Math.max(rect.y, Math.min(rect.y + rect.height, circleY));
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  return dx * dx + dy * dy < radius * radius;
}

export function isCircleCollidingWithAnyObstacle(
  circleX: number,
  circleY: number,
  radius: number,
  obstacles: readonly ObstacleRect[],
): boolean {
  return obstacles.some((obstacle) =>
    isCircleCollidingWithRect(circleX, circleY, radius, obstacle),
  );
}

export function resolveCircleRectCollision(
  circleX: number,
  circleY: number,
  radius: number,
  rect: ObstacleRect,
): { x: number; y: number; collided: boolean } {
  const closestX = Math.max(rect.x, Math.min(rect.x + rect.width, circleX));
  const closestY = Math.max(rect.y, Math.min(rect.y + rect.height, circleY));
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > 1e-9) {
    if (distanceSquared >= radius * radius) {
      return { x: circleX, y: circleY, collided: false };
    }
    const dist = Math.sqrt(distanceSquared);
    const penetration = radius - dist;
    return {
      x: circleX + (dx / dist) * penetration,
      y: circleY + (dy / dist) * penetration,
      collided: true,
    };
  }

  // Circle center is inside or on the edge of the rectangle
  const distLeft = circleX - rect.x;
  const distRight = rect.x + rect.width - circleX;
  const distTop = circleY - rect.y;
  const distBottom = rect.y + rect.height - circleY;
  const minDist = Math.min(distLeft, distRight, distTop, distBottom);

  if (minDist === distLeft) {
    return { x: rect.x - radius, y: circleY, collided: true };
  }
  if (minDist === distRight) {
    return { x: rect.x + rect.width + radius, y: circleY, collided: true };
  }
  if (minDist === distTop) {
    return { x: circleX, y: rect.y - radius, collided: true };
  }
  return { x: circleX, y: rect.y + rect.height + radius, collided: true };
}

export function clampCircleToBounds(
  circleX: number,
  circleY: number,
  radius: number,
  bounds: ArenaBounds,
): { x: number; y: number } {
  return {
    x: Math.max(bounds.left + radius, Math.min(bounds.right - radius, circleX)),
    y: Math.max(bounds.top + radius, Math.min(bounds.bottom - radius, circleY)),
  };
}

export function resolveCirclePosition(
  circleX: number,
  circleY: number,
  radius: number,
  obstacles: readonly ObstacleRect[],
  bounds: ArenaBounds,
  iterations = 3,
): { x: number; y: number } {
  let currentX = circleX;
  let currentY = circleY;

  for (let i = 0; i < iterations; i += 1) {
    const bounded = clampCircleToBounds(currentX, currentY, radius, bounds);
    currentX = bounded.x;
    currentY = bounded.y;

    let anyCollided = false;
    for (const obstacle of obstacles) {
      const resolved = resolveCircleRectCollision(
        currentX,
        currentY,
        radius,
        obstacle,
      );
      if (resolved.collided) {
        currentX = resolved.x;
        currentY = resolved.y;
        anyCollided = true;
      }
    }

    if (!anyCollided) {
      break;
    }
  }

  const finalBounded = clampCircleToBounds(currentX, currentY, radius, bounds);
  return { x: finalBounded.x, y: finalBounded.y };
}

/** Au-delà de ce ratio du pas, un déplacement est considéré comme bloqué. */
const BLOCKED_PROGRESS_RATIO = 0.1;

/**
 * Avance vers la destination par sous-pas courts, chacun repoussé hors des murs
 * selon la normale de contact : le cercle glisse le long des faces et contourne
 * les coins arrondis sans à-coups. Quand le mur annule presque tout le pas
 * (destination derrière lui), le déplacement est signalé bloqué et la position
 * reste inchangée pour éviter tout tremblement.
 */
export function moveCircleWithObstacles(
  current: { x: number; y: number },
  destination: { x: number; y: number },
  step: number,
  radius: number,
  obstacles: readonly ObstacleRect[],
  bounds: ArenaBounds,
): { position: { x: number; y: number }; reached: boolean; blocked: boolean } {
  const distance = Math.hypot(
    destination.x - current.x,
    destination.y - current.y,
  );

  if (distance <= 0.5) {
    return {
      position: resolveCirclePosition(
        destination.x,
        destination.y,
        radius,
        obstacles,
        bounds,
      ),
      reached: true,
      blocked: false,
    };
  }

  const totalStep = Math.min(step, distance);
  const subStepCount = Math.max(1, Math.ceil(totalStep / (radius / 2)));
  const subStep = totalStep / subStepCount;
  let x = current.x;
  let y = current.y;

  for (let i = 0; i < subStepCount; i += 1) {
    const deltaX = destination.x - x;
    const deltaY = destination.y - y;
    const remaining = Math.hypot(deltaX, deltaY);
    if (remaining <= 1e-6) {
      break;
    }
    const advance = Math.min(subStep, remaining);
    const resolved = resolveCirclePosition(
      x + (deltaX / remaining) * advance,
      y + (deltaY / remaining) * advance,
      radius,
      obstacles,
      bounds,
    );
    x = resolved.x;
    y = resolved.y;
  }

  if (Math.hypot(x - current.x, y - current.y) < totalStep * BLOCKED_PROGRESS_RATIO) {
    return {
      position: { x: current.x, y: current.y },
      reached: false,
      blocked: true,
    };
  }

  return {
    position: { x, y },
    reached: Math.hypot(destination.x - x, destination.y - y) <= 1,
    blocked: false,
  };
}
