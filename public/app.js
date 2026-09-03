'use strict';

const API_BASE = 'https://dentalink-mcp-production-d631.up.railway.app/api/agenda';
const MAX_BOOKING_DAYS = 90;

const state = {
  step: 1,
  professionals: [],
  branches: [],
  selectedProfessional: null,
  selectedBranch: null,
  selectedSlot: null,
  writeEnabled: false,
  busy: false,
};

const el = {
  form: document.getElementById('appointmentForm'),
  professional: document.getElementById('profesional'),
  branch: document.getElementById('sucursal'),
  date: document.getElementById('fecha'),
  slots: document.getElementById('slots'),
  refreshSlots: document.getElementById('refreshSlots'),
  rut: document.getElementById('rut'),
  phone: document.getElementById('telefono'),
  firstName: document.getElementById('nombre'),
  lastName: document.getElementById('apellidos'),
  email: document.getElementById('email'),
  consent: document.getElementById('consent'),
  summary: document.getElementById('summary'),
  status: document.getElementById('statusBox'),
  loading: document.getElementById('loading'),
  loadingText: document.getElementById('loadingText'),
  back: document.getElementById('backBtn'),
  next: document.getElementById('continueBtn'),
};

function setStatus(message = '', kind = 'info') {
  el.status.hidden = !message;
  el.status.className = `status ${kind}`;
  el.status.textContent = message;
}

function setBusy(isBusy, text = 'Procesando…') {
  state.busy = isBusy;
  el.loading.hidden = !isBusy;
  el.loadingText.textContent = text;
  el.next.disabled = isBusy;
  el.back.disabled = isBusy;
  el.refreshSlots.disabled = isBusy;
}

