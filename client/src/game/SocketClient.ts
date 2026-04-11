import { Socket, io } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerInput,
} from '../../../shared/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

class SocketClient {
  public socket: Socket<ServerToClientEvents, ClientToServerEvents>;

  constructor() {
    this.socket = io(SERVER_URL, {
      autoConnect: false,
    });
  }

  connect() {
    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect() {
    if (this.socket.connected) {
      this.socket.disconnect();
    }
  }

  createRoom() {
    this.socket.emit('create-room');
  }

  joinRoom(roomCode: string) {
    this.socket.emit('join-room', roomCode);
  }

  sendInput(input: PlayerInput) {
    this.socket.emit('player-input', input);
  }

  selectCharacter(roomCode: string, characterId: string) {
    this.socket.emit('player-select-character', { roomCode, characterId });
  }

  playAgain() {
    this.socket.emit('play-again');
  }
}

export const socketClient = new SocketClient();
