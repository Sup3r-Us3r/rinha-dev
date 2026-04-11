import { useMemo } from 'react';
import { CHARACTERS } from '../../../../characters.config';
import type { GameState } from '../../../../../../shared/types';
import type { HudPlayers } from '../../../../utils/game-state';

interface UseFightStageParams {
  gameState: GameState | null;
  hudPlayers: HudPlayers;
}

interface UseFightStageResult {
  player1Hp: number;
  player2Hp: number;
  player1Name: string;
  player2Name: string;
  timeLeft: number;
}

const useFightStage = ({
  gameState,
  hudPlayers,
}: UseFightStageParams): UseFightStageResult => {
  return useMemo(() => {
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

    return {
      player1Hp: player1?.hp ?? 100,
      player2Hp: player2?.hp ?? 100,
      player1Name,
      player2Name,
      timeLeft: Math.max(0, Math.ceil(gameState?.timeLeft ?? 60)),
    };
  }, [gameState, hudPlayers.player1Id, hudPlayers.player2Id]);
};

export { useFightStage };
