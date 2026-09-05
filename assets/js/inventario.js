import { supabase } from './supabaseClient.js';
import { formatCurrency, formatDate, debounce, escapeHtml } from './utils.js';
import { requireAuth, setupLogout } from './auth.js';

await requireAuth();
setupLogout();

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
    tbody.innerHTML = `<tr><td colspan="9">Error al cargar los datos: ${escapeHtml(error.message)}</td></tr>`;
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
  const ventaInicial = producto.precio_venta != null ? Number(producto.precio_venta) : null;

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${formatDate(producto.fecha)}</td>
    <td class="col-cantidad"></td>
    <td class="col-empresa"></td>
    <td class="col-descripcion"></td>
    <td class="col-compra"></td>
    <td class="col-unitario"></td>
    <td class="col-venta"></td>
    <td class="col-margen"></td>
    <td class="col-acciones"></td>
  `;

  const cantidadCell = tr.querySelector('.col-cantidad');
  const empresaCell = tr.querySelector('.col-empresa');
  const descripcionCell = tr.querySelector('.col-descripcion');
  const compraCell = tr.querySelector('.col-compra');
  const unitarioCell = tr.querySelector('.col-unitario');
  const ventaCell = tr.querySelector('.col-venta');
  const margenCell = tr.querySelector('.col-margen');
  const accionesCell = tr.querySelector('.col-acciones');

  function updateCalculatedCells() {
    const cantidad = Number(producto.cantidad) || 0;
    const precioCompra = Number(producto.precio_compra) || 0;
    const precioUnitario = cantidad > 0 ? precioCompra / cantidad : 0;
    const precioVenta = producto.precio_venta != null ? Number(producto.precio_venta) : null;

    unitarioCell.textContent = formatCurrency(precioUnitario);
    margenCell.textContent = precioVenta != null
      ? formatCurrency(precioVenta - precioUnitario)
      : '-';
  }

  function createEditableInput({ field, type = 'text', value, step, min, className, parseValue, validate, errorMessage }) {
    const input = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (type !== 'textarea') input.type = type;
    input.step = step ?? '';
    input.min = min ?? '';
    input.className = className;
    input.value = value ?? '';
    if (type === 'textarea') input.rows = 2;

    input.addEventListener('change', async () => {
      const rawValue = input.value.trim();
      const parsedValue = parseValue(rawValue);

      if (!validate(parsedValue, rawValue)) {
        alert(errorMessage);
        input.value = producto[field] ?? '';
        return;
      }

      input.disabled = true;
      const { error } = await supabase
        .from('productos')
        .update({ [field]: parsedValue })
        .eq('id', producto.id);
      input.disabled = false;

      if (error) {
        alert(`No se pudo actualizar ${field}: ${error.message}`);
        input.value = producto[field] ?? '';
        return;
      }

      producto[field] = parsedValue;
      updateCalculatedCells();
    });

    return input;
  }

  cantidadCell.appendChild(createEditableInput({
    field: 'cantidad',
    type: 'number',
    value: producto.cantidad,
    step: '0.01',
    min: '0.01',
    className: 'editable-input number-input',
    parseValue: Number,
    validate: (value) => Number.isFinite(value) && value > 0,
    errorMessage: 'La cantidad debe ser un número mayor que 0.',
  }));

  empresaCell.appendChild(createEditableInput({
    field: 'empresa',
    value: producto.empresa,
    className: 'editable-input text-input',
    parseValue: (value) => value,
    validate: (value) => Boolean(value),
    errorMessage: 'La empresa es obligatoria.',
  }));

  descripcionCell.appendChild(createEditableInput({
    field: 'descripcion',
    type: 'textarea',
    value: producto.descripcion,
    className: 'editable-input description-input',
    parseValue: (value) => value,
    validate: (value) => Boolean(value),
    errorMessage: 'La descripción es obligatoria.',
  }));

  compraCell.appendChild(createEditableInput({
    field: 'precio_compra',
    type: 'number',
    value: producto.precio_compra,
    step: '0.01',
    min: '0',
    className: 'editable-input number-input',
    parseValue: Number,
    validate: (value) => Number.isFinite(value) && value >= 0,
    errorMessage: 'El precio de compra debe ser un número mayor o igual a 0.',
  }));

  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.01';
  input.min = '0';
  input.placeholder = '0.00';
  input.className = 'editable-input number-input';
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
    updateCalculatedCells();
  });

  ventaCell.appendChild(input);
  updateCalculatedCells();

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn-danger btn-delete';
  deleteBtn.textContent = 'Borrar';

  deleteBtn.addEventListener('click', async () => {
    const confirmado = confirm(`¿Eliminar "${producto.descripcion}" del inventario?`);
    if (!confirmado) return;

    deleteBtn.disabled = true;
    const { error: deleteError } = await supabase
      .from('productos')
      .delete()
      .eq('id', producto.id);

    if (deleteError) {
      alert('No se pudo eliminar el producto: ' + deleteError.message);
      deleteBtn.disabled = false;
      return;
    }

    tr.remove();
    totalCount = Math.max(0, totalCount - 1);
    updatePagination();
    if (tbody.children.length === 0) {
      loadProductos();
    }
  });

  accionesCell.appendChild(deleteBtn);
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
