import { supabase } from './supabaseClient.js';
import { todayISO } from './utils.js';
import { requireAuth, setupLogout } from './auth.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';

await requireAuth();
setupLogout();

const TEMPLATE_HEADERS = ['FECHA', 'CANTIDAD', 'EMPRESA', 'DESCRIPCION', 'PRECIO_COMPRA', 'PRECIO_VENTA'];
const INSERT_CHUNK_SIZE = 500;

const downloadTemplateBtn = document.getElementById('download-template-btn');
const fileInput = document.getElementById('excel-file');
const uploadBtn = document.getElementById('upload-btn');
const message = document.getElementById('upload-message');
const resultsBox = document.getElementById('upload-results');
const summaryEl = document.getElementById('upload-summary');
const errorsList = document.getElementById('upload-errors');

function showMessage(text, type = '') {
  message.textContent = text;
  message.className = type ? `form-message ${type}` : 'form-message';
}

downloadTemplateBtn.addEventListener('click', () => {
  const sample = [TEMPLATE_HEADERS, [todayISO(), 3, 'TaiLoy', 'Cuaderno ATLAS A4', 45.9, '']];
  const worksheet = XLSX.utils.aoa_to_sheet(sample);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 28 }, { wch: 14 }, { wch: 14 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla');
  XLSX.writeFile(workbook, 'plantilla_carga_masiva.xlsx');
});

fileInput.addEventListener('change', () => {
  uploadBtn.disabled = !fileInput.files.length;
  showMessage('');
  resultsBox.hidden = true;
});

function normalizeKey(key) {
  return String(key ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');
}

function rowToMap(row) {
  const map = {};
  for (const [key, value] of Object.entries(row)) {
    map[normalizeKey(key)] = value;
  }
  return map;
}

function parseFecha(raw) {
  if (raw === undefined || raw === null || raw === '') return todayISO();

  if (raw instanceof Date) {
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const text = String(raw).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const dmyMatch = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

function parseRow(row, rowNumber) {
  const map = rowToMap(row);
  const errors = [];

  const fecha = parseFecha(map.FECHA);
  if (fecha === null) {
    errors.push(`Fila ${rowNumber}: la FECHA no tiene un formato válido.`);
  }

  const cantidad = Number(map.CANTIDAD);
  if (!map.CANTIDAD || Number.isNaN(cantidad) || cantidad <= 0) {
    errors.push(`Fila ${rowNumber}: la CANTIDAD debe ser un número mayor a 0.`);
  }

  const empresa = String(map.EMPRESA ?? '').trim();
  if (!empresa) {
    errors.push(`Fila ${rowNumber}: la EMPRESA es obligatoria.`);
  }

  const descripcion = String(map.DESCRIPCION ?? '').trim();
  if (!descripcion) {
    errors.push(`Fila ${rowNumber}: la DESCRIPCION es obligatoria.`);
  }

  const precioCompra = Number(map.PRECIO_COMPRA);
  if (map.PRECIO_COMPRA === undefined || map.PRECIO_COMPRA === '' || Number.isNaN(precioCompra) || precioCompra < 0) {
    errors.push(`Fila ${rowNumber}: el PRECIO_COMPRA debe ser un número mayor o igual a 0.`);
  }

  let precioVenta = null;
  if (map.PRECIO_VENTA !== undefined && map.PRECIO_VENTA !== '') {
    precioVenta = Number(map.PRECIO_VENTA);
    if (Number.isNaN(precioVenta) || precioVenta < 0) {
      errors.push(`Fila ${rowNumber}: el PRECIO_VENTA debe ser un número mayor o igual a 0.`);
    }
  }

  if (errors.length > 0) return { errors };

  return {
    payload: {
      fecha,
      cantidad,
      empresa,
      descripcion,
      precio_compra: precioCompra,
      precio_venta: precioVenta,
    },
  };
}

async function readWorkbook(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function renderResults(insertedCount, errors) {
  resultsBox.hidden = false;
  summaryEl.textContent = `${insertedCount} producto(s) insertado(s) correctamente. ${errors.length} error(es).`;
  errorsList.innerHTML = '';
  errors.forEach((err) => {
    const li = document.createElement('li');
    li.textContent = err;
    errorsList.appendChild(li);
  });
}

uploadBtn.addEventListener('click', async () => {
  const file = fileInput.files[0];
  if (!file) return;

  uploadBtn.disabled = true;
  showMessage('Leyendo archivo...');
  resultsBox.hidden = true;

  let rows;
  try {
    rows = await readWorkbook(file);
  } catch (error) {
    showMessage('No se pudo leer el archivo Excel: ' + error.message, 'error');
    uploadBtn.disabled = false;
    return;
  }

  if (!rows.length) {
    showMessage('El archivo no contiene filas de datos.', 'error');
    uploadBtn.disabled = false;
    return;
  }

  const validPayloads = [];
  const errors = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const result = parseRow(row, rowNumber);
    if (result.errors) {
      errors.push(...result.errors);
    } else {
      validPayloads.push(result.payload);
    }
  });

  let insertedCount = 0;
  showMessage(`Subiendo ${validPayloads.length} producto(s)...`);

  for (let i = 0; i < validPayloads.length; i += INSERT_CHUNK_SIZE) {
    const chunk = validPayloads.slice(i, i + INSERT_CHUNK_SIZE);
    const { error } = await supabase.from('productos').insert(chunk);
    if (error) {
      errors.push(`Filas ${i + 2} a ${i + 1 + chunk.length}: ${error.message}`);
    } else {
      insertedCount += chunk.length;
    }
  }

  showMessage('');
  renderResults(insertedCount, errors);
  fileInput.value = '';
  fileInput.dispatchEvent(new Event('change'));
});
