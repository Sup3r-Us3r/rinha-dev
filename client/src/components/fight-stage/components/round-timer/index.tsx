interface RoundTimerProps {
  timeLeft: number;
  roomCode: string;
}

const RoundTimer = ({ timeLeft, roomCode }: RoundTimerProps) => {
  return (
    <div className="relative min-w-32 text-center">
      <div className="absolute inset-0 animate-arcade-flicker rounded-md bg-cyan-300/10" />

      <div className="relative rounded-md border-2 border-yellow-300/80 bg-linear-to-b from-slate-900/95 via-black/95 to-slate-950/95 px-4 py-1 shadow-lg shadow-yellow-300/40">
        <span className="font-black tracking-widest text-yellow-300">
          {timeLeft}
        </span>
      </div>

      <div className="mt-2 rounded-md border border-cyan-300/45 bg-black/70 px-3 py-1 font-semibold uppercase tracking-wider text-cyan-100/90">
        Sala {roomCode || '----'}
      </div>
    </div>
  );
};

export { RoundTimer };
