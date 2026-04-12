import { useNavigate } from 'react-router-dom';

const IntroPage = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate('/game');
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 h-full w-full object-fill"
        src="/videos/intro.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-black/30" />

      <div className="relative z-10 flex h-full w-full items-end justify-center p-8 md:p-12">
        <button
          type="button"
          className="arcade-start-button"
          onClick={handleStartGame}
        >
          COMEÇAR
        </button>
      </div>
    </main>
  );
};

export { IntroPage };
