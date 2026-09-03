// Configuración de conexión a Supabase y protección de acceso.
// Estos valores son reemplazados automáticamente en el despliegue por el
// workflow de GitHub Actions (.github/workflows/deploy.yml) usando los
// secretos del repositorio: SUPABASE_URL, SUPABASE_ANON_KEY y LOGIN_PASSWORD.
// Para desarrollo local, reemplázalos temporalmente aquí sin hacer commit.
export const SUPABASE_URL = '__SUPABASE_URL__';
export const SUPABASE_ANON_KEY = '__SUPABASE_ANON_KEY__';
export const LOGIN_PASSWORD_HASH = '__LOGIN_PASSWORD_HASH__';
