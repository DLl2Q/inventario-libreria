# Inventario

Aplicación web estática (HTML/CSS/JS, sin build) para registrar productos comprados
y consultar un panel de inventario con precio unitario, precio de venta y margen,
usando [Supabase](https://supabase.com) como base de datos. Pensada para publicarse
en GitHub Pages.

## Estructura

```
index.html              Panel de inventario (página por defecto)
registro.html            Formulario para registrar un producto comprado
assets/css/style.css     Estilos
assets/js/config.js      Credenciales de Supabase (editar aquí)
assets/js/supabaseClient.js  Cliente de Supabase
assets/js/utils.js       Formateo de moneda (soles), fechas y helpers
assets/js/inventario.js  Lógica del panel de inventario (búsqueda, paginación, edición de precio de venta)
assets/js/registro.js    Lógica del formulario de registro
sql/schema.sql           Script SQL para crear la tabla en Supabase
```

## 1. Crear el backend en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y ejecuta el contenido de [`sql/schema.sql`](sql/schema.sql).
   Esto crea la tabla `productos`, índices para búsquedas rápidas (soporta miles
   de registros) y políticas de RLS que permiten lectura/escritura desde el
   frontend público.
3. Ve a **Settings > API** y copia:
   - `Project URL`
   - `anon public key`

## 2. Configurar el frontend

Edita `assets/js/config.js` y reemplaza los valores:

```js
export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'TU-ANON-KEY';
```

No se necesita ningún paso de build: el proyecto usa el cliente de Supabase
directamente desde un CDN (`esm.sh`) mediante ES Modules.

## 3. Probar en local

Al usar módulos ES, el navegador requiere servir los archivos por HTTP (no
`file://`). Cualquier servidor estático funciona, por ejemplo:

```bash
npx serve .
```

y abre `http://localhost:3000`.

## 4. Publicar en GitHub Pages

1. Sube este proyecto a un repositorio de GitHub.
2. Ve a **Settings > Pages**.
3. En **Source**, selecciona la rama principal (`main`) y la carpeta raíz (`/`).
4. Guarda. GitHub publicará el sitio en `https://<usuario>.github.io/<repositorio>/`.

Como `index.html` es el panel de inventario, esa será la página que se muestra
por defecto.

## Funcionalidad

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

### Moneda

Todos los montos se muestran en **soles peruanos (PEN)** usando
`Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })`.

## Notas de seguridad

Las políticas de RLS del script SQL son públicas (cualquier persona con la
`anon key` puede leer/insertar/actualizar) porque el frontend no implementa
autenticación. Si el inventario contiene información sensible, se recomienda
añadir Supabase Auth y restringir las políticas por usuario antes de exponer
el sitio públicamente.
