import { useRef, useState } from 'react';
import { soundEffects } from '../../../../utils/sound-effects';

interface UseCharacterSelectionParams {
  roomCode: string;
  onSelectCharacter: (characterId: string) => void;
}

interface UseCharacterSelectionResult {
  copiedRoomCode: boolean;
  handleConfirmCharacterSelection: (characterId: string) => void;
  handleCopyRoomCode: () => Promise<void>;
}

const useCharacterSelection = ({
  roomCode,
  onSelectCharacter,
}: UseCharacterSelectionParams): UseCharacterSelectionResult => {
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleConfirmCharacterSelection = (characterId: string) => {
    if (!roomCode) {
      return;
    }

    void soundEffects.unlock();
    onSelectCharacter(characterId);
  };

  const handleCopyRoomCode = async () => {
    if (!roomCode) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedRoomCode(true);
      timeoutRef.current = window.setTimeout(() => {
        setCopiedRoomCode(false);
      }, 1500);
    } catch {
      setCopiedRoomCode(false);
    }
  };

  return {
    copiedRoomCode,
    handleConfirmCharacterSelection,
    handleCopyRoomCode,
  };
};

export { useCharacterSelection };
