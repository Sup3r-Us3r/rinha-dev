import { useRef, useState } from 'react';

interface UseCharacterSelectionParams {
  roomCode: string;
  onSelectCharacter: (characterId: string) => void;
}

interface UseCharacterSelectionResult {
  copiedRoomCode: boolean;
  handleCharacterSelect: (characterId: string) => void;
  handleCopyRoomCode: () => Promise<void>;
}

const useCharacterSelection = ({
  roomCode,
  onSelectCharacter,
}: UseCharacterSelectionParams): UseCharacterSelectionResult => {
  const [copiedRoomCode, setCopiedRoomCode] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  const handleCharacterSelect = (characterId: string) => {
    if (!roomCode) {
      return;
    }

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
    handleCharacterSelect,
    handleCopyRoomCode,
  };
};

export { useCharacterSelection };
