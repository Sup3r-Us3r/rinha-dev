import { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  GameOverPayload,
  GameState,
  PlayerInput,
  PlayerState,
  RoomCode,
  RoomInfo,
  ServerToClientEvents,
} from '../../shared/types';

const TICK_MS = 1000 / 60;
const ROUND_TIME_SECONDS = 60;

const LOGICAL_WIDTH = 1000;
const ARENA_HORIZONTAL_MARGIN_TOTAL = 400;
const ARENA_SIDE_MARGIN = ARENA_HORIZONTAL_MARGIN_TOTAL / 2;
const ARENA_MIN_X = ARENA_SIDE_MARGIN;
const ARENA_MAX_X = LOGICAL_WIDTH - ARENA_SIDE_MARGIN;
const GROUND_Y = 550;
const GRAVITY = 1.2;
const JUMP_VELOCITY = -18;
const MOVE_SPEED = 5;

const PUNCH_DAMAGE = 10;
const KICK_DAMAGE = 15;
const PUNCH_RANGE = 120;
const KICK_RANGE = 140;
const PUNCH_COOLDOWN = 600;
const KICK_COOLDOWN = 900;
const PUNCH_DURATION = 400;
const KICK_DURATION = 500;
const HIT_DURATION = 300;

const STANDING_HITBOX_HEIGHT = 300;
const CROUCH_HITBOX_HEIGHT = 150;
const HITBOX_WIDTH = 80;

type PlayerSlot = 1 | 2;

type GameIo = Server<ClientToServerEvents, ServerToClientEvents>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
};

interface PlayerMeta {
  lastPunchAt: number;
  lastKickAt: number;
  attackEndsAt: number;
  hitEndsAt: number;
}

export class GameRoom {
  private readonly roomCode: RoomCode;
  private readonly io: GameIo;

  private readonly playerSlotBySocketId = new Map<string, PlayerSlot>();
  private readonly inputBySocketId = new Map<string, PlayerInput>();
  private readonly metaBySocketId = new Map<string, PlayerMeta>();

  private updateInterval: NodeJS.Timeout | null = null;

  public readonly roomInfo: RoomInfo;

  constructor(roomCode: RoomCode, io: GameIo) {
    this.roomCode = roomCode;
    this.io = io;

    this.roomInfo = {
      code: roomCode,
      player1SocketId: '',
      player2SocketId: undefined,
      characters: {},
      gameState: {
        players: {},
        timeLeft: ROUND_TIME_SECONDS,
        status: 'waiting',
      },
    };
  }

  isFull(): boolean {
    return Boolean(
      this.roomInfo.player1SocketId && this.roomInfo.player2SocketId,
    );
  }

  isEmpty(): boolean {
    return !this.roomInfo.player1SocketId && !this.roomInfo.player2SocketId;
  }

  addPlayer(socket: GameSocket): string | null {
    const slot = this.getAvailableSlot();
    if (!slot) {
      return null;
    }

    if (slot === 1) {
      this.roomInfo.player1SocketId = socket.id;
    } else {
      this.roomInfo.player2SocketId = socket.id;
    }

    this.playerSlotBySocketId.set(socket.id, slot);
    this.inputBySocketId.set(socket.id, { ...EMPTY_INPUT });
    this.metaBySocketId.set(socket.id, this.createPlayerMeta());
    this.roomInfo.gameState.players[socket.id] = this.createPlayerState(
      socket.id,
      slot,
    );

    socket.on('player-input', (rawInput) => {
      if (this.roomInfo.gameState.status !== 'playing') {
        return;
      }

      if (!this.playerSlotBySocketId.has(socket.id)) {
        return;
      }

      this.inputBySocketId.set(socket.id, sanitizeInput(rawInput));
    });

    socket.on('play-again', () => {
      if (this.roomInfo.gameState.status !== 'finished') {
        return;
      }

      if (!this.isFull()) {
        this.roomInfo.gameState.status = 'waiting';
        this.io.to(this.roomCode).emit('game-state', this.roomInfo.gameState);
        return;
      }

      if (this.hasBothCharactersSelected()) {
        this.startGame();
      } else {
        this.roomInfo.gameState.status = 'selecting';
        this.io.to(this.roomCode).emit('game-state', this.roomInfo.gameState);
      }
    });

    this.roomInfo.gameState.status = this.isFull() ? 'selecting' : 'waiting';
    this.io.to(this.roomCode).emit('game-state', this.roomInfo.gameState);
    return socket.id;
  }

