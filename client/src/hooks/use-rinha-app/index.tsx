import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type {
  GameOverPayload,
  GameState,
  PlayerInput,
  RoomCreatedPayload,
  RoomJoinedPayload,
} from '../../../../shared/types';
import { GameScene } from '../../game/GameScene';
import { socketClient } from '../../game/SocketClient';
import { useGameInput } from '../use-game-input';
import {
  getSelectedCharacterByPlayer,
  resolveHudPlayersFromState,
  type HudPlayers,
} from '../../utils/game-state';

type UiPhase = 'menu' | 'selecting' | 'playing' | 'gameover';

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
};

interface UseRinhaAppResult {
  phase: UiPhase;
  roomCode: string;
  myPlayerId: string | null;
  gameState: GameState | null;
  hudPlayers: HudPlayers;
  errorMessage: string | null;
  mySelectedCharacterId?: string;
  hasSelectedCharacter: boolean;
  resultText: string;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  selectCharacter: (characterId: string) => void;
  playAgain: () => void;
  setErrorMessage: (message: string | null) => void;
}

const useRinhaApp = (): UseRinhaAppResult => {
  const [phase, setPhase] = useState<UiPhase>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [winnerPlayerId, setWinnerPlayerId] = useState<string | undefined>(
    undefined,
  );
  const [selectedCharacterByPlayer, setSelectedCharacterByPlayer] = useState<
    Record<string, string>
  >({});
  const [hudPlayers, setHudPlayers] = useState<HudPlayers>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const input = useGameInput();

  useEffect(() => {
    socketClient.connect();

    const onRoomPayload = (payload: RoomCreatedPayload | RoomJoinedPayload) => {
      setRoomCode(payload.roomCode);
      setMyPlayerId(payload.playerId);
      setGameState(payload.state);
      setWinnerPlayerId(undefined);
      setErrorMessage(null);
      setPhase(payload.state.status === 'playing' ? 'playing' : 'selecting');
      setSelectedCharacterByPlayer(getSelectedCharacterByPlayer(payload.state));
    };

    const onRoomCreated = (payload: RoomCreatedPayload) => {
      onRoomPayload(payload);
    };

    const onRoomJoined = (payload: RoomJoinedPayload) => {
      onRoomPayload(payload);
    };

    const onRoomError = (message: string) => {
      setErrorMessage(message);
    };

    const onGameStart = (state: GameState) => {
      setGameState(state);
      setWinnerPlayerId(undefined);
      setErrorMessage(null);
      setPhase('playing');
      setHudPlayers(resolveHudPlayersFromState(state));
    };

    const onGameState = (state: GameState) => {
      setGameState(state);
      setSelectedCharacterByPlayer(getSelectedCharacterByPlayer(state));

      if (state.status === 'playing') {
        setPhase('playing');
        setHudPlayers(resolveHudPlayersFromState(state));
      } else if (state.status === 'finished') {
        setPhase('gameover');
      } else if (state.status === 'selecting' || state.status === 'waiting') {
        setPhase('selecting');
      }
    };

    const onGameOver = (payload: GameOverPayload) => {
      setGameState(payload.state);
      setWinnerPlayerId(payload.winnerPlayerId);
      setPhase('gameover');
    };

    const onPlayerLeft = () => {
      setErrorMessage('O outro jogador saiu. Aguardando novo oponente...');
      setPhase('selecting');
      setHudPlayers({});
    };

    const onCharacterSelected = (payload: {
      playerId: string;
      characterId: string;
    }) => {
      setSelectedCharacterByPlayer((prev) => ({
        ...prev,
        [payload.playerId]: payload.characterId,
      }));
    };

    const onBothReady = () => {
      setErrorMessage(null);
    };

    socketClient.socket.on('room-created', onRoomCreated);
    socketClient.socket.on('room-joined', onRoomJoined);
    socketClient.socket.on('room-error', onRoomError);
    socketClient.socket.on('game-start', onGameStart);
    socketClient.socket.on('game-state', onGameState);
    socketClient.socket.on('game-over', onGameOver);
    socketClient.socket.on('player-left', onPlayerLeft);
    socketClient.socket.on('character-selected', onCharacterSelected);
    socketClient.socket.on('both-ready', onBothReady);

    return () => {
      socketClient.socket.off('room-created', onRoomCreated);
      socketClient.socket.off('room-joined', onRoomJoined);
      socketClient.socket.off('room-error', onRoomError);
      socketClient.socket.off('game-start', onGameStart);
      socketClient.socket.off('game-state', onGameState);
      socketClient.socket.off('game-over', onGameOver);
      socketClient.socket.off('player-left', onPlayerLeft);
      socketClient.socket.off('character-selected', onCharacterSelected);
      socketClient.socket.off('both-ready', onBothReady);
      socketClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !myPlayerId) {
      return;
    }

    sceneRef.current?.cleanup();
    sceneRef.current = new GameScene(canvasRef.current, myPlayerId);

    return () => {
      sceneRef.current?.cleanup();
      sceneRef.current = null;
    };
  }, [myPlayerId]);

  useEffect(() => {
    if (!gameState || !sceneRef.current) {
      return;
    }

    sceneRef.current.updateState(gameState);
  }, [gameState]);

  useEffect(() => {
    if (phase !== 'playing') {
      input.clear();
      sceneRef.current?.setLocalInput(EMPTY_INPUT);
      return;
    }

    let rafId = 0;

    const frame = () => {
      const frameInput = input.getInput();
      sceneRef.current?.setLocalInput(frameInput);
      socketClient.sendInput(frameInput);
      rafId = requestAnimationFrame(frame);
    };

    frame();

    return () => {
      cancelAnimationFrame(rafId);
      sceneRef.current?.setLocalInput(EMPTY_INPUT);
    };
  }, [input, phase]);

  const createRoom = () => {
    setErrorMessage(null);
    socketClient.createRoom();
  };

  const joinRoom = (incomingRoomCode: string) => {
    setErrorMessage(null);
    socketClient.joinRoom(incomingRoomCode);
  };

  const selectCharacter = (characterId: string) => {
    if (!roomCode) {
      return;
    }

    socketClient.selectCharacter(roomCode, characterId);
    if (myPlayerId) {
      setSelectedCharacterByPlayer((prev) => ({
        ...prev,
        [myPlayerId]: characterId,
      }));
    }
  };

  const playAgain = () => {
    socketClient.playAgain();
  };

  const mySelectedCharacterId = myPlayerId
    ? selectedCharacterByPlayer[myPlayerId]
    : undefined;

  const hasSelectedCharacter = Boolean(mySelectedCharacterId);

  const resultText = useMemo(() => {
    if (!myPlayerId || winnerPlayerId === undefined) {
      return 'Empate!';
    }

    return myPlayerId === winnerPlayerId ? 'Você venceu!' : 'Você perdeu!';
  }, [myPlayerId, winnerPlayerId]);

  return {
    phase,
    roomCode,
    myPlayerId,
    gameState,
    hudPlayers,
    errorMessage,
    mySelectedCharacterId,
    hasSelectedCharacter,
    resultText,
    canvasRef,
    createRoom,
    joinRoom,
    selectCharacter,
    playAgain,
    setErrorMessage,
  };
};

export type { UiPhase };
export { useRinhaApp };
