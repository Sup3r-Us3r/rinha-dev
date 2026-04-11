import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { GameScene } from './game/GameScene';
import { socketClient } from './game/SocketClient';
import { useGameInput } from './hooks/useGameInput';
import type {
  GameOverPayload,
  GameState,
  PlayerId,
  PlayerInput,
  RoomCreatedPayload,
  RoomJoinedPayload,
} from '../../shared/types';

type UiPhase = 'menu' | 'waiting' | 'playing' | 'gameover';

const EMPTY_INPUT: PlayerInput = {
  movement: { x: 0, z: 0 },
  actions: { punch: false, kick: false },
};

export const App = () => {
  const [phase, setPhase] = useState<UiPhase>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [myPlayerId, setMyPlayerId] = useState<PlayerId | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [winnerPlayerId, setWinnerPlayerId] = useState<PlayerId | undefined>(
    undefined,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<GameScene | null>(null);
  const input = useGameInput();

  useEffect(() => {
    socketClient.connect();

    const onRoomCreated = (payload: RoomCreatedPayload) => {
      setRoomCode(payload.roomCode);
      setMyPlayerId(payload.playerId);
      setGameState(payload.state);
      setWinnerPlayerId(undefined);
      setErrorMessage(null);
      setPhase(payload.state.status === 'playing' ? 'playing' : 'waiting');
    };

    const onRoomJoined = (payload: RoomJoinedPayload) => {
      setRoomCode(payload.roomCode);
      setMyPlayerId(payload.playerId);
      setGameState(payload.state);
      setWinnerPlayerId(undefined);
      setErrorMessage(null);
      setPhase(payload.state.status === 'playing' ? 'playing' : 'waiting');
    };

    const onRoomError = (message: string) => {
      setErrorMessage(message);
    };

    const onGameStart = (state: GameState) => {
      setGameState(state);
      setWinnerPlayerId(undefined);
      setErrorMessage(null);
      setPhase('playing');
    };

    const onGameState = (state: GameState) => {
      setGameState(state);
      if (state.status === 'playing') {
        setPhase('playing');
      }
    };

    const onGameOver = (payload: GameOverPayload) => {
      setGameState(payload.state);
      setWinnerPlayerId(payload.winnerPlayerId);
      setPhase('gameover');
    };

    const onPlayerLeft = () => {
      setErrorMessage('O outro jogador saiu. Aguardando novo oponente...');
      setPhase('waiting');
    };

    socketClient.socket.on('room-created', onRoomCreated);
    socketClient.socket.on('room-joined', onRoomJoined);
    socketClient.socket.on('room-error', onRoomError);
    socketClient.socket.on('game-start', onGameStart);
    socketClient.socket.on('game-state', onGameState);
    socketClient.socket.on('game-over', onGameOver);
    socketClient.socket.on('player-left', onPlayerLeft);

    return () => {
      socketClient.socket.off('room-created', onRoomCreated);
      socketClient.socket.off('room-joined', onRoomJoined);
      socketClient.socket.off('room-error', onRoomError);
      socketClient.socket.off('game-start', onGameStart);
      socketClient.socket.off('game-state', onGameState);
      socketClient.socket.off('game-over', onGameOver);
      socketClient.socket.off('player-left', onPlayerLeft);
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

    let rafId: number;
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

  const onCreateRoom = () => {
    setErrorMessage(null);
    socketClient.createRoom();
  };

  const onJoinRoom = () => {
    const code = roomCodeInput.trim();
    if (!code) {
      setErrorMessage('Informe o código da sala.');
      return;
    }

    setErrorMessage(null);
    socketClient.joinRoom(code);
  };

  const player1Hp = gameState?.players[1]?.hp ?? 100;
  const player2Hp = gameState?.players[2]?.hp ?? 100;

  const resultText = useMemo(() => {
    if (!myPlayerId || winnerPlayerId === undefined) {
      return 'Empate!';
    }
    return myPlayerId === winnerPlayerId ? 'Você venceu!' : 'Você perdeu!';
  }, [myPlayerId, winnerPlayerId]);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-slate-900 text-white">
      {(phase === 'menu' || !myPlayerId) && (
        <section className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/90 p-6">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/85 p-6 shadow-2xl backdrop-blur">
            <h1 className="mb-2 text-2xl font-bold">Rinha Arena 1v1</h1>
            <p className="mb-6 text-sm text-slate-300">
              Crie uma sala ou entre com um código para lutar em tempo real.
            </p>

            <button
              type="button"
              onClick={onCreateRoom}
              className="mb-6 w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Criar Sala
            </button>

            <div className="space-y-3">
              <label className="text-sm text-slate-300" htmlFor="room-code">
                Código da sala
              </label>
              <input
                id="room-code"
                value={roomCodeInput}
                maxLength={4}
                onChange={(event) => setRoomCodeInput(event.target.value)}
                placeholder="Ex: 1234"
                className="w-full rounded-lg border border-white/15 bg-slate-800 px-4 py-3 outline-none transition focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={onJoinRoom}
                className="w-full rounded-lg bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400"
              >
                Entrar na Sala
              </button>
            </div>

            {errorMessage && (
              <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {errorMessage}
              </p>
            )}
          </div>
        </section>
      )}

      {myPlayerId && (
        <>
          <canvas ref={canvasRef} className="h-full w-full" />

          <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between p-4">
            <HudBar
              label="Jogador 1"
              value={player1Hp}
              color="bg-blue-500"
              align="left"
            />
            <div className="rounded-lg border border-white/20 bg-black/45 px-3 py-1 text-xs font-semibold tracking-widest">
              Sala: {roomCode || '----'}
            </div>
            <HudBar
              label="Jogador 2"
              value={player2Hp}
              color="bg-red-500"
              align="right"
            />
          </header>

          {phase === 'waiting' && (
            <OverlayCard
              title="Aguardando adversário"
              subtitle="Compartilhe o código da sala para iniciar o combate."
            />
          )}

          {phase === 'gameover' && (
            <OverlayCard
              title={resultText}
              subtitle="Clique para começar uma nova rodada com o mesmo oponente."
            >
              <button
                type="button"
                onClick={() => socketClient.playAgain()}
                className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Jogar Novamente
              </button>
            </OverlayCard>
          )}
        </>
      )}
    </main>
  );
};

interface HudBarProps {
  label: string;
  value: number;
  color: string;
  align: 'left' | 'right';
}

function HudBar({ label, value, color, align }: HudBarProps) {
  return (
    <div className={`w-56 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p className="mb-1 text-xs font-semibold text-white/85">{label}</p>
      <div className="h-4 overflow-hidden rounded-full bg-white/20">
        <div
          className={`h-full ${color} transition-all duration-100`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-white/70">
        HP: {Math.max(0, Math.round(value))}
      </p>
    </div>
  );
}

interface OverlayCardProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

function OverlayCard({ title, subtitle, children }: OverlayCardProps) {
  return (
    <section className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 p-6">
      <div className="rounded-2xl border border-white/20 bg-slate-900/85 px-6 py-5 text-center shadow-2xl backdrop-blur-sm">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
