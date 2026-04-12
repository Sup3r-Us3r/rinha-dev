import { useGameRoom } from './hooks/use-game-room';

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
    <section className="absolute inset-0 z-30 flex items-center justify-center bg-slate-900/95 p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900/85 p-6 shadow-2xl backdrop-blur">
        <h1 className="mb-2 text-2xl font-bold">Rinha Arena 1v1</h1>
        <p className="mb-6 text-sm text-slate-300">
          Crie uma sala ou entre com um código para lutar em tempo real.
        </p>

        <button
          type="button"
          onClick={() => {
            void handleCreateRoom();
          }}
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
            onClick={() => {
              void handleJoinRoom();
            }}
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
  );
};

export { GameRoom };
