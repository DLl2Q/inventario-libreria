import { supabase } from './supabaseClient.js';
import { formatCurrency, formatDate, debounce, escapeHtml } from './utils.js';

const PAGE_SIZE = 25;

const searchInput = document.getElementById('search-input');
const tbody = document.getElementById('tabla-body');
const emptyState = document.getElementById('empty-state');
const loadingState = document.getElementById('loading-state');
const pageInfo = document.getElementById('page-info');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const totalInfo = document.getElementById('total-info');

let currentPage = 0;
let currentTerm = '';
let totalCount = 0;

async function loadProductos() {
  loadingState.hidden = false;
  emptyState.hidden = true;
  tbody.innerHTML = '';

  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('productos')
    .select('*', { count: 'exact' })
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (currentTerm) {
    query = query.ilike('descripcion', `%${currentTerm}%`);
  }

  const { data, error, count } = await query;

  loadingState.hidden = true;

  if (error) {
    console.error(error);
    tbody.innerHTML = `<tr><td colspan="8">Error al cargar los datos: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  totalCount = count ?? 0;

  if (!data || data.length === 0) {
    emptyState.hidden = false;
    updatePagination();
    return;
  }

  data.forEach((producto) => renderRow(producto));
  updatePagination();
}

function renderRow(producto) {
  const cantidad = Number(producto.cantidad) || 0;
  const precioCompra = Number(producto.precio_compra) || 0;
  const precioUnitario = cantidad > 0 ? precioCompra / cantidad : 0;
  const ventaInicial = producto.precio_venta != null ? Number(producto.precio_venta) : null;
  const margenInicial = ventaInicial != null ? ventaInicial - precioUnitario : null;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${formatDate(producto.fecha)}</td>
    <td>${cantidad}</td>
    <td>${escapeHtml(producto.empresa)}</td>
    <td>${escapeHtml(producto.descripcion)}</td>
    <td>${formatCurrency(precioCompra)}</td>
    <td>${formatCurrency(precioUnitario)}</td>
    <td class="col-venta"></td>
    <td class="col-margen">${margenInicial != null ? formatCurrency(margenInicial) : '-'}</td>
  `;

  const ventaCell = tr.querySelector('.col-venta');
  const margenCell = tr.querySelector('.col-margen');

  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.01';
  input.min = '0';
  input.placeholder = '0.00';
  input.className = 'venta-input';
  input.value = ventaInicial ?? '';

  input.addEventListener('change', async () => {
    const rawValue = input.value.trim();
    const nuevoValor = rawValue === '' ? null : Number(rawValue);

    if (nuevoValor != null && (Number.isNaN(nuevoValor) || nuevoValor < 0)) {
      alert('El precio de venta debe ser un número válido mayor o igual a 0.');
      input.value = producto.precio_venta ?? '';
      return;
    }

    input.disabled = true;
    const { error } = await supabase
      .from('productos')
      .update({ precio_venta: nuevoValor })
      .eq('id', producto.id);
    input.disabled = false;

    if (error) {
      alert('No se pudo actualizar el precio de venta: ' + error.message);
      input.value = producto.precio_venta ?? '';
      return;
    }

    producto.precio_venta = nuevoValor;
    const nuevoMargen = nuevoValor != null ? nuevoValor - precioUnitario : null;
    margenCell.textContent = nuevoMargen != null ? formatCurrency(nuevoMargen) : '-';
  });

  ventaCell.appendChild(input);
  tbody.appendChild(tr);
}

function updatePagination() {
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  pageInfo.textContent = `Página ${currentPage + 1} de ${totalPages}`;
  totalInfo.textContent = `${totalCount} registro(s)`;
  prevBtn.disabled = currentPage <= 0;
  nextBtn.disabled = currentPage + 1 >= totalPages;
}

prevBtn.addEventListener('click', () => {
  if (currentPage > 0) {
    currentPage -= 1;
    loadProductos();
  }
});

nextBtn.addEventListener('click', () => {
  currentPage += 1;
  loadProductos();
});

searchInput.addEventListener(
  'input',
  debounce((event) => {
    currentTerm = event.target.value.trim();
    currentPage = 0;
    loadProductos();
  }, 350)
);

loadProductos();
