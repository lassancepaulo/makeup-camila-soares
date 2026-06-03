/* ============================================================
   MAKEUP CAMILA SOARES — Módulo de Custos
   Deslocamento · Material · Pedágio · Assistente · Outros
   ============================================================ */
'use strict';

const CUSTOS_KEY    = 'camilaCustos';
const STUDIO_KEY    = 'camilaStudioAddress';
const FUEL_PREF_KEY = 'camilaFuelPrefs';

// ── Categorias ─────────────────────────────────────────────
const CUSTO_CAT = {
  deslocamento:   { label: 'Deslocamento',     icon: 'fa-car',        color: '#C9956C' },
  pedagio:        { label: 'Pedágio',          icon: 'fa-road',       color: '#DEB896' },
  material:       { label: 'Material',         icon: 'fa-palette',    color: '#8B4B6B' },
  assistente:     { label: 'Assistente',       icon: 'fa-user-plus',  color: '#A67B5B' },
  estacionamento: { label: 'Estacionamento',   icon: 'fa-parking',    color: '#4B6B8B' },
  alimentacao:    { label: 'Alimentação',      icon: 'fa-utensils',   color: '#6B3553' },
  outros:         { label: 'Outros',           icon: 'fa-box',        color: '#3D2B2B' }
};

const TRANSPORT_OPTS = {
  carro: { label: 'Carro próprio', icon: 'fa-car',        hasFuel: true  },
  moto:  { label: 'Moto própria',  icon: 'fa-motorcycle', hasFuel: true  },
  uber:  { label: 'Uber / 99',     icon: 'fa-taxi',       hasFuel: false },
  taxi:  { label: 'Táxi',          icon: 'fa-taxi',       hasFuel: false },
  nenhum:{ label: 'Sem desloc.',   icon: 'fa-ban',        hasFuel: false }
};

// ── Storage ────────────────────────────────────────────────
function getCustos_all() {
  try { return JSON.parse(localStorage.getItem(CUSTOS_KEY) || '[]'); }
  catch { return []; }
}
function setCustos_all(data) {
  localStorage.setItem(CUSTOS_KEY, JSON.stringify(data));
  DB.sync('camilaCustos', data);
}

function custos_save(custo) {
  const all = getCustos_all();
  const idx = all.findIndex(c => c.id === custo.id);
  if (idx >= 0) all[idx] = custo;
  else all.unshift(custo);
  setCustos_all(all);
}

function custos_delete(id) {
  setCustos_all(getCustos_all().filter(c => c.id !== id));
}

function custos_byBooking(bookingId) {
  return getCustos_all().filter(c => c.bookingId === bookingId);
}

function custos_totalByBooking(bookingId) {
  return custos_byBooking(bookingId).reduce((s, c) => s + (c.amount || 0), 0);
}

function custos_byYear(year) {
  return getCustos_all().filter(c => c.date && new Date(c.date).getFullYear() === year);
}

function custos_totalByYear(year) {
  return custos_byYear(year).reduce((s, c) => s + (c.amount || 0), 0);
}

function custos_monthly(year) {
  const months = Array(12).fill(0);
  custos_byYear(year).forEach(c => {
    const m = new Date(c.date).getMonth();
    months[m] += c.amount || 0;
  });
  return months;
}

function custos_byCategory(year) {
  const result = {};
  custos_byYear(year).forEach(c => {
    result[c.category] = (result[c.category] || 0) + (c.amount || 0);
  });
  return result;
}

// ── Configurações salvas ───────────────────────────────────
function getStudioAddress() {
  return localStorage.getItem(STUDIO_KEY) || '';
}
function setStudioAddress(addr) {
  localStorage.setItem(STUDIO_KEY, addr.trim());
  DB.setConfig('studioAddress', addr.trim());
}

function getFuelPrefs() {
  try { return JSON.parse(localStorage.getItem(FUEL_PREF_KEY) || '{}'); }
  catch { return {}; }
}
function setFuelPrefs(prefs) {
  localStorage.setItem(FUEL_PREF_KEY, JSON.stringify(prefs));
  DB.setConfig('fuelPrefs', prefs);
}

// ── Cálculo de deslocamento ────────────────────────────────
function calcDeslocamento({ tipo, km, fuelPrice, kmPerLitro, uberCost, pedagio }) {
  let transportCost = 0;
  if (tipo === 'nenhum') {
    return { transport: 0, pedagio: 0, total: 0 };
  }
  if (tipo === 'uber' || tipo === 'taxi') {
    transportCost = parseFloat(uberCost) || 0;
  } else {
    // carro / moto — ida e volta
    const kmF  = parseFloat(km)          || 0;
    const fp   = parseFloat(fuelPrice)   || 0;
    const kpl  = parseFloat(kmPerLitro)  || 10;
    if (kpl > 0) transportCost = kmF * 2 * (fp / kpl);
  }
  const pedagioCost = parseFloat(pedagio) || 0;
  return {
    transport: transportCost,
    pedagio:   pedagioCost,
    total:     transportCost + pedagioCost
  };
}

