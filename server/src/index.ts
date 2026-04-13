import { Server } from 'socket.io';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { GameRoom } from './game';
import type {
  ClientToServerEvents,
  RoomCode,
  ServerToClientEvents,
} from '../../shared/types';

const app = express();
app.use(cors());
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' },
  transports: ['websocket'],
  allowUpgrades: false,
  perMessageDeflate: false,
  pingInterval: 20000,
  pingTimeout: 10000,
});

const rooms: Map<RoomCode, GameRoom> = new Map();
const roomCodeBySocketId = new Map<string, RoomCode>();

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('create-room', () => {
    if (roomCodeBySocketId.has(socket.id)) {
      socket.emit('room-error', 'Você já está em uma sala.');
      return;
    }

    let roomId = generateRoomCode();
    while (rooms.has(roomId)) roomId = generateRoomCode();

    const room = new GameRoom(roomId, io);
    rooms.set(roomId, room);
    socket.join(roomId);

    const playerId = room.addPlayer(socket);
    if (!playerId) {
      socket.emit('room-error', 'Não foi possível entrar na sala criada.');
      return;
    }

    roomCodeBySocketId.set(socket.id, roomId);
    socket.emit('room-created', {
      roomCode: roomId,
      playerId,
      state: room.getState(),
    });
  });

  socket.on('join-room', (roomId: string) => {
    if (roomCodeBySocketId.has(socket.id)) {
      socket.emit('room-error', 'Você já está em uma sala.');
      return;
    }

    const normalizedRoom = roomId.trim();
    if (!normalizedRoom) {
      socket.emit('room-error', 'Código de sala inválido.');
      return;
    }

    const room = rooms.get(normalizedRoom);
    if (!room) {
      socket.emit('room-error', 'Sala não encontrada.');
      return;
    }

    if (room.isFull()) {
      socket.emit('room-error', 'A sala está cheia.');
      return;
    }

    socket.join(normalizedRoom);
    const playerId = room.addPlayer(socket);
    if (!playerId) {
      socket.emit('room-error', 'Não foi possível entrar na sala.');
      return;
    }

    roomCodeBySocketId.set(socket.id, normalizedRoom);
    socket.emit('room-joined', {
      roomCode: normalizedRoom,
      playerId,
      state: room.getState(),
    });
  });

  socket.on('player-select-character', (payload) => {
    const roomId = roomCodeBySocketId.get(socket.id);
    if (!roomId) {
      socket.emit('room-error', 'Você não está em uma sala.');
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('room-error', 'Sala não encontrada.');
      return;
    }

    room.selectCharacter(socket.id, payload);
  });

  socket.on('disconnect', () => {
    const roomId = roomCodeBySocketId.get(socket.id);
    roomCodeBySocketId.delete(socket.id);

    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.removePlayer(socket.id);
      }

      if (room && room.isEmpty()) {
        rooms.delete(roomId);
        console.log(`Room ${roomId} deleted.`);
      }
    } else {
      rooms.forEach((room, existingRoomId) => {
        room.removePlayer(socket.id);
        if (room.isEmpty()) {
          rooms.delete(existingRoomId);
          console.log(`Room ${existingRoomId} deleted.`);
        }
      });
    }

    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
