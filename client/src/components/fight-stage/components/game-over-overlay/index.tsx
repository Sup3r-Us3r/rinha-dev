import type { ReactNode } from 'react';

interface GameOverOverlayProps {
  title: string;
  subtitle: string;
  children?: ReactNode;
}

const GameOverOverlay = ({
  title,
  subtitle,
  children,
}: GameOverOverlayProps) => {
  return (
    <section className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 p-6">
      <div className="rounded-2xl border border-white/20 bg-slate-900/85 px-6 py-5 text-center shadow-2xl backdrop-blur-sm">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
        {children}
      </div>
    </section>
  );
};

export { GameOverOverlay };
