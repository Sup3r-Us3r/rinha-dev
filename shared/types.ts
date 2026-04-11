export type RoomCode = string;

export type AnimationState =
  | 'idle'
  | 'punch'
  | 'kick'
  | 'hit'
  | 'jump'
  | 'down'
  | 'dead';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
}

export interface PlayerState {
  id: string;
  characterId: string;
  x: number;
  y: number;
  vy: number;
  isGrounded: boolean;
  facingRight: boolean;
  hp: number;
  animation: AnimationState;
  animationTimer: number;
}

export interface GameState {
  players: Record<string, PlayerState>;
  timeLeft: number;
  status: 'waiting' | 'selecting' | 'playing' | 'finished';
  winner?: string;
}

export interface RoomInfo {
  code: string;
  player1SocketId: string;
  player2SocketId?: string;
  characters: Record<string, string>;
  gameState: GameState;
}

export interface RoomCreatedPayload {
  roomCode: RoomCode;
  playerId: string;
  state: GameState;
}

export interface RoomJoinedPayload {
  roomCode: RoomCode;
  playerId: string;
  state: GameState;
}

export interface GameOverPayload {
  winnerPlayerId?: string;
  state: GameState;
}

export interface CharacterSelectedPayload {
  playerId: string;
  characterId: string;
}

export interface BothReadyPayload {
  player1: string;
  player2: string;
}

export interface ClientToServerEvents {
  'create-room': () => void;
  'join-room': (roomCode: RoomCode) => void;
  'player-input': (input: PlayerInput) => void;
  'play-again': () => void;
  'player-select-character': (payload: {
    roomCode: string;
    characterId: string;
  }) => void;
}

export interface ServerToClientEvents {
  'room-created': (payload: RoomCreatedPayload) => void;
  'room-joined': (payload: RoomJoinedPayload) => void;
  'room-error': (message: string) => void;
  'player-left': () => void;
  'game-start': (state: GameState) => void;
  'game-state': (state: GameState) => void;
  'game-over': (payload: GameOverPayload) => void;
  'character-selected': (payload: CharacterSelectedPayload) => void;
  'both-ready': (payload: BothReadyPayload) => void;
}
