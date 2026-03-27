// 0.0.0.0 est une adresse d'écoute serveur, pas une adresse navigateur.
// Si le hostname est 0.0.0.0, on replie sur 127.0.0.1.
const hostname =
  window.location.hostname === "0.0.0.0"
    ? "127.0.0.1"
    : window.location.hostname;

const backendUrl = import.meta.env.VITE_API_URL || `http://${hostname}:4000`;

export const config = {
  apiUrl: backendUrl,
  socketUrl: backendUrl,
} as const;
