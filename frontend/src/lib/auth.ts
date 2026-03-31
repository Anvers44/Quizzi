import { config } from "../config";

const TOKEN_KEY = "quiz_auth_token";
const USER_KEY = "quiz_auth_user";

export interface AuthUser {
  userId: string;
  username: string;
  token: string;
}

// ─── Storage ─────────────────────────────────────────────────

export function saveAuth(user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, user.token);
  localStorage.setItem(
    USER_KEY,
    JSON.stringify({ userId: user.userId, username: user.username }),
  );
}

export function loadAuth(): AuthUser | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    const { userId, username } = JSON.parse(raw);
    return { userId, username, token };
  } catch {
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ─── Helper sécurisé ─────────────────────────────────────────

async function postJson(path: string, body: object): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Réseau injoignable (backend éteint, CORS bloqué avant réponse, etc.)
    throw new Error(
      "Impossible de joindre le serveur — vérifie que le backend tourne sur le port 4000",
    );
  }

  const text = await res.text();

  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    // Le serveur a renvoyé du HTML ou du texte brut (souvent une erreur nginx/express)
    throw new Error(
      `Réponse invalide du serveur (${res.status}) — réponse non-JSON reçue`,
    );
  }

  if (!res.ok) {
    throw new Error(data.error ?? data.message ?? `Erreur ${res.status}`);
  }

  return data;
}

// ─── API calls ────────────────────────────────────────────────

export async function authRegister(
  username: string,
  password: string,
): Promise<AuthUser> {
  const data = await postJson("/api/auth/register", { username, password });
  const user: AuthUser = {
    userId: data.userId,
    username: data.username,
    token: data.token,
  };
  saveAuth(user);
  return user;
}

export async function authLogin(
  username: string,
  password: string,
): Promise<AuthUser> {
  const data = await postJson("/api/auth/login", { username, password });
  const user: AuthUser = {
    userId: data.userId,
    username: data.username,
    token: data.token,
  };
  saveAuth(user);
  return user;
}

export function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
