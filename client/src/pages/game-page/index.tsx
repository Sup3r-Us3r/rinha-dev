import { CharacterSelection } from '../../components/character-selection/index';
import { FightStage } from '../../components/fight-stage/index';
import { GameRoom } from '../../components/game-room/index';
import { useRinhaApp } from '../../hooks/use-rinha-app';

const GamePage = () => {
  const {
    phase,
    roomCode,
    myPlayerId,
    gameState,
    hudPlayers,
    errorMessage,
    mySelectedCharacterId,
    opponentSelectedCharacterId,
    hasSelectedCharacter,
    isBothPlayersReady,
    resultText,
    canvasRef,
    createRoom,
    joinRoom,
    selectCharacter,
    playAgain,
    setErrorMessage,
  } = useRinhaApp();

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      {(phase === 'menu' || !myPlayerId) && (
        <GameRoom
          errorMessage={errorMessage}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onSetErrorMessage={setErrorMessage}
        />
      )}

      {myPlayerId && (
        <FightStage
          canvasRef={canvasRef}
          gameState={gameState}
          hudPlayers={hudPlayers}
          phase={phase}
          roomCode={roomCode}
          resultText={resultText}
          onPlayAgain={playAgain}
        />
      )}

      {phase === 'selecting' && myPlayerId && (
        <CharacterSelection
          roomCode={roomCode}
          errorMessage={errorMessage}
          mySelectedCharacterId={mySelectedCharacterId}
          opponentSelectedCharacterId={opponentSelectedCharacterId}
          hasSelectedCharacter={hasSelectedCharacter}
          isBothPlayersReady={isBothPlayersReady}
          onSelectCharacter={selectCharacter}
        />
      )}
    </main>
  );
};

export { GamePage };
