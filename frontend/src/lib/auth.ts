const TOKEN_KEY = 'washpos_token';
const ROLE_KEY = 'washpos_role';

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  setCookie(TOKEN_KEY, token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  deleteCookie(TOKEN_KEY);
  deleteCookie(ROLE_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function setUserRole(role: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_KEY, role);
  setCookie(ROLE_KEY, role);
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}
