import { LOGIN_PASSWORD_HASH } from './config.js';

export const AUTH_STORAGE_KEY = 'inventario_auth';

function isPasswordConfigured() {
  return Boolean(LOGIN_PASSWORD_HASH) && !LOGIN_PASSWORD_HASH.startsWith('__');
}

export async function requireAuth() {
  if (!isPasswordConfigured()) return;

  const stored = sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (stored === LOGIN_PASSWORD_HASH) return;

  const redirectTo = encodeURIComponent(location.pathname.split('/').pop() + location.search);
  location.replace(`login.html?redirect=${redirectTo}`);
  await new Promise(() => {});
}

export function setupLogout() {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;

  if (!isPasswordConfigured()) {
    btn.hidden = true;
    return;
  }

  btn.addEventListener('click', () => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    location.href = 'login.html';
  });
}
