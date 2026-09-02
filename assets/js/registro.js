import { supabase } from './supabaseClient.js';
import { todayISO } from './utils.js';

const form = document.getElementById('form-producto');
const fechaInput = document.getElementById('fecha');
const cantidadInput = document.getElementById('cantidad');
const empresaInput = document.getElementById('empresa');
const descripcionInput = document.getElementById('descripcion');
const precioCompraInput = document.getElementById('precio_compra');
const message = document.getElementById('form-message');
const submitBtn = document.getElementById('submit-btn');

function resetFecha() {
  fechaInput.value = todayISO();
}
resetFecha();

function showError(text) {
  message.textContent = text;
  message.className = 'form-message error';
}

function showSuccess(text) {
  message.textContent = text;
  message.className = 'form-message success';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  message.textContent = '';
  message.className = 'form-message';

  const payload = {
    fecha: fechaInput.value || todayISO(),
    cantidad: Number(cantidadInput.value),
    empresa: empresaInput.value.trim(),
    descripcion: descripcionInput.value.trim(),
    precio_compra: Number(precioCompraInput.value),
  };

  if (!payload.cantidad || payload.cantidad <= 0) {
    showError('La cantidad debe ser mayor a 0.');
    return;
  }
  if (!payload.empresa) {
    showError('La empresa es obligatoria.');
    return;
  }
  if (!payload.descripcion) {
    showError('El producto es obligatorio.');
    return;
  }
  if (Number.isNaN(payload.precio_compra) || payload.precio_compra < 0) {
    showError('El precio de compra es obligatorio.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Guardando...';

  const { error } = await supabase.from('productos').insert(payload);

  submitBtn.disabled = false;
  submitBtn.textContent = 'Guardar producto';

  if (error) {
    showError('No se pudo guardar el producto: ' + error.message);
    return;
  }

  showSuccess('Producto registrado correctamente.');
  form.reset();
  resetFecha();
  descripcionInput.focus();
});
