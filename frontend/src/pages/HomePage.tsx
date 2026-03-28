interface Props {
  onHost: () => void;
  onPlayer: () => void;
}

export default function HomePage({ onHost, onPlayer }: Props) {
  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-8 p-6 overflow-hidden">
      <h1 className="text-5xl font-extrabold text-white tracking-tight">
        Quiz 🎯
      </h1>
      <p className="text-indigo-300">Choisis ton rôle pour commencer</p>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
        <button
          onClick={onHost}
          className="bg-yellow-400 active:bg-yellow-300 text-indigo-900 font-bold text-xl px-8 py-5 rounded-2xl shadow-lg w-full"
        >
          🖥️ Créer une partie
        </button>
        <button
          onClick={onPlayer}
          className="bg-indigo-500 active:bg-indigo-400 text-white font-bold text-xl px-8 py-5 rounded-2xl shadow-lg w-full"
        >
          📱 Rejoindre
        </button>
      </div>
    </div>
  );
}
