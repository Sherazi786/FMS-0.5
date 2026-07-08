export interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  branchId: number | null;
  branchName?: string | null;
  status?: string;
}

const TOKEN_KEY = "wm_auth_token";
const USER_KEY = "wm_auth_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error("Failed to save token:", e);
  }
}

export function removeToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error("Failed to remove auth:", e);
  }
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const data = window.localStorage.getItem(USER_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== "object" || !parsed.id) return null;
    return parsed as User;
  } catch {
    // Bad JSON — clean up
    try {
      window.localStorage.removeItem(USER_KEY);
    } catch {}
    return null;
  }
}

export function setStoredUser(user: User): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error("Failed to save user:", e);
  }
}

export function isAuthenticated(): boolean {
  return !!(getToken() && getStoredUser());
}

export async function fetchAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Only set content-type when there's a body
  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers, credentials: "include" });
}

export async function apiCall<T = any>(url: string, options: RequestInit = {}): Promise<{ ok: boolean; data: T; status: number }> {
  try {
    const res = await fetchAuth(url, options);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data: data as T, status: res.status };
  } catch (err) {
    console.error("API call failed:", err);
    return { ok: false, data: { error: "Network error" } as any, status: 0 };
  }
}
