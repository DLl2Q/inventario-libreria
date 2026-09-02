-- Esquema para el proyecto de Inventario en Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor

create extension if not exists "pgcrypto";

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  empresa text not null,
  descripcion text not null,
  precio_compra numeric(12, 2) not null check (precio_compra >= 0),
  precio_venta numeric(12, 2) check (precio_venta is null or precio_venta >= 0),
  created_at timestamptz not null default now()
);

-- Índices para soportar búsquedas rápidas con más de 1000 registros
create index if not exists idx_productos_descripcion_lower
  on productos (lower(descripcion));

create index if not exists idx_productos_fecha
  on productos (fecha desc);

-- Row Level Security
alter table productos enable row level security;

-- El frontend es público (GitHub Pages) y usa la clave "anon".
-- Estas políticas permiten lectura/escritura pública sin autenticación.
-- Si se requiere mayor seguridad, reemplazar por políticas basadas en
-- Supabase Auth (auth.uid()) y habilitar login en el frontend.
create policy "Permitir lectura publica" on productos
  for select using (true);

create policy "Permitir insercion publica" on productos
  for insert with check (true);

create policy "Permitir actualizacion publica" on productos
  for update using (true);
