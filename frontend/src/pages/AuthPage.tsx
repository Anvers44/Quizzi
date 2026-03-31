import { useState } from "react";
import { authLogin, authRegister } from "../lib/auth";
import type { AuthUser } from "../lib/auth";

interface Props {
  onAuth: (user: AuthUser) => void;
  onBack: () => void;
}

export default function AuthPage({ onAuth, onBack }: Props) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handle() {
    setError("");
    if (!username.trim()) {
      setError("Pseudo requis");
      return;
    }
    if (!password) {
      setError("Mot de passe requis");
      return;
    }
    setLoading(true);
    try {
      const user =
        tab === "login"
          ? await authLogin(username.trim(), password)
          : await authRegister(username.trim(), password);
      onAuth(user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-[100dvh] bg-indigo-900 flex flex-col items-center justify-center gap-5 p-6 animate-fadeIn">
      <button
        onClick={onBack}
        className="absolute top-4 left-4 text-indigo-400 hover:text-white font-semibold text-sm"
      >
        ← Retour
      </button>

      <div className="text-5xl">🔐</div>
      <h1 className="text-2xl font-extrabold text-white">
        {tab === "login" ? "Connexion" : "Créer un compte"}
      </h1>

      {/* Tabs */}
      <div className="flex bg-indigo-800 rounded-2xl p-1 gap-1 w-full max-w-xs">
        {(["login", "register"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError("");
            }}
            className={`flex-1 py-2 rounded-xl font-bold text-sm transition ${
              tab === t ? "bg-yellow-400 text-indigo-900" : "text-indigo-300"
            }`}
          >
            {t === "login" ? "Connexion" : "Inscription"}
          </button>
        ))}
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
            Pseudo
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={30}
            placeholder="ex: Alice"
            className="bg-indigo-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 placeholder-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handle()}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={50}
            placeholder={tab === "register" ? "min 4 caractères" : "••••••"}
            className="bg-indigo-800 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-yellow-400 placeholder-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handle()}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-900/30 px-4 py-2 rounded-lg text-center">
            {error}
          </p>
        )}

        <button
          onClick={handle}
          disabled={loading}
          className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-indigo-900 font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition active:scale-95 mt-1"
        >
          {loading
            ? "Chargement…"
            : tab === "login"
              ? "Se connecter"
              : "Créer le compte"}
        </button>
      </div>

      <p className="text-indigo-500 text-xs text-center max-w-xs">
        Compte facultatif — tu peux jouer sans compte, mais les stats et le
        classement ne seront pas enregistrés.
      </p>
    </div>
  );
}
