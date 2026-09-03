import { LOGIN_PASSWORD_HASH } from './config.js';
import { sha256Hex } from './utils.js';
import { AUTH_STORAGE_KEY } from './auth.js';

const form = document.getElementById('login-form');
const passwordInput = document.getElementById('password');
const message = document.getElementById('login-message');
const loginBtn = document.getElementById('login-btn');

function safeRedirect() {
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || 'index.html';
  if (redirect.startsWith('http') || redirect.includes('//') || redirect.includes('..')) {
    return 'index.html';
  }
  return redirect;
}

const redirectTarget = safeRedirect();

if (!LOGIN_PASSWORD_HASH || LOGIN_PASSWORD_HASH.startsWith('__')) {
  location.replace(redirectTarget);
} else if (sessionStorage.getItem(AUTH_STORAGE_KEY) === LOGIN_PASSWORD_HASH) {
  location.replace(redirectTarget);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'form-message';

  loginBtn.disabled = true;
  const hash = await sha256Hex(passwordInput.value);
  loginBtn.disabled = false;

  if (hash === LOGIN_PASSWORD_HASH) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, LOGIN_PASSWORD_HASH);
    location.replace(redirectTarget);
    return;
  }

  message.textContent = 'Contraseña incorrecta.';
  message.className = 'form-message error';
  passwordInput.value = '';
  passwordInput.focus();
});
