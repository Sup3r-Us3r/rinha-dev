import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  GameOverPayload,
  GameState,
  PlayerId,
  PlayerInput,
  PlayerState,
  RoomCode,
  ServerToClientEvents,
  Vector2XZ,
} from '../../shared/types';

const TICK_MS = 1000 / 60;
const MOVE_SPEED_PER_SECOND = 4.2;
const ARENA_HALF_SIZE = 8;
const HIT_RANGE = 1.5;
const PUNCH_DAMAGE = 10;
const KICK_DAMAGE = 15;
const PUNCH_COOLDOWN = 600;
const KICK_COOLDOWN = 900;
const ATTACK_ANIMATION_MS = 180;
const HIT_ANIMATION_MS = 200;
const KNOCKBACK_DISTANCE = 0.4;

const IDLE_INPUT: PlayerInput = {
  movement: { x: 0, z: 0 },
  actions: { punch: false, kick: false },
};

const SPAWN_POSITION: Record<PlayerId, Vector2XZ> = {
  1: { x: -3, z: 0 },
  2: { x: 3, z: 0 },
};

const SPAWN_ROTATION: Record<PlayerId, number> = {
  1: Math.PI / 2,
  2: -Math.PI / 2,
};

interface PlayerMeta {
  attackAnimationStartedAt: number;
  hitAnimationStartedAt: number;
}

