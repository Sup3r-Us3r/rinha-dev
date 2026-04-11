import type { GameState } from '../../../../shared/types';
import type { RefObject } from 'react';
import { GameOverOverlay } from './components/game-over-overlay';
import { HudBar } from './components/hud-bar';
import { useFightStage } from './hooks/use-fight-stage';
import type { UiPhase } from '../../hooks/use-rinha-app';
import type { HudPlayers } from '../../utils/game-state';

interface FightStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  gameState: GameState | null;
  hudPlayers: HudPlayers;
  phase: UiPhase;
  roomCode: string;
  resultText: string;
  onPlayAgain: () => void;
}

const FightStage = ({
  canvasRef,
  gameState,
  hudPlayers,
  phase,
  roomCode,
  resultText,
  onPlayAgain,
}: FightStageProps) => {
  const { player1Hp, player2Hp, player1Name, player2Name, timeLeft } =
    useFightStage({
      gameState,
      hudPlayers,
    });

  return (
    <>
      <canvas ref={canvasRef} className="h-full w-full" />

      <header className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between p-4">
        <HudBar
          label="Jogador 1"
          value={player1Hp}
          color="bg-blue-500"
          align="left"
          characterName={player1Name}
        />

        <div className="text-center">
          <div className="rounded-lg border border-white/20 bg-black/45 px-4 py-1 text-lg font-black tracking-widest text-yellow-300">
            {timeLeft}
          </div>
          <div className="mt-2 rounded-lg border border-white/20 bg-black/45 px-3 py-1 text-xs font-semibold tracking-widest">
            Sala: {roomCode || '----'}
          </div>
        </div>

        <HudBar
          label="Jogador 2"
          value={player2Hp}
          color="bg-red-500"
          align="right"
          characterName={player2Name}
        />
      </header>

      {phase === 'gameover' && (
        <GameOverOverlay
          title={resultText}
          subtitle="Clique para começar uma nova rodada com o mesmo oponente."
        >
          <button
            type="button"
            onClick={onPlayAgain}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Jogar Novamente
          </button>
        </GameOverOverlay>
      )}
    </>
  );
};

export { FightStage };
