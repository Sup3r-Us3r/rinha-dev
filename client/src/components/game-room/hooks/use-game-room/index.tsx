import { useState } from 'react';

interface UseGameRoomParams {
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onSetErrorMessage: (message: string | null) => void;
}

interface UseGameRoomResult {
  roomCodeInput: string;
  setRoomCodeInput: (roomCode: string) => void;
  handleCreateRoom: () => void;
  handleJoinRoom: () => void;
}

const useGameRoom = ({
  onCreateRoom,
  onJoinRoom,
  onSetErrorMessage,
}: UseGameRoomParams): UseGameRoomResult => {
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const handleCreateRoom = () => {
    onSetErrorMessage(null);
    onCreateRoom();
  };

  const handleJoinRoom = () => {
    const sanitizedRoomCode = roomCodeInput.trim();

    if (!sanitizedRoomCode) {
      onSetErrorMessage('Informe o código da sala.');
      return;
    }

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