type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class GameRoom {
  private readonly roomCode: RoomCode;
  private readonly io: GameIo;
  private readonly playerIdBySocketId = new Map<string, PlayerId>();
  private readonly inputByPlayerId: Partial<Record<PlayerId, PlayerInput>> = {
    1: { ...IDLE_INPUT },
    2: { ...IDLE_INPUT },
  };
  private readonly metaByPlayerId: Partial<Record<PlayerId, PlayerMeta>> = {
    1: { attackAnimationStartedAt: 0, hitAnimationStartedAt: 0 },
    2: { attackAnimationStartedAt: 0, hitAnimationStartedAt: 0 },
  };

  private updateInterval: NodeJS.Timeout | null = null;

  public readonly state: GameState;

  constructor(roomCode: RoomCode, io: GameIo) {
    this.roomCode = roomCode;
    this.io = io;
    this.state = {
      roomCode,
      status: 'waiting',
      players: {},
      updatedAt: Date.now(),
    };
  }

  isFull(): boolean {
    return Boolean(this.state.players[1] && this.state.players[2]);
  }

  isEmpty(): boolean {
    return !this.state.players[1] && !this.state.players[2];
  }

  addPlayer(socket: GameSocket): PlayerId | null {
    const playerId = this.getAvailablePlayerId();
    if (!playerId) {
      return null;
    }

    this.playerIdBySocketId.set(socket.id, playerId);
    this.state.players[playerId] = this.createPlayerState(playerId, socket.id);
    this.inputByPlayerId[playerId] = { ...IDLE_INPUT };
    this.metaByPlayerId[playerId] = {
      attackAnimationStartedAt: 0,
      hitAnimationStartedAt: 0,
    };

    socket.on('player-input', (rawInput) => {
      const mappedPlayerId = this.playerIdBySocketId.get(socket.id);
      if (!mappedPlayerId || this.state.status !== 'playing') {
        return;
      }

      this.inputByPlayerId[mappedPlayerId] = sanitizeInput(rawInput);
    });

    socket.on('play-again', () => {
      if (this.state.status === 'gameover' && this.isFull()) {
        this.startGame();
      }
    });

    this.touch();

    if (this.isFull()) {
      this.startGame();
    } else {
      this.io.to(this.roomCode).emit('game-state', this.state);
    }

    return playerId;
  }

  removePlayer(socketId: string): void {
    const playerId = this.playerIdBySocketId.get(socketId);
    if (!playerId) {
      return;
    }

    this.playerIdBySocketId.delete(socketId);
    delete this.state.players[playerId];
    this.inputByPlayerId[playerId] = { ...IDLE_INPUT };
    this.metaByPlayerId[playerId] = {
      attackAnimationStartedAt: 0,
      hitAnimationStartedAt: 0,
    };

    this.stopLoop();
    this.state.status = 'waiting';
    this.state.winnerPlayerId = undefined;
    this.touch();

    this.io.to(this.roomCode).emit('player-left');
    this.io.to(this.roomCode).emit('game-state', this.state);
  }

  getState(): GameState {
    return this.state;
  }

  private startGame(): void {
    this.state.status = 'playing';
    this.state.winnerPlayerId = undefined;

    if (this.state.players[1]) {
      this.state.players[1] = this.createPlayerState(
        1,
        this.state.players[1].socketId,
      );
    }

    if (this.state.players[2]) {
      this.state.players[2] = this.createPlayerState(
        2,
        this.state.players[2].socketId,
      );
    }

    this.inputByPlayerId[1] = { ...IDLE_INPUT };
    this.inputByPlayerId[2] = { ...IDLE_INPUT };
    this.metaByPlayerId[1] = {
      attackAnimationStartedAt: 0,
      hitAnimationStartedAt: 0,
    };
    this.metaByPlayerId[2] = {
      attackAnimationStartedAt: 0,
      hitAnimationStartedAt: 0,
    };

    this.touch();
    this.io.to(this.roomCode).emit('game-start', this.state);
    this.startLoop();
  }

  private createPlayerState(playerId: PlayerId, socketId: string): PlayerState {
    return {
      socketId,
      playerId,
      position: { ...SPAWN_POSITION[playerId] },
      rotationY: SPAWN_ROTATION[playerId],
      hp: 100,
      animation: 'idle',
      lastAttackAt: 0,
      isDead: false,
    };
  }

  private getAvailablePlayerId(): PlayerId | null {
    if (!this.state.players[1]) return 1;
    if (!this.state.players[2]) return 2;
    return null;
  }

  private startLoop(): void {
    this.stopLoop();
    this.updateInterval = setInterval(() => this.update(), TICK_MS);
  }

  private stopLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  private update(): void {
    if (this.state.status !== 'playing') {
      return;
    }

    const now = Date.now();
    this.updatePlayer(1, now);
    this.updatePlayer(2, now);

    this.checkGameOver();
    this.touch();

    this.io.to(this.roomCode).emit('game-state', this.state);
  }

  private updatePlayer(playerId: PlayerId, now: number): void {
    const player = this.state.players[playerId];
    if (!player || player.isDead) {
      return;
    }

    const input = this.inputByPlayerId[playerId] ?? IDLE_INPUT;
    const meta = this.metaByPlayerId[playerId];

    const inHitAnimation =
      player.animation === 'hit' &&
      typeof meta?.hitAnimationStartedAt === 'number' &&
      now - meta.hitAnimationStartedAt < HIT_ANIMATION_MS;

    const inAttackAnimation =
      (player.animation === 'punch' || player.animation === 'kick') &&
      typeof meta?.attackAnimationStartedAt === 'number' &&
      now - meta.attackAnimationStartedAt < ATTACK_ANIMATION_MS;

    const canMove = !inHitAnimation && !inAttackAnimation;

    let moving = false;
    if (canMove) {
      moving = this.applyMovement(player, input.movement);
    }

    if (!inHitAnimation) {
      if (input.actions.kick && now - player.lastAttackAt >= KICK_COOLDOWN) {
        player.animation = 'kick';
        player.lastAttackAt = now;
        if (meta) {
          meta.attackAnimationStartedAt = now;
        }
        this.tryAttack(playerId, HIT_RANGE, KICK_DAMAGE, now);
        return;
      }

      if (input.actions.punch && now - player.lastAttackAt >= PUNCH_COOLDOWN) {
        player.animation = 'punch';
        player.lastAttackAt = now;
        if (meta) {
          meta.attackAnimationStartedAt = now;
        }
        this.tryAttack(playerId, HIT_RANGE, PUNCH_DAMAGE, now);
        return;
      }
    }

    if (player.animation === 'dead') {
      return;
    }

    if (inHitAnimation || inAttackAnimation) {
      return;
    }

    player.animation = moving ? 'walk' : 'idle';
  }

  private applyMovement(player: PlayerState, movement: Vector2XZ): boolean {
    if (movement.x === 0 && movement.z === 0) {
      return false;
    }

    const length = Math.hypot(movement.x, movement.z);
    if (length === 0) {
      return false;
    }

    const normalizedX = movement.x / length;
    const normalizedZ = movement.z / length;
    const dt = TICK_MS / 1000;
    const deltaX = normalizedX * MOVE_SPEED_PER_SECOND * dt;
    const deltaZ = normalizedZ * MOVE_SPEED_PER_SECOND * dt;

    player.position.x = clamp(
      player.position.x + deltaX,
      -ARENA_HALF_SIZE,
      ARENA_HALF_SIZE,
    );
    player.position.z = clamp(
      player.position.z + deltaZ,
      -ARENA_HALF_SIZE,
      ARENA_HALF_SIZE,
    );
    player.rotationY = Math.atan2(normalizedX, normalizedZ);

    return true;
  }

  private tryAttack(
    attackerPlayerId: PlayerId,
    range: number,
    damage: number,
    now: number,
  ): void {
    const defenderPlayerId: PlayerId = attackerPlayerId === 1 ? 2 : 1;
    const attacker = this.state.players[attackerPlayerId];
    const defender = this.state.players[defenderPlayerId];

    if (!attacker || !defender || defender.isDead) {
      return;
    }

    const dx = attacker.position.x - defender.position.x;
    const dz = attacker.position.z - defender.position.z;
    const distance = Math.hypot(dx, dz);

    if (distance >= range) {
      return;
    }

    defender.hp = Math.max(0, defender.hp - damage);

    const defenderMeta = this.metaByPlayerId[defenderPlayerId];
    if (defender.hp === 0) {
      defender.isDead = true;
      defender.animation = 'dead';
    } else {
      defender.animation = 'hit';
      if (defenderMeta) {
        defenderMeta.hitAnimationStartedAt = now;
      }
      this.applyKnockback(attacker, defender);
    }
  }

  private applyKnockback(attacker: PlayerState, defender: PlayerState): void {
    const angle = Math.atan2(
      defender.position.x - attacker.position.x,
      defender.position.z - attacker.position.z,
    );

    defender.position.x = clamp(
      defender.position.x + Math.sin(angle) * KNOCKBACK_DISTANCE,
      -ARENA_HALF_SIZE,
      ARENA_HALF_SIZE,
    );
    defender.position.z = clamp(
      defender.position.z + Math.cos(angle) * KNOCKBACK_DISTANCE,
      -ARENA_HALF_SIZE,
      ARENA_HALF_SIZE,
    );
  }

  private checkGameOver(): void {
    const p1 = this.state.players[1];
    const p2 = this.state.players[2];
    if (!p1 || !p2) {
      return;
    }

    const alivePlayers = [p1, p2].filter((player) => !player.isDead);
    if (alivePlayers.length > 1) {
      return;
    }

    this.state.status = 'gameover';
    this.state.winnerPlayerId = alivePlayers[0]?.playerId;
    this.stopLoop();

    const payload: GameOverPayload = {
      winnerPlayerId: this.state.winnerPlayerId,
      state: this.state,
    };

    this.io.to(this.roomCode).emit('game-over', payload);
  }

  private touch(): void {
    this.state.updatedAt = Date.now();
  }
}

function sanitizeInput(input: PlayerInput): PlayerInput {
  return {
    movement: {
      x: clamp(input.movement.x, -1, 1),
      z: clamp(input.movement.z, -1, 1),
    },
    actions: {
      punch: Boolean(input.actions.punch),
      kick: Boolean(input.actions.kick),
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
