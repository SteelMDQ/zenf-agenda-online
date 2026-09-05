'use strict';

(() => {
  const ATTR_KEY = 'zenf_attribution_v1';
  const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  const DROP_QUERY_KEYS = new Set([
    'motivo','rut','nombre','apellidos','email','correo','telefono','phone',
    'diagnostico','diagnóstico','tratamiento','procedimiento','paciente'
  ]);
  const emitted = new Set();

  function cleanValue(value) {
    return String(value || '')
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .slice(0, 120);
  }

  function scrubSensitiveQuery() {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of [...url.searchParams.keys()]) {
      if (DROP_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }

  function readAttributionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const attribution = {};
    for (const key of UTM_KEYS) {
      const value = cleanValue(params.get(key));
      if (value) attribution[key] = value;
    }
    return attribution;
  }

  function loadAttribution() {
    try {
      const raw = sessionStorage.getItem(ATTR_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveAttribution(attribution) {
    try {
      if (Object.keys(attribution).length) {
        sessionStorage.setItem(ATTR_KEY, JSON.stringify(attribution));
      }
    } catch {
      // La agenda debe seguir funcionando aunque el navegador bloquee sessionStorage.
    }
  }

  function currentAttribution() {
    return loadAttribution();
  }

  function emit(name, extra = {}) {
    const safeName = cleanValue(name);
    if (!safeName) return;

    const detail = Object.freeze({
      event: safeName,
      timestamp: new Date().toISOString(),
      attribution: currentAttribution(),
      ...extra
    });

    window.dispatchEvent(new CustomEvent('zenf:tracking', { detail }));

    // dataLayer por sí solo no transmite información. Si en el futuro se conecta
    // un gestor de etiquetas, recibirá únicamente estos eventos sin PII clínica.
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: safeName, zenf: detail });
    }
  }

  function emitOnce(name, extra = {}) {
    if (emitted.has(name)) return;
    emitted.add(name);
    emit(name, extra);
  }

  function activeStep() {
    const panel = document.querySelector('[data-panel].active');
    return panel ? Number(panel.dataset.panel) : null;
  }

  scrubSensitiveQuery();
  const urlAttribution = readAttributionFromUrl();
  if (Object.keys(urlAttribution).length) saveAttribution(urlAttribution);

  window.ZENFTracking = Object.freeze({
    emit,
    getAttribution: () => ({ ...currentAttribution() })
  });

  document.addEventListener('DOMContentLoaded', () => {
    emitOnce('zenf_agenda_open');

    let previousStep = activeStep();
    const shell = document.querySelector('.shell');
    const form = document.getElementById('appointmentForm');

    document.addEventListener('click', event => {
      const slot = event.target.closest?.('.slot');
      if (slot) emitOnce('zenf_slot_selected');
    });

    const observer = new MutationObserver(() => {
      const step = activeStep();
      if (step !== previousStep) {
        if (previousStep === 1 && step === 2) emitOnce('zenf_booking_start');
        previousStep = step;
      }

      const completed = shell?.classList.contains('completed') === true;
      const success = document.getElementById('statusBox')?.classList.contains('success') === true;
      if (completed && success && !emitted.has('zenf_booking_complete')) {
        emitOnce('zenf_booking_complete');
        try { sessionStorage.removeItem(ATTR_KEY); } catch {}
      }
    });

    if (form) observer.observe(form, { subtree: true, attributes: true, attributeFilter: ['class'] });
    if (shell) observer.observe(shell, { attributes: true, attributeFilter: ['class'] });
    const status = document.getElementById('statusBox');
    if (status) observer.observe(status, { attributes: true, attributeFilter: ['class','hidden'] });
  });
})();
