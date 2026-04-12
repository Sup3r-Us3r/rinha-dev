import { useState } from 'react';
import { soundEffects } from '../../../../utils/sound-effects';

interface UseGameRoomParams {
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onSetErrorMessage: (message: string | null) => void;
}

interface UseGameRoomResult {
  roomCodeInput: string;
  setRoomCodeInput: (roomCode: string) => void;
  handleCreateRoom: () => Promise<void>;
  handleJoinRoom: () => Promise<void>;
}

const useGameRoom = ({
  onCreateRoom,
  onJoinRoom,
  onSetErrorMessage,
}: UseGameRoomParams): UseGameRoomResult => {
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const handleCreateRoom = async () => {
    await soundEffects.unlock();
    onSetErrorMessage(null);
    onCreateRoom();
  };

  const handleJoinRoom = async () => {
    const sanitizedRoomCode = roomCodeInput.trim();

    if (!sanitizedRoomCode) {
      onSetErrorMessage('Informe o código da sala.');
      return;
    }

    await soundEffects.unlock();
    onSetErrorMessage(null);
    onJoinRoom(sanitizedRoomCode);
  };

  return {
    roomCodeInput,
    setRoomCodeInput,
    handleCreateRoom,
    handleJoinRoom,
  };
};

export { useGameRoom };
