# Inventario

Aplicación web estática (HTML/CSS/JS, sin build) para registrar productos comprados
y consultar un panel de inventario con precio unitario, precio de venta y margen,
usando [Supabase](https://supabase.com) como base de datos. Se publica en
GitHub Pages mediante un workflow de GitHub Actions que inyecta la configuración
desde los **Secrets** del repositorio.

## Estructura

```
index.html                   Panel de inventario (página por defecto, protegida por login)
registro.html                Formulario para registrar un producto comprado (protegida por login)
carga-masiva.html            Carga masiva de productos vía plantilla de Excel (protegida por login)
login.html                   Página de acceso (contraseña pública del sitio)
assets/css/style.css         Estilos
assets/js/config.js          Placeholders de Supabase y hash de contraseña (se completan en el deploy)
assets/js/supabaseClient.js  Cliente de Supabase
assets/js/utils.js           Formateo de moneda (soles), fechas, helpers y hash SHA-256
assets/js/auth.js            Guardia de autenticación y logout, compartidos por las páginas
assets/js/login.js           Lógica de la página de acceso
assets/js/inventario.js      Lógica del panel de inventario (búsqueda, paginación, edición de precio de venta, borrado)
assets/js/registro.js        Lógica del formulario de registro
assets/js/carga-masiva.js    Lógica de descarga de plantilla y carga masiva desde Excel (usa SheetJS)
sql/schema.sql                Script SQL para crear la tabla en Supabase
.github/workflows/deploy.yml  Workflow que inyecta secretos y despliega a GitHub Pages
```

## 1. Crear el backend en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido de [`sql/schema.sql`](sql/schema.sql).
   Esto crea la tabla `productos`, índices para búsquedas rápidas (soporta miles
   de registros) y políticas de RLS que permiten lectura/escritura/borrado desde
   el frontend público.
3. Ve a **Settings > API** y copia:
   - `Project URL`
   - `anon public key`

## 2. Configurar el repositorio en GitHub

### 2.1 Nombre del repositorio (ruta de la app)

La ruta de un GitHub Pages de proyecto es siempre `https://<usuario>.github.io/<nombre-del-repo>/`.
Para que la app quede en `/inventario_libreria/`, el repositorio debe llamarse
exactamente `inventario_libreria`. Si no se llama así, renómbralo en
**GitHub > Settings > (general, arriba) > Repository name**.

Después de renombrarlo, actualiza el remoto local (ya está hecho en este entorno,
pero por si clonas de nuevo):

```bash
git remote set-url origin https://github.com/<usuario>/inventario_libreria.git
```

### 2.2 Secrets del repositorio

Ve a **Settings > Secrets and variables > Actions > New repository secret** y crea:

| Secret               | Valor                                              |
|----------------------|-----------------------------------------------------|
| `SUPABASE_URL`       | Project URL de Supabase                            |
| `SUPABASE_ANON_KEY`  | anon public key de Supabase                        |
| `LOGIN_PASSWORD`     | Contraseña para acceder al sitio (texto plano)      |

El workflow calcula un **hash SHA-256** de `LOGIN_PASSWORD` en el momento del
deploy y lo inyecta en el sitio; la contraseña en texto plano nunca se sube al
repositorio ni queda visible en el código publicado.

### 2.3 Habilitar GitHub Pages con GitHub Actions

Ve a **Settings > Pages > Build and deployment > Source** y selecciona
**GitHub Actions**.

## 3. Desplegar

Cada `push` a `master`/`main` ejecuta `.github/workflows/deploy.yml`, que:

1. Reemplaza los placeholders `__SUPABASE_URL__`, `__SUPABASE_ANON_KEY__` y
   `__LOGIN_PASSWORD_HASH__` de `assets/js/config.js` con los valores de los
   secrets (la contraseña se reemplaza ya hasheada).
2. Publica el sitio en GitHub Pages, disponible en
   `https://<usuario>.github.io/inventario_libreria/`.

También puede lanzarse manualmente desde **Actions > Deploy a GitHub Pages > Run workflow**.

## 4. Probar en local

Para desarrollo local, completa temporalmente `assets/js/config.js` con las
credenciales reales de Supabase (y opcionalmente un hash de contraseña, o deja
`__LOGIN_PASSWORD_HASH__` para desactivar el login en local). **No hagas commit**
de esos valores.

Al usar módulos ES, el navegador requiere servir los archivos por HTTP (no
`file://`). Cualquier servidor estático funciona, por ejemplo:

```bash
npx serve .
```

y abre `http://localhost:3000`.

## Funcionalidad

### Acceso (`login.html`)

- El sitio es público pero requiere una contraseña (secret `LOGIN_PASSWORD`)
  para entrar. Al validarse, la sesión se guarda en `sessionStorage` (se pide
  de nuevo al cerrar el navegador o al pulsar "Cerrar sesión").
- Si no se configura el secret `LOGIN_PASSWORD`, el sitio queda sin protección
  (útil para desarrollo local).

### Panel de inventario (`index.html`, página por defecto)

- Lista paginada (25 registros por página) de todos los productos comprados,
  ordenados por fecha más reciente. Soporta más de 1000 registros gracias a
  la paginación (`range`) y el conteo exacto (`count: 'exact'`) de Supabase.
- Buscador por **producto** (`DESCRIPCION`), con búsqueda insensible a
  mayúsculas/minúsculas.
- Por cada resultado se muestra:
  - `FECHA`, `CANTIDAD`, `EMPRESA`, `DESCRIPCION`, `PRECIO COMPRA` (tal como
    se registraron).
  - `PRECIO UNITARIO` = `PRECIO COMPRA / CANTIDAD` (calculado).
  - `PRECIO VENTA`: campo editable en la misma tabla; al cambiar el valor se
    guarda automáticamente en Supabase.
  - `MARGEN` = `PRECIO VENTA - PRECIO UNITARIO` (se recalcula al editar el
    precio de venta).
  - `ACCIONES`: botón **"Borrar"** que elimina el producto de Supabase tras
    confirmación.
- Botón **"+ Registrar producto"** que redirige a `registro.html`.

### Registro de productos (`registro.html`)

Formulario con los 5 campos solicitados:

- `FECHA` (fecha de compra): tipo fecha, con **valor automático igual a la
  fecha actual** al cargar la página (editable si se desea corregir).
- `CANTIDAD`: numérico.
- `EMPRESA`: texto.
- `DESCRIPCION` (producto): texto.
- `PRECIO COMPRA`: precio total pagado por la cantidad comprada (decimal).

Al guardar, el formulario se limpia y la fecha vuelve a fijarse en el día
actual para agilizar el registro de múltiples productos.

### Carga masiva (`carga-masiva.html`)

Permite registrar muchos productos a la vez mediante un archivo Excel:

- **Descargar plantilla**: genera un `.xlsx` (con [SheetJS](https://sheetjs.com),
  cargado desde CDN) con las columnas `FECHA`, `CANTIDAD`, `EMPRESA`,
  `DESCRIPCION`, `PRECIO_COMPRA` y `PRECIO_VENTA`, más una fila de ejemplo.
- **Subir Excel**: lee el archivo seleccionado (`.xlsx`/`.xls`), valida cada
  fila (cantidad y precio de compra numéricos, empresa/descripción no vacías,
  fecha opcional con valor por defecto igual al día actual, precio de venta
  opcional) e inserta en Supabase solo las filas válidas, en lotes de hasta
  500 registros.
- Al finalizar muestra un resumen con la cantidad de productos insertados y
  el detalle de los errores por fila (si los hay), sin bloquear la inserción
  del resto de filas válidas.

### Moneda

Todos los montos se muestran en **soles peruanos (PEN)** usando
`Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })`.

## Notas de seguridad

- Las políticas de RLS del script SQL son públicas (cualquier persona con la
  `anon key` puede leer/insertar/actualizar/borrar) porque el frontend no
  implementa autenticación de usuarios individuales, solo una contraseña
  compartida para el sitio.
- La protección por contraseña es una barrera **del lado del cliente**: útil
  para evitar accesos casuales, pero no es equivalente a autenticación real de
  backend. Cualquiera que conozca la contraseña (o intercepte el hash y logre
  invertirlo) puede acceder. Si el inventario contiene información sensible,
  se recomienda migrar a Supabase Auth con políticas de RLS por usuario.