async function api(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      throw new Error('Respuesta inválida del servidor.');
    }

    if (!response.ok) {
      const error = new Error(data.message || 'No fue posible completar la solicitud.');
      error.status = response.status;
      error.code = data.error || 'request_failed';
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('La consulta tardó demasiado. Intenta nuevamente.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function localISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function configureDateRange() {
  const today = new Date();
  const max = new Date(today);
  max.setDate(max.getDate() + MAX_BOOKING_DAYS);
  el.date.min = localISODate(today);
  el.date.max = localISODate(max);
}

function normalizeRut(value) {
  const raw = String(value || '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (raw.length < 2) return raw;
  return `${raw.slice(0, -1)}-${raw.slice(-1)}`;
}

function formatRut(value) {
  const normalized = normalizeRut(value);
  const [body, dv] = normalized.split('-');
  if (!body || !dv) return normalized;
  return `${Number(body).toLocaleString('es-CL')}-${dv}`;
}

function validRut(value) {
  const normalized = normalizeRut(value);
  const [body, dv] = normalized.split('-');
  if (!body || !dv || !/^\d+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const result = 11 - (sum % 11);
  const expected = result === 11 ? '0' : result === 10 ? 'K' : String(result);
  return dv === expected;
}

function option(text, value = '') {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = text;
  return node;
}

function renderProfessionals() {
  el.professional.replaceChildren(option('Selecciona un profesional'));

  for (const professional of state.professionals) {
    const suffix = professional.especialidad ? ` · ${professional.especialidad}` : '';
    el.professional.appendChild(option(`${professional.nombre}${suffix}`, String(professional.id)));
  }

  el.professional.disabled = state.professionals.length === 0;
}

function branchesForProfessional(professional) {
  if (!professional || !Array.isArray(professional.sucursales) || professional.sucursales.length === 0) {
    return [];
  }
  const allowed = new Set(professional.sucursales.map(Number));
  return state.branches.filter((branch) => allowed.has(Number(branch.id)));
}

function branchAllowedForProfessional(professional, branch) {
  if (!professional || !branch) return false;
  return branchesForProfessional(professional).some(
    (allowedBranch) => Number(allowedBranch.id) === Number(branch.id)
  );
}

function renderBranches() {
  const available = branchesForProfessional(state.selectedProfessional);
  el.branch.replaceChildren(option('Selecciona una sucursal'));
  for (const branch of available) {
    const detail = [branch.direccion, branch.ciudad].filter(Boolean).join(', ');
    el.branch.appendChild(option(detail ? `${branch.nombre} · ${detail}` : branch.nombre, String(branch.id)));
  }
  el.branch.disabled = !state.selectedProfessional || available.length === 0;
}

function clearSlots(message = 'Selecciona una fecha para consultar la agenda.') {
  state.selectedSlot = null;
  el.slots.replaceChildren();
  const p = document.createElement('p');
  p.className = 'muted';
  p.textContent = message;
  el.slots.appendChild(p);
}

function renderSlots(slots) {
  state.selectedSlot = null;
  el.slots.replaceChildren();

  if (!Array.isArray(slots) || slots.length === 0) {
    clearSlots('No hay horarios disponibles para esa fecha. Prueba con otro día.');
    return;
  }

  for (const slot of slots) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'slot';
    button.textContent = slot.hora;
    button.dataset.hora = slot.hora;
    button.addEventListener('click', () => {
      document.querySelectorAll('.slot').forEach((node) => node.classList.remove('selected'));
      button.classList.add('selected');
      state.selectedSlot = {
        hora: slot.hora,
        duracion: Number(slot.duracion),
        sillonId: Number(slot.id_sillon),
      };
      setStatus('');
    });
    el.slots.appendChild(button);
  }
}

function renderStep() {
  document.querySelectorAll('[data-panel]').forEach((panel) => {
    panel.classList.toggle('active', Number(panel.dataset.panel) === state.step);
  });

  document.querySelectorAll('[data-step-indicator]').forEach((indicator) => {
    const number = Number(indicator.dataset.stepIndicator);
    indicator.classList.toggle('active', number === state.step);
    indicator.classList.toggle('done', number < state.step);
    if (number === state.step) indicator.setAttribute('aria-current', 'step');
    else indicator.removeAttribute('aria-current');
  });

  el.back.hidden = state.step === 1;
  el.next.textContent = state.step === 3 ? 'Confirmar reserva' : 'Continuar';

  if (state.step === 3) renderSummary();
}

function renderSummary() {
  const professional = state.selectedProfessional?.nombre || '—';
  const branch = state.selectedBranch?.nombre || '—';
  const date = el.date.value || '—';
  const time = state.selectedSlot?.hora || '—';

  el.summary.textContent = `Profesional: ${professional} · Sucursal: ${branch} · Fecha: ${date} · Hora: ${time}`;
}

async function loadBootstrap() {
  setBusy(true, 'Cargando agenda…');
  setStatus('');

  try {
    const data = await api('/bootstrap', { method: 'GET' });
    state.professionals = Array.isArray(data.profesionales) ? data.profesionales : [];
    state.branches = Array.isArray(data.sucursales) ? data.sucursales : [];
    state.writeEnabled = data.booking_write_enabled === true;

    renderProfessionals();
    renderBranches();

    if (!state.professionals.length || !state.branches.length) {
      setStatus('La agenda no está disponible en este momento.', 'error');
    } else if (!state.writeEnabled) {
      setStatus('Puedes consultar disponibilidad. La confirmación online está temporalmente en mantención.', 'info');
    }
  } catch (error) {
    el.professional.replaceChildren(option('Agenda no disponible'));
    el.professional.disabled = true;
    el.branch.replaceChildren(option('Agenda no disponible'));
    el.branch.disabled = true;
    setStatus(error.message || 'No fue posible conectar con la agenda.', 'error');
  } finally {
    setBusy(false);
  }
}

async function loadSlots() {
  if (!state.selectedProfessional || !state.selectedBranch || !el.date.value) {
    clearSlots();
    return;
  }

  if (!branchAllowedForProfessional(state.selectedProfessional, state.selectedBranch)) {
    state.selectedBranch = null;
    el.branch.value = '';
    clearSlots('Selecciona una sucursal válida para el profesional.');
    setStatus('La sucursal seleccionada no corresponde a ese profesional.', 'error');
    return;
  }

  setBusy(true, 'Consultando disponibilidad real…');
  setStatus('');
  clearSlots('Consultando agenda…');

  try {
    const data = await api('/disponibilidad', {
      method: 'POST',
      body: JSON.stringify({
        dentistaId: Number(state.selectedProfessional.id),
        sucursalId: Number(state.selectedBranch.id),
        fecha: el.date.value,
      }),
    });

    renderSlots(data.horarios || []);
  } catch (error) {
    clearSlots('No fue posible obtener los horarios.');
    setStatus(error.message || 'Error al consultar disponibilidad.', 'error');
  } finally {
    setBusy(false);
  }
}

function validateStepOne() {
  if (!state.selectedProfessional || !state.selectedBranch) {
    setStatus('Selecciona un profesional y una sucursal.', 'error');
    return false;
  }
  if (!branchAllowedForProfessional(state.selectedProfessional, state.selectedBranch)) {
    state.selectedBranch = null;
    el.branch.value = '';
    clearSlots();
    setStatus('La sucursal seleccionada no corresponde a ese profesional.', 'error');
    return false;
  }
  return true;
}

function validateStepTwo() {
  if (!el.date.value) {
    setStatus('Selecciona una fecha.', 'error');
    return false;
  }
  if (!state.selectedSlot) {
    setStatus('Selecciona uno de los horarios disponibles.', 'error');
    return false;
  }
  return true;
}

function validateStepThree() {
  if (!validRut(el.rut.value)) {
    setStatus('Ingresa un RUT chileno válido.', 'error');
    el.rut.focus();
    return false;
  }
  if (el.firstName.value.trim().length < 2 || el.lastName.value.trim().length < 2) {
    setStatus('Completa nombre y apellidos.', 'error');
    return false;
  }
  if (!el.email.validity.valid || !el.email.value.trim()) {
    setStatus('Ingresa un correo electrónico válido.', 'error');
    el.email.focus();
    return false;
  }
  const phoneDigits = el.phone.value.replace(/\D/g, '');
  if (phoneDigits.length < 8 || phoneDigits.length > 15) {
    setStatus('Ingresa un teléfono válido.', 'error');
    el.phone.focus();
    return false;
  }
  if (!el.consent.checked) {
    setStatus('Debes confirmar que los datos de la reserva son correctos.', 'error');
    return false;
  }
  return true;
}

async function book() {
  if (!validateStepThree()) return;

  if (!branchAllowedForProfessional(state.selectedProfessional, state.selectedBranch)) {
    state.step = 1;
    state.selectedBranch = null;
    el.branch.value = '';
    clearSlots();
    renderStep();
    setStatus('La relación profesional-sucursal cambió. Selecciona nuevamente.', 'error');
    return;
  }

  if (!state.writeEnabled) {
    setStatus('La confirmación online está temporalmente en mantención. No se ha creado ninguna cita.', 'info');
    return;
  }

  setBusy(true, 'Confirmando horario y creando la cita…');
  setStatus('');

  try {
    const result = await api('/reservar', {
      method: 'POST',
      body: JSON.stringify({
        dentistaId: Number(state.selectedProfessional.id),
        sucursalId: Number(state.selectedBranch.id),
        especialidadId: state.selectedProfessional.especialidad_id
          ? Number(state.selectedProfessional.especialidad_id)
          : undefined,
        sillonId: Number(state.selectedSlot.sillonId),
        duracion: Number(state.selectedSlot.duracion),
        fecha: el.date.value,
        hora: state.selectedSlot.hora,
        rut: normalizeRut(el.rut.value),
        nombre: el.firstName.value.trim(),
        apellidos: el.lastName.value.trim(),
        email: el.email.value.trim().toLowerCase(),
        telefono: el.phone.value.trim(),
      }),
    });

    setStatus(
      `Cita reservada correctamente para el ${result.fecha} a las ${result.hora}.`,
      'success'
    );
    el.form.reset();
    state.selectedProfessional = null;
    state.selectedBranch = null;
    state.selectedSlot = null;
    state.step = 1;
    renderProfessionals();
    renderBranches();
    clearSlots();
    configureDateRange();
    renderStep();
  } catch (error) {
    if (error.status === 409) {
      setStatus('Ese horario acaba de dejar de estar disponible. Actualiza la agenda y selecciona otro.', 'error');
      state.step = 2;
      renderStep();
      await loadSlots();
      return;
    }
    if (error.code === 'booking_write_disabled') {
      state.writeEnabled = false;
    }
    setStatus(error.message || 'No fue posible confirmar la reserva.', 'error');
  } finally {
    setBusy(false);
  }
}

el.professional.addEventListener('change', () => {
  state.selectedProfessional =
    state.professionals.find((item) => String(item.id) === el.professional.value) || null;
  state.selectedBranch = null;
  el.branch.value = '';
  el.date.value = '';
  renderBranches();
  clearSlots();
  setStatus('');
});

el.branch.addEventListener('change', () => {
  const candidate =
    state.branches.find((item) => String(item.id) === el.branch.value) || null;
  state.selectedBranch = branchAllowedForProfessional(state.selectedProfessional, candidate)
    ? candidate
    : null;
  if (!state.selectedBranch) el.branch.value = '';
  el.date.value = '';
  clearSlots();
  setStatus('');
});

el.date.addEventListener('change', loadSlots);
el.refreshSlots.addEventListener('click', loadSlots);

el.rut.addEventListener('blur', () => {
  if (el.rut.value.trim()) el.rut.value = formatRut(el.rut.value);
});

el.back.addEventListener('click', () => {
  if (state.busy || state.step <= 1) return;
  state.step -= 1;
  setStatus('');
  renderStep();
});

el.next.addEventListener('click', async () => {
  if (state.busy) return;

  if (state.step === 1) {
    if (!validateStepOne()) return;
    state.step = 2;
    setStatus('');
    renderStep();
    return;
  }

  if (state.step === 2) {
    if (!validateStepTwo()) return;
    state.step = 3;
    setStatus('');
    renderStep();
    return;
  }

  await book();
});

configureDateRange();
renderStep();
clearSlots();
loadBootstrap();