  removePlayer(socketId: string): void {
    const slot = this.playerSlotBySocketId.get(socketId);
    if (!slot) {
      return;
    }

    this.playerSlotBySocketId.delete(socketId);
    this.inputBySocketId.delete(socketId);
    this.metaBySocketId.delete(socketId);

    delete this.roomInfo.characters[socketId];
    delete this.roomInfo.gameState.players[socketId];

    if (slot === 1) {
      this.roomInfo.player1SocketId = '';
    } else {
      this.roomInfo.player2SocketId = undefined;
    }

    this.stopLoop();
    this.roomInfo.gameState.status = this.isFull() ? 'selecting' : 'waiting';
    this.roomInfo.gameState.winner = undefined;
    this.roomInfo.gameState.timeLeft = ROUND_TIME_SECONDS;

    this.io.to(this.roomCode).emit('player-left');
    this.io.to(this.roomCode).emit('game-state', this.roomInfo.gameState);
  }

  getState(): GameState {
    return this.roomInfo.gameState;
  }

  selectCharacter(
    socketId: string,
    payload: { roomCode: string; characterId: string },
  ): void {
    const { roomCode, characterId } = payload;

    if (roomCode !== this.roomCode) {
      return;
    }

    const player = this.roomInfo.gameState.players[socketId];
    if (!player || !characterId.trim()) {
      return;
    }

    const normalizedCharacterId = characterId.trim();
    this.roomInfo.characters[socketId] = normalizedCharacterId;
    player.characterId = normalizedCharacterId;

    this.io.to(this.roomCode).emit('character-selected', {
      playerId: socketId,
      characterId: normalizedCharacterId,
    });

    if (this.hasBothCharactersSelected() && this.roomInfo.player2SocketId) {
      this.io.to(this.roomCode).emit('both-ready', {
        player1: this.roomInfo.player1SocketId,
        player2: this.roomInfo.player2SocketId,
      });
      this.startGame();
    }
  }

  private getAvailableSlot(): PlayerSlot | null {
    if (!this.roomInfo.player1SocketId) return 1;
    if (!this.roomInfo.player2SocketId) return 2;
    return null;
  }

  private createPlayerMeta(): PlayerMeta {
    return {
      lastPunchAt: 0,
      lastKickAt: 0,
      attackEndsAt: 0,
      hitEndsAt: 0,
    };
  }

  private createPlayerState(socketId: string, slot: PlayerSlot): PlayerState {
    return {
      id: socketId,
      characterId: this.roomInfo.characters[socketId] ?? '',
      x: slot === 1 ? 200 : 800,
      y: GROUND_Y,
      vy: 0,
      isGrounded: true,
      facingRight: slot === 1,
      hp: 100,
      animation: 'idle',
      animationTimer: Date.now(),
    };
  }

  private hasBothCharactersSelected(): boolean {
    const p1 = this.roomInfo.player1SocketId;
    const p2 = this.roomInfo.player2SocketId;
    if (!p1 || !p2) {
      return false;
    }

    return Boolean(
      this.roomInfo.characters[p1] && this.roomInfo.characters[p2],
    );
  }

  private startGame(): void {
    if (!this.roomInfo.player1SocketId || !this.roomInfo.player2SocketId) {
      return;
    }

    const p1SocketId = this.roomInfo.player1SocketId;
    const p2SocketId = this.roomInfo.player2SocketId;

    this.roomInfo.gameState.players[p1SocketId] = this.createPlayerState(
      p1SocketId,
      1,
    );
    this.roomInfo.gameState.players[p2SocketId] = this.createPlayerState(
      p2SocketId,
      2,
    );

    this.inputBySocketId.set(p1SocketId, { ...EMPTY_INPUT });
    this.inputBySocketId.set(p2SocketId, { ...EMPTY_INPUT });
    this.metaBySocketId.set(p1SocketId, this.createPlayerMeta());
    this.metaBySocketId.set(p2SocketId, this.createPlayerMeta());

    this.roomInfo.gameState.status = 'playing';
    this.roomInfo.gameState.timeLeft = ROUND_TIME_SECONDS;
    this.roomInfo.gameState.winner = undefined;

    this.updateFacing();

    this.io.to(this.roomCode).emit('game-start', this.roomInfo.gameState);
    this.startLoop();
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
    if (this.roomInfo.gameState.status !== 'playing') {
      return;
    }

    const now = Date.now();

    for (const socketId of Object.keys(this.roomInfo.gameState.players)) {
      this.updatePlayer(socketId, now);
    }

    this.updateFacing();

    this.roomInfo.gameState.timeLeft = Math.max(
      0,
      this.roomInfo.gameState.timeLeft - TICK_MS / 1000,
    );

    this.checkRoundEnd();

    this.io.to(this.roomCode).emit('game-state', this.roomInfo.gameState);
  }

