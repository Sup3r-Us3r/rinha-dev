import type { CharacterOption } from '../../../../characters.config';

interface CharacterCardProps {
  character: CharacterOption;
  highlighted: boolean;
  confirmed: boolean;
  opponentSelected: boolean;
  onSelectCharacter: (characterId: string) => void;
}

const CharacterCard = ({
  character,
  highlighted,
  confirmed,
  opponentSelected,
  onSelectCharacter,
}: CharacterCardProps) => {
  const isDisabled = opponentSelected;

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => onSelectCharacter(character.id)}
      className={`relative flex cursor-pointer flex-col items-center gap-2 overflow-hidden border-2 bg-black px-2 py-3 text-center transition-all duration-150 ${
        opponentSelected
          ? 'cursor-not-allowed border-red-700 bg-red-950/20 opacity-60'
          : highlighted
            ? 'scale-105 border-yellow-400 bg-yellow-950/30 ring-2 ring-yellow-400 ring-offset-1 ring-offset-black'
            : 'border-gray-700 hover:scale-105 hover:border-yellow-400'
      }`}
    >
      {confirmed && (
        <span className="font-pixel absolute top-1 left-1 bg-yellow-400 px-1.5 text-xs uppercase text-gray-950">
          EU
        </span>
      )}

      {opponentSelected && (
        <span className="font-pixel absolute top-1 left-1 bg-red-600 px-1.5 text-xs uppercase text-white">
          P2
        </span>
      )}

      <img
        src={`/characters/${character.id}-idle.png`}
        alt={character.name}
        className="h-16 w-16 object-contain"
      />
      <p className="font-pixel text-center text-xs uppercase tracking-wide text-slate-300">
        {character.name}
      </p>
    </button>
  );
};

export { CharacterCard };
