import { useState } from "react";
import { loadSettings, saveSettings } from "../types";
import type { AppSettings } from "../types";

interface Props {
  onBack: () => void;
}

export default function SettingsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  function toggle(key: keyof AppSettings) {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveSettings(updated);
  }

  const ROWS: Array<{
    key: keyof AppSettings;
    label: string;
    desc: string;
    emoji: string;
  }> = [
    {
      key: "soundEnabled",
      label: "Sons",
      desc: "Bips de compte à rebours et effets sonores",
      emoji: "🔊",
    },
    {
      key: "vibrationEnabled",
      label: "Vibration",
      desc: "Retour haptique sur mobile",
      emoji: "📳",
    },
  ];

  return (
    <div className="min-h-[100dvh] bg-indigo-900 flex flex-col items-center p-5 gap-6 overflow-y-auto animate-fadeIn">
      {/* Header */}
      <div className="w-full max-w-sm flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="text-indigo-400 hover:text-white font-semibold text-sm transition"
        >
          ← Retour
        </button>
        <h1 className="text-xl font-extrabold text-white">Paramètres</h1>
        <div className="w-16" />
      </div>

      {/* Préférences */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
          Préférences
        </p>
        {ROWS.map(({ key, label, desc, emoji }) => (
          <div
            key={key}
            className="bg-indigo-800 rounded-2xl px-4 py-4 flex items-center gap-3"
          >
            <span className="text-3xl">{emoji}</span>
            <div className="flex-1">
              <p className="text-white font-semibold">{label}</p>
              <p className="text-indigo-400 text-xs">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`w-14 h-7 rounded-full transition-all relative shrink-0 ${settings[key] ? "bg-yellow-400" : "bg-indigo-600"}`}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all ${settings[key] ? "left-7" : "left-0.5"}`}
              />
            </button>
          </div>
        ))}
      </div>

      {/* App info */}
      <div className="w-full max-w-sm bg-indigo-800 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
          À propos
        </p>
        <div className="flex flex-col gap-2 text-sm text-indigo-300">
          <div className="flex justify-between">
            <span>App</span>
            <span className="text-white font-semibold">Quiz Battle</span>
          </div>
          <div className="flex justify-between">
            <span>Mode</span>
            <span className="text-white font-semibold">
              Multijoueur temps réel
            </span>
          </div>
          <div className="flex justify-between">
            <span>Questions</span>
            <span className="text-white font-semibold">
              120+ questions · 10 thèmes
            </span>
          </div>
          <div className="flex justify-between">
            <span>Modes</span>
            <span className="text-white font-semibold">
              Classique · Équipes · Tournoi
            </span>
          </div>
        </div>
      </div>

      {/* Scoring info */}
      <div className="w-full max-w-sm bg-indigo-800 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
          Barème des points
        </p>
        <div className="flex flex-col gap-2 text-sm">
          {[
            { d: "⭐ Facile", pts: "600 – 800" },
            { d: "⭐⭐ Moyen", pts: "1 000 – 1 400" },
            { d: "⭐⭐⭐ Difficile", pts: "1 500 – 2 100" },
            { d: "⭐ Manche parfaite", pts: "+500 bonus" },
          ].map(({ d, pts }) => (
            <div key={d} className="flex justify-between">
              <span className="text-indigo-300">{d}</span>
              <span className="text-yellow-400 font-semibold">{pts} pts</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pouvoirs recap */}
      <div className="w-full max-w-sm bg-indigo-800 rounded-2xl p-4 flex flex-col gap-2">
        <p className="text-indigo-300 text-xs uppercase tracking-widest font-semibold">
          Pouvoirs
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          {[
            { e: "💥", n: "Aveugle", d: "Cache un choix" },
            { e: "❄️", n: "Gèle", d: "Bloque 4s" },
            { e: "🔄", n: "Retourne", d: "Écran inversé" },
            { e: "🔀", n: "Mélange", d: "Choix mélangés" },
            { e: "🛡️", n: "Bouclier", d: "Bloque attaque" },
            { e: "✨", n: "Double", d: "Pts × 2" },
            { e: "🪞", n: "Miroir", d: "Renvoie attaque" },
            { e: "👻", n: "Fantôme", d: "Inciblable" },
          ].map(({ e, n, d }) => (
            <div key={n} className="bg-indigo-700/60 rounded-xl px-3 py-2">
              <p className="text-white font-semibold">
                {e} {n}
              </p>
              <p className="text-indigo-400">{d}</p>
            </div>
          ))}
        </div>
        <p className="text-indigo-500 text-xs text-center mt-1">
          Les pouvoirs s'utilisent entre les questions (écran révélation)
        </p>
      </div>
    </div>
  );
}