  private updatePlayer(socketId: string, now: number): void {
    const player = this.roomInfo.gameState.players[socketId];
    const input = this.inputBySocketId.get(socketId) ?? EMPTY_INPUT;
    const meta = this.metaBySocketId.get(socketId);

    if (!player || !meta || player.animation === 'dead') {
      return;
    }

    const inHit = player.animation === 'hit' && now < meta.hitEndsAt;
    const inAttack =
      (player.animation === 'punch' || player.animation === 'kick') &&
      now < meta.attackEndsAt;
    let blockedByHit = inHit;
    let blockedByAttack = inAttack;

    if (!blockedByHit && !blockedByAttack) {
      if (input.punch && now - meta.lastPunchAt >= PUNCH_COOLDOWN) {
        meta.lastPunchAt = now;
        meta.attackEndsAt = now + PUNCH_DURATION;
        player.animation = 'punch';
        player.animationTimer = now;
        blockedByAttack = true;
        this.tryAttack(socketId, PUNCH_RANGE, PUNCH_DAMAGE, now);
      } else if (input.kick && now - meta.lastKickAt >= KICK_COOLDOWN) {
        meta.lastKickAt = now;
        meta.attackEndsAt = now + KICK_DURATION;
        player.animation = 'kick';
        player.animationTimer = now;
        blockedByAttack = true;
        this.tryAttack(socketId, KICK_RANGE, KICK_DAMAGE, now);
      }
    }

    if (!blockedByHit && !blockedByAttack) {
      const moveAxis = Number(input.right) - Number(input.left);
      const wantsToCrouch = input.down && player.isGrounded;

      if (!wantsToCrouch && moveAxis !== 0) {
        player.x = clamp(
          player.x + moveAxis * MOVE_SPEED,
          ARENA_MIN_X,
          ARENA_MAX_X,
        );
      }

      if (input.up && player.isGrounded && !wantsToCrouch) {
        player.vy = JUMP_VELOCITY;
        player.isGrounded = false;
        player.animation = 'jump';
        player.animationTimer = now;
      }

      if (wantsToCrouch) {
        player.animation = 'crouch';
        player.animationTimer = now;
      }
    }

    if (!player.isGrounded || player.y < GROUND_Y) {
      player.vy += GRAVITY;
      player.y += player.vy;

      if (player.y >= GROUND_Y) {
        player.y = GROUND_Y;
        player.vy = 0;
        player.isGrounded = true;
      }
    }

    const stillInHit = player.animation === 'hit' && now < meta.hitEndsAt;
    const stillInAttack =
      (player.animation === 'punch' || player.animation === 'kick') &&
      now < meta.attackEndsAt;

    if (!stillInHit && !stillInAttack) {
      const moveAxis = Number(input.right) - Number(input.left);
      const wantsToCrouch = input.down && player.isGrounded;

      if (!player.isGrounded) {
        player.animation = 'jump';
      } else if (wantsToCrouch) {
        player.animation = 'crouch';
      } else if (moveAxis !== 0) {
        player.animation = 'walk';
      } else {
        player.animation = 'idle';
      }
    }
  }

