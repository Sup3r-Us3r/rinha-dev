export const WALK_FRAME_DURATION = 100;
const WALK_FRAME_COUNT = 4;

export interface WalkAnimator {
  currentFrame: number;
  lastFrameTime: number;
  frameDuration: number;
}

const walkSpriteCache = new Map<string, HTMLImageElement>();

export function createWalkAnimator(): WalkAnimator {
  return {
    currentFrame: 1,
    lastFrameTime: 0,
    frameDuration: WALK_FRAME_DURATION,
  };
}

export function resetWalkAnimator(animator: WalkAnimator): void {
  animator.currentFrame = 1;
  animator.lastFrameTime = 0;
}

function getWalkSpriteByFrame(
  characterId: string,
  frame: number,
): HTMLImageElement {
  const key = `${characterId}-walk-${frame}`;
  const cachedSprite = walkSpriteCache.get(key);

  if (cachedSprite) {
    return cachedSprite;
  }

  const sprite = new Image();
  sprite.src = `/characters/${key}.png`;
  walkSpriteCache.set(key, sprite);

  return sprite;
}

export function getWalkSprite(
  animator: WalkAnimator,
  characterId: string,
  now: number,
): HTMLImageElement {
  if (animator.lastFrameTime === 0) {
    animator.lastFrameTime = now;
  } else if (now - animator.lastFrameTime >= animator.frameDuration) {
    animator.currentFrame = (animator.currentFrame % WALK_FRAME_COUNT) + 1;
    animator.lastFrameTime = now;
  }

  return getWalkSpriteByFrame(characterId, animator.currentFrame);
}
