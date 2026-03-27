import { config } from "../config";

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(err.error ?? "Erreur inconnue");
  }
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${config.apiUrl}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur réseau" }));
    throw new Error(err.error ?? "Erreur inconnue");
  }
  return res.json() as Promise<T>;
}
