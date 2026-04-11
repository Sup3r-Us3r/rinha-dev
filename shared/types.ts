export type AnimationState =
  | 'idle'
  | 'walk'
  | 'punch'
  | 'kick'
  | 'hit'
  | 'dead';
export type PlayerId = 1 | 2;
export type RoomCode = string;
export type GameStatus = 'waiting' | 'playing' | 'gameover';

export interface Vector2XZ {
  x: number;
  z: number;
}

export interface PlayerInput {
  movement: Vector2XZ;
  actions: {
    punch: boolean;
    kick: boolean;
  };
}

export interface PlayerState {
  socketId: string;
  playerId: PlayerId;
  position: Vector2XZ;
  rotationY: number;
  hp: number;
  animation: AnimationState;
  lastAttackAt: number;
  isDead: boolean;
}

export interface GameState {
  roomCode: RoomCode;
  status: GameStatus;
  players: Partial<Record<PlayerId, PlayerState>>;
  winnerPlayerId?: PlayerId;
  updatedAt: number;
}

export interface RoomCreatedPayload {
  roomCode: RoomCode;
  playerId: PlayerId;
  state: GameState;
}

export interface RoomJoinedPayload {
  roomCode: RoomCode;
  playerId: PlayerId;
  state: GameState;
}

export interface GameOverPayload {
  winnerPlayerId?: PlayerId;
  state: GameState;
}

export interface ClientToServerEvents {
  'create-room': () => void;
  'join-room': (roomCode: RoomCode) => void;
  'player-input': (input: PlayerInput) => void;
  'play-again': () => void;
}

export interface ServerToClientEvents {
  'room-created': (payload: RoomCreatedPayload) => void;
  'room-joined': (payload: RoomJoinedPayload) => void;
  'room-error': (message: string) => void;
  'player-left': () => void;
  'game-start': (state: GameState) => void;
  'game-state': (state: GameState) => void;
  'game-over': (payload: GameOverPayload) => void;
}
