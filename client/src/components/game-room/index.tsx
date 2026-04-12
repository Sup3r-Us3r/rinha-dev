import { useGameRoom } from './hooks/use-game-room';
import { cn } from '../../lib/tailwindcss';

interface GameRoomProps {
  errorMessage: string | null;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onSetErrorMessage: (message: string | null) => void;
}

const GameRoom = ({
  errorMessage,
  onCreateRoom,
  onJoinRoom,
  onSetErrorMessage,
}: GameRoomProps) => {
  const { roomCodeInput, setRoomCodeInput, handleCreateRoom, handleJoinRoom } =
    useGameRoom({
      onCreateRoom,
      onJoinRoom,
      onSetErrorMessage,
    });

  return (
    <section
      className={cn(
        "font-['Pixelify_Sans'] absolute inset-0 z-30",
        'flex items-center justify-center overflow-hidden',
        'bg-slate-950 p-6 text-slate-50',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0',
          'bg-[repeating-linear-gradient(to_bottom,rgba(248,250,252,0.05)_0,rgba(248,250,252,0.05)_1px,transparent_1px,transparent_2px)]',
          'opacity-70',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-28',
          'bg-linear-to-t from-slate-950 via-slate-900/70 to-transparent',
        )}
      />

      <div
        className={cn(
          'relative w-full max-w-xl border-2 border-amber-400',
          'bg-slate-900/90 p-6 sm:p-8',
          'shadow-[0_0_0_2px_#ef4444,0_0_24px_rgba(251,191,36,0.35)] backdrop-blur-sm',
        )}
      >
        <p
          className={cn(
            'mb-5 text-center',
            'text-sm tracking-widest text-amber-300',
            'animate-pulse',
          )}
        >
          INSERT COIN
        </p>

        <div className="mb-4 flex items-center justify-center gap-3 text-center">
          <span aria-hidden className="text-base text-amber-400">
            ⚔️
          </span>
          <h1 className="text-xl uppercase leading-relaxed text-amber-300 [text-shadow:0_0_0.125rem_#f97316,0_0_0.5rem_#f59e0b,0_0_0.875rem_#ef4444] animate-pulse sm:text-2xl">
            RINHA ARENA 1v1
          </h1>
          <span aria-hidden className="text-base text-red-500">
            🥊
          </span>
        </div>

        <p
          className={cn(
            'text-center leading-relaxed',
            'text-sm tracking-wide text-slate-400',
          )}
        >
          Crie uma sala ou entre com um código para lutar em tempo real.
        </p>
        <p
          className={cn(
            'mt-3 text-center',
            'text-sm tracking-wide text-cyan-400',
            'animate-pulse',
          )}
        >
          PLAYER 1 VS PLAYER 2
        </p>

        <div
          className={cn(
            'my-5 h-px w-full',
            'bg-linear-to-r from-transparent via-cyan-400 to-transparent',
          )}
        />

        <button
          type="button"
          onClick={() => {
            void handleCreateRoom();
          }}
          className={cn(
            'mb-5 w-full border border-emerald-300 px-4 py-3',
            'bg-linear-to-b from-emerald-400 to-emerald-600',
            'text-sm uppercase tracking-wide text-slate-950',
            'shadow-[0_0.25rem_0_#166534] transition hover:brightness-110 active:translate-y-1 active:shadow-none cursor-pointer',
          )}
        >
          CRIAR SALA
        </button>

        <div className="space-y-3">
          <label
            className={cn(
              'block uppercase',
              'text-sm tracking-wide text-slate-300',
            )}
            htmlFor="room-code"
          >
            CÓDIGO DA SALA
          </label>
          <input
            id="room-code"
            value={roomCodeInput}
            maxLength={4}
            onChange={(event) => setRoomCodeInput(event.target.value)}
            placeholder="EX: 1234"
            className={cn(
              'w-full border border-cyan-400 bg-slate-950/90 px-4 py-3',
              'text-sm uppercase tracking-wide text-cyan-100',
              'outline-none transition placeholder:text-cyan-300/70',
              'focus:shadow-[0_0_0_0.125rem_rgba(34,211,238,0.35)]',
            )}
          />
          <button
            type="button"
            onClick={() => {
              void handleJoinRoom();
            }}
            className={cn(
              'w-full border border-cyan-300 bg-cyan-500 px-4 py-3',
              'text-sm uppercase tracking-wide text-slate-950',
              'shadow-[0_0.25rem_0_#0369a1] transition hover:brightness-110 active:translate-y-1 active:shadow-none cursor-pointer',
            )}
          >
            ENTRAR NA SALA
          </button>
        </div>

        {errorMessage && (
          <p
            className={cn(
              'mt-4 border border-red-500/70 bg-red-500/20 px-3 py-2',
              'text-sm leading-relaxed tracking-wide text-red-200',
            )}
          >
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
};

export { GameRoom };
