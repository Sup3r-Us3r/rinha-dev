import { CHARACTERS } from '../../characters.config';
import { CharacterCard } from './components/character-card';
import { useCharacterSelection } from './hooks/use-character-selection';

interface CharacterSelectionProps {
  roomCode: string;
  errorMessage: string | null;
  mySelectedCharacterId?: string;
  hasSelectedCharacter: boolean;
  onSelectCharacter: (characterId: string) => void;
}

const CharacterSelection = ({
  roomCode,
  errorMessage,
  mySelectedCharacterId,
  hasSelectedCharacter,
  onSelectCharacter,
}: CharacterSelectionProps) => {
  const { copiedRoomCode, handleCharacterSelect, handleCopyRoomCode } =
    useCharacterSelection({
      roomCode,
      onSelectCharacter,
    });

  return (
    <section className="absolute inset-0 z-20 flex flex-col bg-[#0a0a0a]/95 p-6">
      <div className="mb-4 flex items-center justify-center gap-3">
        <span className="rounded-lg border border-white/25 bg-black/60 px-4 py-2 text-sm font-semibold tracking-widest text-white">
          SALA:{' '}
          <strong className="text-yellow-300">{roomCode || '----'}</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            void handleCopyRoomCode();
          }}
          className="rounded-lg border border-yellow-500/70 bg-yellow-500/15 px-3 py-2 text-xs font-bold tracking-wider text-yellow-200 transition hover:bg-yellow-500/25"
        >
          {copiedRoomCode ? 'COPIADO!' : 'COPIAR CÓDIGO'}
        </button>
      </div>

      <h2
        className="mb-8 text-center text-4xl font-black tracking-[0.2em] text-[#FFD700]"
        style={{ textShadow: '0 0 8px rgba(255,0,0,0.75)' }}
      >
        ESCOLHA SEU LUTADOR
      </h2>

      <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-6 md:grid-cols-3">
        {CHARACTERS.map((character) => {
          const selected = mySelectedCharacterId === character.id;

          return (
            <CharacterCard
              key={character.id}
              character={character}
              selected={selected}
              onSelectCharacter={handleCharacterSelect}
            />
          );
        })}
      </div>

      <div className="mt-auto text-center">
        {hasSelectedCharacter ? (
          <p className="text-sm font-semibold text-yellow-200">
            Aguardando o outro jogador escolher...
          </p>
        ) : (
          <p className="text-sm text-slate-300">
            Selecione um personagem para confirmar sua escolha.
          </p>
        )}

        {errorMessage && (
          <p className="mx-auto mt-3 max-w-md rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        )}
      </div>
    </section>
  );
};

export { CharacterSelection };