  private tryAttack(
    attackerSocketId: string,
    attackRange: number,
    damage: number,
    now: number,
  ): void {
    const attacker = this.roomInfo.gameState.players[attackerSocketId];
    if (!attacker || attacker.animation === 'dead') {
      return;
    }

    for (const [targetSocketId, target] of Object.entries(
      this.roomInfo.gameState.players,
    )) {
      if (targetSocketId === attackerSocketId || target.animation === 'dead') {
        continue;
      }

      const attackDirection = attacker.facingRight ? 1 : -1;
      const targetRelativeX = target.x - attacker.x;

      if (targetRelativeX * attackDirection < 0) {
        continue;
      }

      if (Math.abs(targetRelativeX) > attackRange) {
        continue;
      }

      if (!this.hitboxesOverlap(attacker, target)) {
        continue;
      }

      target.hp = Math.max(0, target.hp - damage);
      target.animationTimer = now;

      if (target.hp === 0) {
        target.animation = 'dead';
        this.io.to(this.roomCode).emit('combat-sfx', {
          attackerPlayerId: attackerSocketId,
          targetPlayerId: targetSocketId,
          kind: 'death',
        });
      } else {
        target.animation = 'hit';
        const targetMeta = this.metaBySocketId.get(targetSocketId);
        if (targetMeta) {
          targetMeta.hitEndsAt = now + HIT_DURATION;
        }

        this.io.to(this.roomCode).emit('combat-sfx', {
          attackerPlayerId: attackerSocketId,
          targetPlayerId: targetSocketId,
          kind: 'damage',
        });
      }

      return;
    }

    this.io.to(this.roomCode).emit('combat-sfx', {
      attackerPlayerId: attackerSocketId,
      kind: 'attack-missed',
    });
  }

  private hitboxesOverlap(attacker: PlayerState, target: PlayerState): boolean {
    const attackerHeight =
      attacker.animation === 'crouch'
        ? CROUCH_HITBOX_HEIGHT
        : STANDING_HITBOX_HEIGHT;
    const targetHeight =
      target.animation === 'crouch'
        ? CROUCH_HITBOX_HEIGHT
        : STANDING_HITBOX_HEIGHT;

    const attackerLeft = attacker.x - HITBOX_WIDTH / 2;
    const attackerRight = attacker.x + HITBOX_WIDTH / 2;
    const targetLeft = target.x - HITBOX_WIDTH / 2;
    const targetRight = target.x + HITBOX_WIDTH / 2;

    const attackerTop = attacker.y - attackerHeight;
    const attackerBottom = attacker.y;
    const targetTop = target.y - targetHeight;
    const targetBottom = target.y;

    const overlapX = attackerLeft <= targetRight && attackerRight >= targetLeft;
    const overlapY = attackerTop <= targetBottom && attackerBottom >= targetTop;

    return overlapX && overlapY;
  }

  private updateFacing(): void {
    const p1 = this.roomInfo.player1SocketId
      ? this.roomInfo.gameState.players[this.roomInfo.player1SocketId]
      : undefined;
    const p2 = this.roomInfo.player2SocketId
      ? this.roomInfo.gameState.players[this.roomInfo.player2SocketId]
      : undefined;

    if (!p1 || !p2) {
      return;
    }

    if (p1.x <= p2.x) {
      p1.facingRight = true;
      p2.facingRight = false;
    } else {
      p1.facingRight = false;
      p2.facingRight = true;
    }
  }

  private checkRoundEnd(): void {
    const players = Object.values(this.roomInfo.gameState.players);
    if (players.length < 2) {
      return;
    }

    const alivePlayers = players.filter(
      (player) => player.animation !== 'dead' && player.hp > 0,
    );

    if (alivePlayers.length <= 1) {
      this.finishRound(alivePlayers[0]?.id);
      return;
    }

    if (this.roomInfo.gameState.timeLeft <= 0) {
      const [p1, p2] = players;
      if (!p1 || !p2) {
        this.finishRound(undefined);
        return;
      }

      if (p1.hp === p2.hp) {
        this.finishRound(undefined);
      } else {
        this.finishRound(p1.hp > p2.hp ? p1.id : p2.id);
      }
    }
  }

  private finishRound(winnerId?: string): void {
    this.stopLoop();
    this.roomInfo.gameState.status = 'finished';
    this.roomInfo.gameState.winner = winnerId;

    const payload: GameOverPayload = {
      winnerPlayerId: winnerId,
      state: this.roomInfo.gameState,
    };

    this.io.to(this.roomCode).emit('game-over', payload);
  }
}

function sanitizeInput(input: PlayerInput): PlayerInput {
  return {
    left: Boolean(input.left),
    right: Boolean(input.right),
    up: Boolean(input.up),
    down: Boolean(input.down),
    punch: Boolean(input.punch),
    kick: Boolean(input.kick),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
