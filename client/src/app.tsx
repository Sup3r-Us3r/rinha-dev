import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CHARACTERS } from './characters.config';
import { GameScene } from './game/GameScene';
import { socketClient } from './game/SocketClient';
import { useGameInput } from './hooks/useGameInput';
import type {
  GameOverPayload,
  GameState,
  PlayerInput,
  RoomCreatedPayload,
  RoomJoinedPayload,
} from '../../shared/types';

type UiPhase = 'menu' | 'selecting' | 'playing' | 'gameover';

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
};

export const App = () => {
  const [phase, setPhase] = useState<UiPhase>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [winnerPlayerId, setWinnerPlayerId] = useState<string | undefined>(
    undefined,
  );
  const [selectedCharacterByPlayer, setSelectedCharacterByPlayer] = useState<
    Record<string, string>
  >({});
  const [hudPlayers, setHudPlayers] = useState<{
    player1Id?: string;
    player2Id?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);

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

      const picked = Object.values(payload.state.players).reduce<
        Record<string, string>
      >((acc, player) => {
        if (player.characterId) {
          acc[player.id] = player.characterId;
        }
        return acc;
      }, {});
      setSelectedCharacterByPlayer(picked);
    };

    const onRoomCreated = (payload: RoomCreatedPayload) =>
      onRoomPayload(payload);
    const onRoomJoined = (payload: RoomJoinedPayload) => onRoomPayload(payload);

    const onRoomError = (message: string) => {
      setErrorMessage(message);
    };

    const onGameStart = (state: GameState) => {
      setGameState(state);
      setWinnerPlayerId(undefined);
      setErrorMessage(null);
      setPhase('playing');
      syncHudPlayers(state);
    };

    const onGameState = (state: GameState) => {
      setGameState(state);

      const picked = Object.values(state.players).reduce<
        Record<string, string>
      >((acc, player) => {
        if (player.characterId) {
          acc[player.id] = player.characterId;
        }
        return acc;
      }, {});
      setSelectedCharacterByPlayer(picked);

      if (state.status === 'playing') {
        setPhase('playing');
        syncHudPlayers(state);
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

    function syncHudPlayers(state: GameState) {
      const players = Object.values(state.players);
      if (players.length < 2) {
        return;
      }

      const [leftMost, rightMost] = [...players].sort((a, b) => a.x - b.x);
      setHudPlayers({
        player1Id: leftMost?.id,
        player2Id: rightMost?.id,
      });
    }

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

  const mySelectedCharacterId = myPlayerId
    ? selectedCharacterByPlayer[myPlayerId]
    : undefined;
  const hasSelectedCharacter = Boolean(mySelectedCharacterId);

  const player1 = hudPlayers.player1Id
    ? gameState?.players[hudPlayers.player1Id]
    : undefined;
  const player2 = hudPlayers.player2Id
    ? gameState?.players[hudPlayers.player2Id]
    : undefined;

  const player1Name =
    CHARACTERS.find((item) => item.id === player1?.characterId)?.name ||
    'Jogador 1';
  const player2Name =
    CHARACTERS.find((item) => item.id === player2?.characterId)?.name ||
    'Jogador 2';

  const resultText = useMemo(() => {
    if (!myPlayerId || winnerPlayerId === undefined) {
      return 'Empate!';
    }

    return myPlayerId === winnerPlayerId ? 'Você venceu!' : 'Você perdeu!';
  }, [myPlayerId, winnerPlayerId]);

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

  const copyRoomCode = async () => {
    if (!roomCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoomCode(true);
      window.setTimeout(() => setCopiedRoomCode(false), 1500);
    } catch {
      setCopiedRoomCode(false);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {(phase === 'menu' || !myPlayerId) && (
        <section className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/95 p-6">
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

      {myPlayerId && <canvas ref={canvasRef} className="h-full w-full" />}

      {myPlayerId && (
        <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between p-4">
          <HudBar
            label="Jogador 1"
            value={player1?.hp ?? 100}
            color="bg-blue-500"
            align="left"
            characterName={player1Name}
          />

          <div className="text-center">
            <div className="rounded-lg border border-white/20 bg-black/45 px-4 py-1 text-lg font-black tracking-widest text-yellow-300">
              {Math.max(0, Math.ceil(gameState?.timeLeft ?? 60))}
            </div>
            <div className="mt-2 rounded-lg border border-white/20 bg-black/45 px-3 py-1 text-xs font-semibold tracking-widest">
              Sala: {roomCode || '----'}
            </div>
          </div>

          <HudBar
            label="Jogador 2"
            value={player2?.hp ?? 100}
            color="bg-red-500"
            align="right"
            characterName={player2Name}
          />
        </header>
      )}

      {phase === 'selecting' && myPlayerId && (
        <section className="absolute inset-0 z-20 flex flex-col bg-[#0a0a0a]/95 p-6">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="rounded-lg border border-white/25 bg-black/60 px-4 py-2 text-sm font-semibold tracking-widest text-white">
              SALA:{' '}
              <strong className="text-yellow-300">{roomCode || '----'}</strong>
            </span>
            <button
              type="button"
              onClick={copyRoomCode}
              className="rounded-lg border border-yellow-500/70 bg-yellow-500/15 px-3 py-2 text-xs font-bold tracking-wider text-yellow-200 transition hover:bg-yellow-500/25"
            >
              {copiedRoomCode ? 'COPIADO!' : 'COPIAR CÓDIGO'}
            </button>
          </div>

          <h2
            className="mb-8 text-center text-4xl font-black tracking-[0.2em] text-[#FFD700]"
            style={{ textShadow: '0 0 8px rgba(255,0,0,0.75)' }}
          >
            ESCOLHA SEU LUTADOR
          </h2>

          <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-6 md:grid-cols-3">
            {CHARACTERS.map((character) => {
              const selected = mySelectedCharacterId === character.id;

              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => selectCharacter(character.id)}
                  className={`group relative overflow-hidden rounded-xl border bg-black/55 p-3 text-center transition ${
                    selected
                      ? 'border-4 border-red-600'
                      : 'border-white/15 hover:border-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.35)]'
                  }`}
                >
                  <div className="mx-auto h-40 w-40 overflow-hidden rounded-md bg-black">
                    <img
                      src={`/characters/${character.id}-idle.png`}
                      alt={character.name}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <p className="mt-3 font-bold text-white">{character.name}</p>

                  {selected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-600/35 text-sm font-black tracking-widest text-white">
                      ✓ SELECIONADO
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto text-center">
            {hasSelectedCharacter ? (
              <p className="text-sm font-semibold text-yellow-200">
                Aguardando o outro jogador escolher...
              </p>
            ) : (
              <p className="text-sm text-slate-300">
                Selecione um personagem para confirmar sua escolha.
              </p>
            )}

            {errorMessage && (
              <p className="mx-auto mt-3 max-w-md rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
                {errorMessage}
              </p>
            )}
          </div>
        </section>
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
    </main>
  );
};

interface HudBarProps {
  label: string;
  value: number;
  color: string;
  align: 'left' | 'right';
  characterName: string;
}

function HudBar({ label, value, color, align, characterName }: HudBarProps) {
  return (
    <div className={`w-56 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p className="mb-1 text-xs font-semibold text-white/85">{label}</p>
      <div className="h-4 overflow-hidden rounded-full bg-white/20">
        <div
          className={`h-full ${color} transition-all duration-100`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] font-semibold text-white/80">
        {characterName}
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
    <section className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-6">
      <div className="rounded-2xl border border-white/20 bg-slate-900/85 px-6 py-5 text-center shadow-2xl backdrop-blur-sm">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
        {children}
      </div>
    </section>
  );
}
