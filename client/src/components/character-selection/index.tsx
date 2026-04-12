import { useEffect, useState } from 'react';
import { CHARACTERS } from '../../characters.config';
import { CharacterCard } from './components/character-card';
import { useCharacterSelection } from './hooks/use-character-selection';

const PREVIEW_ANIMATIONS = ['idle', 'punch', 'kick'] as const;

interface CharacterSelectionProps {
  roomCode: string;
  errorMessage: string | null;
  mySelectedCharacterId?: string;
  opponentSelectedCharacterId?: string;
  hasSelectedCharacter: boolean;
  isBothPlayersReady: boolean;
  onSelectCharacter: (characterId: string) => void;
}

const CharacterSelection = ({
  roomCode,
  errorMessage,
  mySelectedCharacterId,
  opponentSelectedCharacterId,
  hasSelectedCharacter,
  isBothPlayersReady,
  onSelectCharacter,
}: CharacterSelectionProps) => {
  const {
    copiedRoomCode,
    handleConfirmCharacterSelection,
    handleCopyRoomCode,
  } = useCharacterSelection({
    roomCode,
    onSelectCharacter,
  });

  const [pendingCharacterId, setPendingCharacterId] = useState<
    string | undefined
  >(mySelectedCharacterId);
  const [previewAnimationIndex, setPreviewAnimationIndex] = useState(0);
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);

  useEffect(() => {
    setPendingCharacterId(mySelectedCharacterId);
  }, [mySelectedCharacterId]);

  const mySelectedCharacter = CHARACTERS.find(
    (character) =>
      character.id === (pendingCharacterId ?? mySelectedCharacterId),
  );

  const isPendingDifferent =
    Boolean(pendingCharacterId) && pendingCharacterId !== mySelectedCharacterId;

  useEffect(() => {
    if (!mySelectedCharacter) {
      setPreviewAnimationIndex(0);
      setIsPreviewVisible(true);
      return;
    }

    const intervalId = window.setInterval(() => {
      setIsPreviewVisible(false);

      window.setTimeout(() => {
        setPreviewAnimationIndex(
          (currentIndex) => (currentIndex + 1) % PREVIEW_ANIMATIONS.length,
        );
        setIsPreviewVisible(true);
      }, 180);
    }, 900);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [mySelectedCharacter]);

  const previewAnimation = PREVIEW_ANIMATIONS[previewAnimationIndex];

  return (
    <section className="font-sans absolute inset-0 z-20 h-screen w-full overflow-hidden">
      <img
        src="/arenas/ex-portais.png"
        alt="Arena"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)',
        }}
      />

      <div className="relative z-20 flex h-full flex-row">
        <div className="relative z-20 flex h-full w-3/5 flex-col justify-between border-r-2 border-yellow-400/30 bg-black/40 px-8 py-6">
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div className="border border-yellow-400 bg-gray-950 px-4 py-1 text-xs uppercase tracking-widest">
                <span className="text-slate-400">SALA: </span>
                <span className="font-bold text-yellow-400">
                  {roomCode || '----'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  void handleCopyRoomCode();
                }}
                className="bg-yellow-400 px-4 py-1 text-xs font-bold tracking-widest text-gray-950 uppercase border-2 border-yellow-600 shadow-[0_4px_0_#78350f] transition-transform active:translate-y-1 active:shadow-[0_1px_0_#78350f] cursor-pointer"
              >
                {copiedRoomCode ? 'COPIADO!' : 'COPIAR CÓDIGO'}
              </button>
            </div>

            <h2 className="mb-4 text-center text-xl font-bold tracking-widest text-yellow-400 uppercase drop-shadow-[2px_2px_0_#92400e]">
              <span className="mr-2 text-red-500 animate-pulse">
                &gt;&gt;&gt;
              </span>
              ESCOLHA SEU LUTADOR
            </h2>

            <div className="grid grid-cols-3 gap-6">
              {CHARACTERS.map((character) => {
                const confirmed = mySelectedCharacterId === character.id;
                const highlighted = pendingCharacterId === character.id;
                const opponentSelected =
                  opponentSelectedCharacterId === character.id && !confirmed;

                return (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    highlighted={highlighted}
                    confirmed={confirmed}
                    opponentSelected={opponentSelected}
                    onSelectCharacter={setPendingCharacterId}
                  />
                );
              })}
            </div>
          </div>

          <div className="border-t-2 border-gray-700 pt-3 text-center">
            {!hasSelectedCharacter && (
              <p className="text-xs tracking-widest text-slate-400 uppercase animate-pulse">
                SELECIONE UM PERSONAGEM
              </p>
            )}

            {hasSelectedCharacter && !isBothPlayersReady && (
              <p className="animate-blink text-xs tracking-widest text-yellow-400 uppercase">
                AGUARDANDO OPONENTE...
              </p>
            )}

            {isBothPlayersReady && (
              <p className="animate-blink text-xs tracking-widest text-green-400 uppercase">
                PRONTO! INICIANDO BATALHA...
              </p>
            )}

            {errorMessage && (
              <p className="mt-3 border border-red-700 bg-red-950/30 px-3 py-2 text-xs tracking-wide text-red-300">
                {errorMessage}
              </p>
            )}
          </div>
        </div>

        <div className="relative z-20 flex h-full w-2/5 flex-col items-center justify-end">
          {mySelectedCharacter ? (
            <div className="relative flex flex-1 items-end justify-center">
              <div className="absolute top-8 left-0 right-0 text-center">
                <p className="mb-1 text-center text-xs tracking-widest text-yellow-400 uppercase animate-blink">
                  PLAYER 1
                </p>
                <p className="text-4xl font-bold tracking-widest text-white uppercase drop-shadow-[3px_3px_0_#000]">
                  {mySelectedCharacter.name}
                </p>
              </div>

              <img
                src={`/characters/${mySelectedCharacter.id}-${previewAnimation}.png`}
                alt={mySelectedCharacter.name}
                className={`h-auto w-full max-w-xl animate-float object-contain object-bottom user-select-none pointer-events-none drop-shadow-[0_0_40px_rgba(251,191,36,0.3)] transition-opacity duration-200 ${
                  isPreviewVisible ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          ) : (
            <div className="m-8 flex flex-1 items-center justify-center self-stretch border-2 border-dashed border-gray-700 text-xs tracking-widest text-gray-600 uppercase animate-pulse">
              NENHUM LUTADOR SELECIONADO
            </div>
          )}

          <div className="flex w-full items-center justify-between border-t-2 border-yellow-400/50 bg-black/70 px-6 h-14">
            <p className="text-xs text-slate-400 uppercase tracking-widest">
              {pendingCharacterId
                ? `SELECIONADO: ${
                    CHARACTERS.find(
                      (character) => character.id === pendingCharacterId,
                    )?.name ?? 'LUTADOR'
                  }`
                : 'ESCOLHA UM LUTADOR'}
            </p>

            {pendingCharacterId && (
              <button
                type="button"
                disabled={!isPendingDifferent}
                onClick={() => {
                  handleConfirmCharacterSelection(pendingCharacterId);
                }}
                className="cursor-pointer border-2 border-yellow-600 bg-yellow-400 px-4 py-1 text-xs font-bold tracking-widest text-gray-950 uppercase shadow-[0_4px_0_#78350f] transition-transform active:translate-y-1 active:shadow-[0_1px_0_#78350f] disabled:cursor-not-allowed disabled:border-gray-700 disabled:bg-gray-700 disabled:text-gray-300 disabled:shadow-none disabled:opacity-80"
              >
                {isPendingDifferent ? 'CONFIRMAR' : 'CONFIRMADO'}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export { CharacterSelection };
