interface Props {
  onHost: () => void;
  onPlayer: () => void;
}

export default function HomePage({ onHost, onPlayer }: Props) {
  return (
    <div className="min-h-screen bg-indigo-900 flex flex-col items-center justify-center gap-10 p-6">
      <h1 className="text-5xl font-extrabold text-white tracking-tight">
        Quiz Multijoueur 🎯
      </h1>
      <p className="text-indigo-300">Choisis ton rôle pour commencer</p>

      <div className="flex flex-col sm:flex-row gap-6">
        <button
          onClick={onHost}
          className="bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-bold text-xl px-12 py-5 rounded-2xl shadow-lg transition"
        >
          🖥️ Créer une partie
        </button>
        <button
          onClick={onPlayer}
          className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xl px-12 py-5 rounded-2xl shadow-lg transition"
        >
          📱 Rejoindre
        </button>
      </div>
    </div>
  );
}
