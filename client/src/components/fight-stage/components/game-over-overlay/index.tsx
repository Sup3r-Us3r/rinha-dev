type GameState = 'Você venceu!' | 'Você perdeu!' | 'Empate!';

interface GameOverOverlayProps {
  title: string;
  subtitle: string;
  onAction: () => void;
}

const stateConfig: Record<
  GameState,
  {
    badge: string;
    badgeClass: string;
    titleClass: string;
    borderClass: string;
    dividerClass: string;
    subtitleClass: string;
    buttonLabel: string;
    buttonClass: string;
  }
> = {
  'Você venceu!': {
    badge: 'PERFECT VICTORY',
    badgeClass: 'border-yellow-800 bg-yellow-950 text-yellow-400',
    titleClass: 'text-yellow-400 drop-shadow-[2px_2px_0_#92400e]',
    borderClass: 'border-yellow-400',
    dividerClass: 'from-transparent via-yellow-400 to-transparent',
    subtitleClass: 'text-yellow-700',
    buttonLabel: 'JOGAR NOVAMENTE',
    buttonClass:
      'bg-yellow-600 text-yellow-50 shadow-[0_5px_0_#78350f] hover:bg-yellow-500 active:shadow-[0_2px_0_#78350f] active:translate-y-1',
  },
  'Você perdeu!': {
    badge: 'CONTINUE?',
    badgeClass: 'border-red-900 bg-red-950 text-red-400 animate-pulse',
    titleClass: 'text-red-500 drop-shadow-[2px_2px_0_#7f1d1d]',
    borderClass: 'border-red-600',
    dividerClass: 'from-transparent via-red-600 to-transparent',
    subtitleClass: 'text-red-700',
    buttonLabel: 'TENTAR NOVAMENTE',
    buttonClass:
      'bg-red-700 text-red-50 shadow-[0_5px_0_#7f1d1d] hover:bg-red-600 active:shadow-[0_2px_0_#7f1d1d] active:translate-y-1',
  },
  'Empate!': {
    badge: 'DOUBLE K.O.',
    badgeClass: 'border-slate-600 bg-slate-900 text-slate-400',
    titleClass: 'text-slate-200 drop-shadow-[2px_2px_0_#334155]',
    borderClass: 'border-slate-600',
    dividerClass: 'from-transparent via-slate-600 to-transparent',
    subtitleClass: 'text-slate-500',
    buttonLabel: 'JOGAR NOVAMENTE',
    buttonClass:
      'bg-slate-700 text-slate-100 shadow-[0_5px_0_#1e293b] hover:bg-slate-600 active:shadow-[0_2px_0_#1e293b] active:translate-y-1',
  },
};

const GameOverOverlay = ({
  title,
  subtitle,
  onAction,
}: GameOverOverlayProps) => {
  const config = stateConfig[title];

  return (
    <section className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
      <div
        className={`relative overflow-hidden bg-gray-950 px-9 py-7 text-center border-2 ${config.borderClass}`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.12) 3px, rgba(0,0,0,0.12) 4px)',
          }}
        />

        <span
          className={`mb-3 inline-block border px-3 py-0.5 text-xs uppercase tracking-widest ${config.badgeClass}`}
        >
          {config.badge}
        </span>

        <h2
          className={`text-4xl font-bold uppercase tracking-widest leading-none ${config.titleClass}`}
        >
          {title}
        </h2>

        <div className={`my-3 h-0.5 bg-linear-to-r ${config.dividerClass}`} />

        <p
          className={`mb-5 text-xs uppercase tracking-widest ${config.subtitleClass}`}
        >
          {subtitle}
        </p>

        <button
          onClick={onAction}
          className={`w-full py-3 text-sm font-bold uppercase tracking-widest transition-transform cursor-pointer ${config.buttonClass}`}
        >
          {config.buttonLabel}
        </button>
      </div>
    </section>
  );
};

export { GameOverOverlay };
