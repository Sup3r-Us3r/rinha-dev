import type { RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  CombatSfxPayload,
  GameOverPayload,
  GameState,
  PlayerInput,
  RoomCreatedPayload,
  RoomJoinedPayload,
} from '../../../../shared/types';
import { GameScene } from '../../game/GameScene';
import { socketClient } from '../../game/SocketClient';
import {
  getSelectedCharacterByPlayer,
  resolveHudPlayersFromState,
  type HudPlayers,
} from '../../utils/game-state';
import { soundEffects } from '../../utils/sound-effects';
import { useGameInput } from '../use-game-input';

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
  opponentSelectedCharacterId?: string;
  hasSelectedCharacter: boolean;
  isBothPlayersReady: boolean;
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
  const myPlayerIdRef = useRef<string | null>(null);
  const previousGameStateRef = useRef<GameState | null>(null);
  const previousPhaseRef = useRef<UiPhase>('menu');
  const input = useGameInput();

  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
  }, [myPlayerId]);

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
      void soundEffects.play('round-1');
    };

    const onGameState = (state: GameState) => {
      setGameState(state);
      setSelectedCharacterByPlayer(getSelectedCharacterByPlayer(state));

      const playerCount = Object.keys(state.players).length;
      if (playerCount >= 2) {
        setErrorMessage(null);
      }

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

    const onCombatSfx = (payload: CombatSfxPayload) => {
      const localPlayerId = myPlayerIdRef.current;
      if (!localPlayerId) {
        return;
      }

      if (payload.kind === 'death') {
        void soundEffects.play('deadth');
        return;
      }

      if (
        payload.kind === 'damage' &&
        payload.targetPlayerId &&
        payload.targetPlayerId !== localPlayerId
      ) {
        void soundEffects.play('damage');
        return;
      }

      if (
        payload.kind === 'attack-missed' &&
        payload.attackerPlayerId === localPlayerId
      ) {
        void soundEffects.play('hit');
      }
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
    socketClient.socket.on('combat-sfx', onCombatSfx);

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
      socketClient.socket.off('combat-sfx', onCombatSfx);
      socketClient.disconnect();
    };
  }, []);

  useEffect(() => {
    if (
      phase === 'selecting' &&
      previousPhaseRef.current !== 'selecting' &&
      myPlayerId
    ) {
      // no-op: character-selection audio removed
    }

    previousPhaseRef.current = phase;
  }, [myPlayerId, phase]);

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

    // detect animation transitions (e.g. jump) to trigger sfx
    const prev = previousGameStateRef.current;
    if (prev) {
      for (const [playerId, player] of Object.entries(gameState.players)) {
        const prevPlayer = prev.players[playerId];
        if (!prevPlayer) continue;

        // play jump sound when animation just changed to 'jump'
        if (player.animation === 'jump' && prevPlayer.animation !== 'jump') {
          void soundEffects.play('jump');
        }
      }
    }

    sceneRef.current.updateState(gameState);

    // store current state for next comparison
    previousGameStateRef.current = gameState;
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

  const opponentPlayerId = myPlayerId
    ? Object.keys(selectedCharacterByPlayer).find(
        (playerId) => playerId !== myPlayerId,
      )
    : undefined;

  const opponentSelectedCharacterId = opponentPlayerId
    ? selectedCharacterByPlayer[opponentPlayerId]
    : undefined;

  const hasSelectedCharacter = Boolean(mySelectedCharacterId);
  const isBothPlayersReady = Boolean(
    mySelectedCharacterId && opponentSelectedCharacterId,
  );

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
    opponentSelectedCharacterId,
    hasSelectedCharacter,
    isBothPlayersReady,
    resultText,
    canvasRef,
    createRoom,
    joinRoom,
    selectCharacter,
    playAgain,
    setErrorMessage,
  };
};

export { useRinhaApp };
export type { UiPhase };
