import type {
  AnimationState,
  GameState,
  PlayerInput,
} from '../../../shared/types';
import {
  createWalkAnimator,
  getWalkSprite,
  resetWalkAnimator,
  type WalkAnimator,
} from '../utils/walk-animator';

const LOGICAL_WIDTH = 1000;
const LOGICAL_HEIGHT = 600;
const GROUND_Y = LOGICAL_HEIGHT - 50;
const SPRITE_LOGICAL_SIZE = 240;
const ARENA_BG_SRC = '/arenas/ex-portais.png';

const FALLBACK_BY_ANIMATION: Partial<Record<AnimationState, AnimationState>> = {
  dead: 'idle',
  hit: 'idle',
  punch: 'idle',
  kick: 'idle',
  jump: 'idle',
  crouch: 'idle',
};

export class GameScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  private readonly spriteCache = new Map<string, HTMLImageElement>();
  private readonly missingSprites = new Set<string>();
  private readonly walkAnimatorByPlayerId = new Map<string, WalkAnimator>();
  private readonly backgroundImage: HTMLImageElement;

  private state: GameState | null = null;
  private rafId: number | null = null;

  constructor(canvas: HTMLCanvasElement, _myPlayerId: string) {
    void _myPlayerId;
    this.canvas = canvas;

    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context não disponível.');
    }

    this.ctx = context;
    this.backgroundImage = new Image();
    this.backgroundImage.src = ARENA_BG_SRC;

    window.addEventListener('resize', this.onWindowResize);
    this.onWindowResize();
    this.animate();
  }

  onWindowResize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  };

  updateState(state: GameState) {
    this.state = state;

    const activePlayerIds = new Set(Object.keys(state.players));
    for (const [playerId] of this.walkAnimatorByPlayerId) {
      if (!activePlayerIds.has(playerId)) {
        this.walkAnimatorByPlayerId.delete(playerId);
      }
    }
  }

  setLocalInput(_input: PlayerInput) {
    void _input;
    // Mantido apenas por compatibilidade com o fluxo existente no App.
  }

  private animate = () => {
    this.render();
    this.rafId = window.requestAnimationFrame(this.animate);
  };

  private render() {
    const width = this.canvas.clientWidth || window.innerWidth;
    const height = this.canvas.clientHeight || window.innerHeight;

    this.ctx.clearRect(0, 0, width, height);
    this.drawBackground(width, height);

    if (!this.state) {
      return;
    }

    const players = Object.values(this.state.players);
    for (const player of players) {
      this.drawPlayer(player, width, height);
    }
  }

  private drawBackground(width: number, height: number) {
    if (
      !this.backgroundImage.complete ||
      this.backgroundImage.naturalWidth === 0
    ) {
      this.ctx.fillStyle = '#0a0a0a';
      this.ctx.fillRect(0, 0, width, height);
      return;
    }

    const scale = Math.max(
      width / this.backgroundImage.naturalWidth,
      height / this.backgroundImage.naturalHeight,
    );

    const drawWidth = this.backgroundImage.naturalWidth * scale;
    const drawHeight = this.backgroundImage.naturalHeight * scale;
    const dx = (width - drawWidth) / 2;
    const dy = (height - drawHeight) / 2;

    this.ctx.drawImage(this.backgroundImage, dx, dy, drawWidth, drawHeight);
  }

  private drawPlayer(
    player: GameState['players'][string],
    width: number,
    height: number,
  ) {
    if (!player.characterId) {
      return;
    }

    const scale = Math.min(width / LOGICAL_WIDTH, height / LOGICAL_HEIGHT);
    const viewportWidth = LOGICAL_WIDTH * scale;
    const viewportHeight = LOGICAL_HEIGHT * scale;
    const offsetX = (width - viewportWidth) / 2;
    const offsetY = (height - viewportHeight) / 2;

    const x = offsetX + player.x * scale;
    const feetY = offsetY + player.y * scale;
    const spriteSize = SPRITE_LOGICAL_SIZE * scale;

    const requestedAnimation = player.animation;
    const sprite = this.getSpriteForPlayer(
      player.id,
      player.characterId,
      requestedAnimation,
    );

    if (!sprite) {
      return;
    }

    this.ctx.save();
    this.ctx.translate(x, feetY - spriteSize / 2);

    if (!player.facingRight) {
      this.ctx.scale(-1, 1);
    }

    this.ctx.drawImage(
      sprite,
      -spriteSize / 2,
      -spriteSize / 2,
      spriteSize,
      spriteSize,
    );
    this.ctx.restore();

    if (player.y < GROUND_Y) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
      this.ctx.beginPath();
      this.ctx.ellipse(
        x,
        offsetY + GROUND_Y * scale + 8,
        30 * scale,
        8 * scale,
        0,
        0,
        Math.PI * 2,
      );
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private resolveAvailableAnimation(
    characterId: string,
    animation: AnimationState,
  ): AnimationState {
    const key = this.getSpriteKey(characterId, animation);
    if (this.missingSprites.has(key)) {
      return FALLBACK_BY_ANIMATION[animation] ?? 'idle';
    }

    return animation;
  }

  private getSpriteForPlayer(
    playerId: string,
    characterId: string,
    animation: AnimationState,
  ): HTMLImageElement | null {
    const walkAnimator = this.getWalkAnimator(playerId);

    if (animation !== 'walk') {
      resetWalkAnimator(walkAnimator);
      const spriteAnimation = this.resolveAvailableAnimation(
        characterId,
        animation,
      );
      return this.getBestAvailableSprite(characterId, spriteAnimation);
    }

    const walkSprite = getWalkSprite(
      walkAnimator,
      characterId,
      performance.now(),
    );
    if (walkSprite && walkSprite.complete && walkSprite.naturalWidth > 0) {
      return walkSprite;
    }

    return this.getBestAvailableSprite(characterId, 'idle');
  }

  private getBestAvailableSprite(
    characterId: string,
    animation: AnimationState,
  ): HTMLImageElement | null {
    const sprite = this.getSprite(characterId, animation);
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      return sprite;
    }

    if (animation === 'idle') {
      return null;
    }

    const idleSprite = this.getSprite(characterId, 'idle');
    if (idleSprite && idleSprite.complete && idleSprite.naturalWidth > 0) {
      return idleSprite;
    }

    return null;
  }

  private getWalkAnimator(playerId: string): WalkAnimator {
    const existingAnimator = this.walkAnimatorByPlayerId.get(playerId);
    if (existingAnimator) {
      return existingAnimator;
    }

    const animator = createWalkAnimator();
    this.walkAnimatorByPlayerId.set(playerId, animator);
    return animator;
  }

  private getSprite(
    characterId: string,
    animation: AnimationState,
  ): HTMLImageElement | null {
    const key = this.getSpriteKey(characterId, animation);
    if (this.spriteCache.has(key)) {
      return this.spriteCache.get(key) ?? null;
    }

    if (!characterId) {
      return null;
    }

    const img = new Image();
    img.src = `/characters/${characterId}-${animation}.png`;
    img.onerror = () => {
      this.missingSprites.add(key);
    };

    this.spriteCache.set(key, img);
    return img;
  }

  private getSpriteKey(characterId: string, animation: AnimationState): string {
    return `${characterId}-${animation}`;
  }

  cleanup() {
    window.removeEventListener('resize', this.onWindowResize);
    this.walkAnimatorByPlayerId.clear();

    if (this.rafId) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
