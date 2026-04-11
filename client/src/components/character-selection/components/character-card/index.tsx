import type { CharacterOption } from '../../../../characters.config';

interface CharacterCardProps {
  character: CharacterOption;
  selected: boolean;
  onSelectCharacter: (characterId: string) => void;
}

const CharacterCard = ({
  character,
  selected,
  onSelectCharacter,
}: CharacterCardProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelectCharacter(character.id)}
      className={`group relative overflow-hidden rounded-xl border bg-black/55 p-3 text-center transition ${
        selected
          ? 'border-4 border-red-600'
          : 'border-white/15 hover:border-[#FFD700] hover:shadow-[0_0_20px_rgba(255,215,0,0.35)]'
      }`}
    >
      <div className="mx-auto h-40 w-40 overflow-hidden rounded-md bg-black">
        <img
          src={`/characters/${character.id}-idle.png`}
          alt={character.name}
          className="h-full w-full object-cover object-center"
        />
      </div>
      <p className="mt-3 font-bold text-white">{character.name}</p>

      {selected && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-600/35 text-sm font-black tracking-widest text-white">
          ✓ SELECIONADO
        </div>
      )}
    </button>
  );
};

export { CharacterCard };
