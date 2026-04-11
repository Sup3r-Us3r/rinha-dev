import type { GameState } from '../../../shared/types';

interface HudPlayers {
  player1Id?: string;
  player2Id?: string;
}

const getSelectedCharacterByPlayer = (
  state: GameState,
): Record<string, string> => {
  return Object.values(state.players).reduce<Record<string, string>>(
    (acc, player) => {
      if (player.characterId) {
        acc[player.id] = player.characterId;
      }

      return acc;
    },
    {},
  );
};

const resolveHudPlayersFromState = (state: GameState): HudPlayers => {
  const players = Object.values(state.players);

  if (players.length < 2) {
    return {};
  }

  const [leftMost, rightMost] = [...players].sort((a, b) => a.x - b.x);
  return {
    player1Id: leftMost?.id,
    player2Id: rightMost?.id,
  };
};

export type { HudPlayers };
export { getSelectedCharacterByPlayer, resolveHudPlayersFromState };