// ── Google Maps URL ───────────────────────────────────────
function buildMapsUrl(origin, destination) {
  if (!destination) return 'https://maps.google.com';
  const dest = encodeURIComponent(destination);
  if (origin) {
    const orig = encodeURIComponent(origin);
    return `https://www.google.com/maps/dir/${orig}/${dest}`;
  }
  return `https://www.google.com/maps/search/${dest}`;
}

// ── Gerar ID ──────────────────────────────────────────────
function custos_genId() {
  return `COST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Modal state ───────────────────────────────────────────
let _custoBookingId = null;

function openCustoModal(bookingId) {
  _custoBookingId = bookingId;

  // Get booking
  const b = getBookingById ? getBookingById(bookingId) : null;

  // Fill booking info
  const sub = document.getElementById('custoModalSub');
  if (sub && b) {
    const SVCL = typeof BOOK_SERVICE_LABELS !== 'undefined' ? BOOK_SERVICE_LABELS : {};
    sub.textContent = `${b.clientName} · ${SVCL[b.serviceType] || b.serviceType} · ${b.eventDate || ''}`;
  }

  // Pre-fill receita
  if (b) {
    _el('custoReceita').textContent   = typeof formatBRL === 'function' ? formatBRL(b.totalValue || 0) : `R$ ${b.totalValue || 0}`;
  }

  // Pre-fill destination from booking
  const dest = b?.location || '';
  const destInput = _el('custoDestino');
  if (destInput) destInput.value = dest;

  // Pre-fill origin
  const origInput = _el('custoOrigin');
  if (origInput) origInput.value = getStudioAddress();

  // Update Maps link
  updateMapsLink();

  // Load saved costs for this booking
  loadSavedCustos(bookingId);

  // Restore fuel prefs
  const prefs = getFuelPrefs();
  if (prefs.fuelPrice)   _setVal('custoFuelPrice',   prefs.fuelPrice);
  if (prefs.kmPerLitro)  _setVal('custoKmPerLitro',  prefs.kmPerLitro);
  if (prefs.tipo)        _setVal('custoTipoTransporte', prefs.tipo);

  updateTransportFields();
  calcCustoDeslocamento();
  calcCustoTotal();

  _el('custoModal').classList.add('open');
}

function closeCustoModal() {
  _el('custoModal').classList.remove('open');
  _custoBookingId = null;
}

function loadSavedCustos(bookingId) {
  const saved = custos_byBooking(bookingId);
  // Find main cost record (the aggregated one)
  const main = saved.find(c => c.isMain);
  if (!main) return;
  if (main.tipoTransporte) _setVal('custoTipoTransporte', main.tipoTransporte);
  if (main.km !== undefined)          _setVal('custoKm',          main.km);
  if (main.fuelPrice !== undefined)   _setVal('custoFuelPrice',   main.fuelPrice);
  if (main.kmPerLitro !== undefined)  _setVal('custoKmPerLitro',  main.kmPerLitro);
  if (main.uberCost !== undefined)    _setVal('custoUberCost',    main.uberCost);
  if (main.pedagio !== undefined)     _setVal('custoPedagio',     main.pedagio);
  if (main.material !== undefined)    _setVal('custoMaterial',    main.material);
  if (main.materialObs !== undefined) _setVal('custoMaterialObs', main.materialObs);
  if (main.assistente !== undefined)  _setVal('custoAssistente',  main.assistente);
  if (main.estacionamento !== undefined) _setVal('custoEstacionamento', main.estacionamento);
  if (main.alimentacao !== undefined) _setVal('custoAlimentacao', main.alimentacao);
  if (main.outros !== undefined)      _setVal('custoOutros',      main.outros);
  updateTransportFields();
}

function saveCustos() {
  if (!_custoBookingId) return;

  const tipo       = _val('custoTipoTransporte') || 'carro';
  const km         = parseFloat(_val('custoKm'))          || 0;
  const fuelPrice  = parseFloat(_val('custoFuelPrice'))   || 0;
  const kmPerLitro = parseFloat(_val('custoKmPerLitro'))  || 10;
  const uberCost   = parseFloat(_val('custoUberCost'))    || 0;
  const pedagio    = parseFloat(_val('custoPedagio'))     || 0;
  const material   = parseFloat(_val('custoMaterial'))    || 0;
  const assistente = parseFloat(_val('custoAssistente'))  || 0;
  const estac      = parseFloat(_val('custoEstacionamento')) || 0;
  const aliment    = parseFloat(_val('custoAlimentacao')) || 0;
  const outros     = parseFloat(_val('custoOutros'))      || 0;

  const desl = calcDeslocamento({ tipo, km, fuelPrice, kmPerLitro, uberCost, pedagio });
  const totalCusto = desl.total + material + assistente + estac + aliment + outros;

  // Save fuel prefs for next time
  if (tipo === 'carro' || tipo === 'moto') {
    setFuelPrefs({ fuelPrice, kmPerLitro, tipo });
  } else {
    setFuelPrefs({ tipo });
  }

  // Save studio address
  const origin = _val('custoOrigin');
  if (origin) setStudioAddress(origin);

  // Remove old main record
  const all = getCustos_all().filter(c => !(c.bookingId === _custoBookingId && c.isMain));
  setCustos_all(all);

  // Save aggregated record
  const booking = getBookingById ? getBookingById(_custoBookingId) : null;
  const record = {
    id:          custos_genId(),
    bookingId:   _custoBookingId,
    isMain:      true,
    date:        booking?.eventDate || new Date().toISOString().split('T')[0],
    // raw inputs
    tipoTransporte: tipo,
    km, fuelPrice, kmPerLitro, uberCost, pedagio,
    material, materialObs: _val('custoMaterialObs'),
    assistente, estacionamento: estac, alimentacao: aliment, outros,
    // breakdown
    custoDeslocamento: desl.transport,
    custoPedagio:      desl.pedagio,
    custoMaterial:     material,
    custoAssistente:   assistente,
    custoEstacionamento: estac,
    custoAlimentacao:  aliment,
    custoOutros:       outros,
    amount:            totalCusto,
    category:          'atendimento',
    createdAt:         new Date().toISOString()
  };
  custos_save(record);

  if (typeof showToast === 'function') showToast('Custos salvos com sucesso!');
  closeCustoModal();
  if (typeof renderStats === 'function') renderStats();
  if (typeof renderBookings === 'function') renderBookings();
}

// ── UI helpers for modal ──────────────────────────────────
function updateTransportFields() {
  const tipo = _val('custoTipoTransporte') || 'carro';
  const hasFuel = tipo === 'carro' || tipo === 'moto';
  const isUber  = tipo === 'uber' || tipo === 'taxi';
  const isNone  = tipo === 'nenhum';

  _show('carroFields', hasFuel);
  _show('uberFields',  isUber);
  _show('deslocFields', !isNone);

  calcCustoDeslocamento();
}

function calcCustoDeslocamento() {
  const tipo       = _val('custoTipoTransporte') || 'carro';
  const km         = _val('custoKm');
  const fuelPrice  = _val('custoFuelPrice');
  const kmPerLitro = _val('custoKmPerLitro');
  const uberCost   = _val('custoUberCost');
  const pedagio    = _val('custoPedagio');

  const result = calcDeslocamento({ tipo, km, fuelPrice, kmPerLitro, uberCost, pedagio });
  _setText('custoDeslocDisplay', _fmtBRL(result.total));
  updateMapsLink();
  calcCustoTotal();
}

function calcCustoTotal() {
  const tipo       = _val('custoTipoTransporte') || 'carro';
  const desl = calcDeslocamento({
    tipo,
    km:         _val('custoKm'),
    fuelPrice:  _val('custoFuelPrice'),
    kmPerLitro: _val('custoKmPerLitro'),
    uberCost:   _val('custoUberCost'),
    pedagio:    _val('custoPedagio')
  });
  const material   = parseFloat(_val('custoMaterial'))        || 0;
  const assistente = parseFloat(_val('custoAssistente'))      || 0;
  const estac      = parseFloat(_val('custoEstacionamento'))  || 0;
  const aliment    = parseFloat(_val('custoAlimentacao'))     || 0;
  const outros     = parseFloat(_val('custoOutros'))          || 0;

  const total = desl.total + material + assistente + estac + aliment + outros;

  _setText('custoTotalDisplay', _fmtBRL(total));

  // Lucro
  const receitaEl = _el('custoReceita');
  const receitaStr = receitaEl ? receitaEl.textContent : '0';
  const receita = parseFloat(receitaStr.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
  const lucro = receita - total;
  _setText('custoLucro', `${_fmtBRL(Math.abs(lucro))} ${lucro >= 0 ? '✓' : '⚠ prejuízo'}`);
  const lucroEl = _el('custoLucro');
  if (lucroEl) lucroEl.style.color = lucro >= 0 ? '#10B981' : '#EF4444';
}

function updateMapsLink() {
  const origin = _val('custoOrigin') || getStudioAddress();
  const dest   = _val('custoDestino') || '';
  const link   = _el('btnOpenMaps');
  if (link) link.href = buildMapsUrl(origin, dest);
}

function saveCustoOrigin() {
  const v = _val('custoOrigin');
  if (v) { setStudioAddress(v); if (typeof showToast === 'function') showToast('Endereço de saída salvo!'); }
}

// ── DOM micro-helpers ─────────────────────────────────────
function _el(id)          { return document.getElementById(id); }
function _val(id)         { const e = _el(id); return e ? e.value : ''; }
function _setVal(id, v)   { const e = _el(id); if (e) e.value = v; }
function _setText(id, v)  { const e = _el(id); if (e) e.textContent = v; }
function _show(id, show)  { const e = _el(id); if (e) e.style.display = show ? '' : 'none'; }
function _fmtBRL(v) {
  return typeof formatBRL === 'function'
    ? formatBRL(v)
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
