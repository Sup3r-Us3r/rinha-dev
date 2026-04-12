import type { GameState } from '../../../../shared/types';
import type { RefObject } from 'react';
import { GameOverOverlay } from './components/game-over-overlay';
import { HudBar } from './components/hud-bar';
import { RoundTimer } from './components/round-timer';
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

      <header className="pointer-events-none absolute left-0 top-0 z-10 w-full p-4">
        <div className="arcade-scanlines relative mx-auto flex max-w-6xl items-start justify-between gap-4 rounded-lg border border-cyan-300/25 bg-black/25 p-3 backdrop-blur-sm">
          <HudBar
            label="Player 1"
            value={player1Hp}
            align="left"
            characterName={player1Name}
          />

          <RoundTimer timeLeft={timeLeft} roomCode={roomCode} />

          <HudBar
            label="Player 2"
            value={player2Hp}
            align="right"
            characterName={player2Name}
          />
        </div>
      </header>

      {phase === 'gameover' && (
        <GameOverOverlay
          title={resultText}
          subtitle="Clique para começar uma nova rodada com o mesmo oponente."
          onAction={onPlayAgain}
        />
      )}
    </>
  );
};

export { FightStage };
