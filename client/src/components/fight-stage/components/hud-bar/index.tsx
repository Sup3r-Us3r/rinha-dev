import { cn } from '../../../../lib/tailwindcss';

interface HudBarProps {
  label: string;
  value: number;
  align: 'left' | 'right';
  characterName: string;
}

const HudBar = ({ label, value, align, characterName }: HudBarProps) => {
  const hp = Math.max(0, Math.min(100, value));
  const fillTone =
    hp > 60
      ? 'shadow-emerald-300/50'
      : hp > 30
        ? 'shadow-yellow-300/50'
        : 'shadow-red-400/60';

  return (
    <div className={`w-80 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p className="mb-1 font-black uppercase tracking-widest text-cyan-200/90">
        {label}
      </p>

      <div className="relative rounded-md border-2 border-slate-300/70 bg-linear-to-b from-slate-700/95 via-slate-900/95 to-black/95 p-1 shadow-xl shadow-cyan-500/20">
        <div className="pointer-events-none absolute inset-0 rounded-md border border-white/15" />
        <div className="pointer-events-none absolute inset-0 rounded-md bg-linear-to-r from-transparent via-white/10 to-transparent opacity-40" />

        <div
          className={cn(
            'relative h-6 overflow-hidden rounded-sm border border-slate-500/80 bg-slate-950/95',
            align === 'right' && 'flex justify-end',
          )}
        >
          <div
            className={cn(
              'h-full bg-linear-to-r from-emerald-400 via-yellow-300 to-red-500 shadow-lg transition-all duration-150',
              fillTone,
            )}
            style={{ width: `${hp}%` }}
          >
            <div className="h-full w-full bg-linear-to-b from-white/30 via-transparent to-black/20" />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-transparent via-white/5 to-black/30" />
          <div className="pointer-events-none absolute inset-0 animate-arcade-flicker opacity-30" />
        </div>
      </div>

      <p className="mt-1 font-bold uppercase tracking-wider text-slate-100/90">
        {characterName}
      </p>
    </div>
  );
};

export { HudBar };
