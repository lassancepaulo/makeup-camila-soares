/* ============================================================
   MAKEUP CAMILA SOARES — Admin Booking Management
   Requires: services-config.js + admin.js loaded before this.
   Integrations: WhatsApp · PIX · Google Calendar · Apple (.ics)
   ============================================================ */

'use strict';

const BOOKINGS_KEY = 'camilaAgendamentos';
// CAMILA_PIX_KEY is declared in services-config.js

const BOOK_SERVICE_LABELS = {
  noiva:     'Noiva (Dia Exclusivo)',
  madrinhas: 'Madrinhas',
  formatura: 'Formatura',
  ensaio:    'Ensaio Fotográfico',
  evento:    'Evento Social',
  social:    'Make Social',
  aula:      'Aula Particular'
};

const BOOK_SERVICE_ICONS = {
  noiva:     'fa-ring',
  madrinhas: 'fa-users',
  formatura: 'fa-graduation-cap',
  ensaio:    'fa-camera',
  evento:    'fa-star',
  social:    'fa-sun',
  aula:      'fa-chalkboard-teacher'
};

// ---------- STORAGE ----------
function getAllBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); }
  catch { return []; }
}

function saveAllBookings(data) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(data));
}

function updateBookingStatus(id, status, extra = {}) {
  const all = getAllBookings();
  const idx = all.findIndex(b => b.id === id);
  if (idx < 0) return null;
  const ts = {};
  if (status === 'confirmado')   ts.confirmedAt   = new Date().toISOString();
  if (status === 'entrada_paga') ts.depositPaidAt = new Date().toISOString();
  if (status === 'concluido')    ts.completedAt   = new Date().toISOString();
  all[idx] = { ...all[idx], status, ...ts, ...extra };
  saveAllBookings(all);
  return all[idx];
}

function getBookingById(id) {
  return getAllBookings().find(b => b.id === id) || null;
}

// ---------- MAIN LOAD ----------
let currentFilter = 'todos';

function loadAgendamentosPage() {
  renderStats();
  renderBookings();
}

function renderStats() {
  const all = getAllBookings();
  const now = new Date();
  const m = now.getMonth(), y = now.getFullYear();

  const pendente     = all.filter(b => b.status === 'pendente').length;
  const confirmado   = all.filter(b => b.status === 'confirmado').length;
  const entradaPaga  = all.filter(b => b.status === 'entrada_paga').length;
  const mes          = all.filter(b => { const d = new Date(b.eventDate); return d.getMonth() === m && d.getFullYear() === y; }).length;

  // Receivables
  const totalRecebido = all
    .filter(b => ['entrada_paga','concluido'].includes(b.status))
    .reduce((s, b) => s + (b.status === 'concluido' ? (b.totalValue || 0) : (b.depositValue || 0)), 0);
  const entradasPendentes = all
    .filter(b => b.status === 'confirmado')
    .reduce((s, b) => s + (b.depositValue || 0), 0);

  setText('bStatPendente',    pendente);
  setText('bStatConfirmado',  confirmado + entradaPaga);
  setText('bStatMes',         mes);
  setText('bStatTotal',       all.length);
  setText('bStatRecebido',    formatBRL(totalRecebido));
  setText('bStatAReceber',    formatBRL(entradasPendentes));

  // Tab counts
  const counts = {
    todos:        all.length,
    pendente,
    confirmado:   confirmado + entradaPaga,
    entrada_paga: entradaPaga,
    rejeitado:    all.filter(b => b.status === 'rejeitado').length
  };
  Object.entries(counts).forEach(([key, val]) => {
    const el = document.getElementById(`cnt-${key}`);
    if (el) el.textContent = val;
  });

  const badge = document.getElementById('headerBadge');
  if (badge && pendente > 0) {
    badge.textContent = `⚠️ ${pendente} pendente${pendente > 1 ? 's' : ''} aguardando confirmação`;
  }
}

function renderBookings() {
  const all = getAllBookings();
  let filtered = currentFilter === 'todos'
    ? all
    : currentFilter === 'confirmado'
      ? all.filter(b => b.status === 'confirmado' || b.status === 'entrada_paga')
      : all.filter(b => b.status === currentFilter);

  filtered.sort((a, b) => {
    const order = { pendente: 0, confirmado: 1, entrada_paga: 2, concluido: 3, rejeitado: 4 };
    const oa = order[a.status] ?? 5, ob = order[b.status] ?? 5;
    if (oa !== ob) return oa - ob;
    return new Date(a.eventDate) - new Date(b.eventDate);
  });

  const container = document.getElementById('bookingsList');
  if (!container) return;

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state" style="background:#fff;border-radius:16px;padding:60px;border:1px solid rgba(0,0,0,.04)">
      <i class="fas fa-calendar-times"></i>
      <p>Nenhum agendamento ${currentFilter !== 'todos' ? 'nesta categoria' : 'encontrado'}</p>
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(b => buildBookingCard(b)).join('');
}

function filterBookings(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderBookings();
}

// ---------- BOOKING CARD ----------
function buildBookingCard(b) {
  const icon  = BOOK_SERVICE_ICONS[b.serviceType] || 'fa-calendar';
  const label = BOOK_SERVICE_LABELS[b.serviceType] || b.serviceType;

  const wazeUrl   = b.location ? buildWazeUrl(b.location) : null;
  const wazeBtn   = wazeUrl
    ? `<a href="${wazeUrl}" target="_blank" class="btn-waze-link" title="Abrir no Waze">
        <i class="fas fa-route"></i> Waze
       </a>` : '';

  const locationLine = b.location
    ? `<div class="booking-meta-item">
        <i class="fas fa-map-marker-alt"></i>
        <span>${b.location}</span>
        ${wazeBtn}
       </div>` : '';

  // Financial display
  const hasFinancial = b.totalValue > 0;
  const finRow = hasFinancial ? `
    <div class="booking-financial">
      <span class="fin-item fin-total" title="Valor total">
        <i class="fas fa-tag"></i> ${formatBRL(b.totalValue)}
      </span>
      <span class="fin-item fin-deposit" title="Adiantamento">
        <i class="fas fa-lock"></i> ${formatBRL(b.depositValue)} entrada
      </span>
      ${b.status === 'entrada_paga' || b.status === 'concluido'
        ? `<span class="fin-item fin-paid"><i class="fas fa-check-circle"></i> Entrada recebida</span>`
        : b.status === 'confirmado'
          ? `<span class="fin-item fin-pending"><i class="fas fa-clock"></i> Aguardando entrada</span>`
          : ''
      }
    </div>` : '';

  // Action buttons
  let actions = '';
  if (b.status === 'pendente') {
    actions = `
      <button class="btn-confirm" onclick="openConfirmModal('${b.id}')">
        <i class="fas fa-check"></i> Confirmar
      </button>
      <button class="btn-reject" onclick="openRejectModal('${b.id}')">
        <i class="fas fa-times"></i> Recusar
      </button>`;
  } else if (b.status === 'confirmado') {
    actions = `
      <button class="btn-entrada" onclick="markEntradaPaga('${b.id}')">
        <i class="fas fa-money-bill-wave"></i> Entrada recebida
      </button>
      <button class="btn-calendar btn-gcal" onclick="openGoogleCal('${b.id}')">
        <i class="fab fa-google"></i> Google Agenda
      </button>
      <button class="btn-calendar btn-ical" onclick="downloadICS('${b.id}')">
        <i class="fab fa-apple"></i> Apple Calendar
      </button>
      <button class="btn-calendar btn-whatsapp-send" onclick="openWhatsappConfirm('${b.id}')">
        <i class="fab fa-whatsapp"></i> Reenviar confirmação
      </button>`;
  } else if (b.status === 'entrada_paga') {
    actions = `
      <button class="btn-concluido" onclick="markConcluido('${b.id}')">
        <i class="fas fa-flag-checkered"></i> Marcar concluído
      </button>
      <button class="btn-calendar btn-gcal" onclick="openGoogleCal('${b.id}')">
        <i class="fab fa-google"></i> Google Agenda
      </button>
      <button class="btn-calendar btn-whatsapp-send" onclick="openWhatsappConfirm('${b.id}')">
        <i class="fab fa-whatsapp"></i> WhatsApp
      </button>`;
  } else {
    actions = `<span class="status-badge ${b.status}">${statusLabel(b.status)}</span>`;
  }

  // Custo badge (sempre visível)
  const totalCusto = typeof custos_totalByBooking === 'function' ? custos_totalByBooking(b.id) : 0;
  const custoBtnLabel = totalCusto > 0
    ? `<i class="fas fa-receipt"></i> Custos: ${typeof formatBRL === 'function' ? formatBRL(totalCusto) : 'R$' + totalCusto}`
    : `<i class="fas fa-receipt"></i> Registrar custos`;
  const custoBtnStyle = totalCusto > 0
    ? 'background:#FFF7ED;color:#92400E;border:1px solid #FDE68A'
    : 'background:#F9FAFB;color:var(--text-light);border:1px solid rgba(0,0,0,.1)';
  actions += `
    <button class="btn-calendar" onclick="openCustoModal('${b.id}')"
      style="${custoBtnStyle};margin-top:4px;font-size:.78rem;padding:7px 14px">
      ${custoBtnLabel}
    </button>`;

  const peopleNote = b.serviceType === 'madrinhas' && b.numPeople > 1
    ? `<div class="booking-meta-item"><i class="fas fa-users"></i><strong>${b.numPeople} pessoas</strong></div>` : '';

  return `
    <div class="booking-card ${b.status}">
      <div class="booking-service-icon">
        <i class="fas ${icon}"></i>
      </div>
      <div class="booking-info">
        <h4>${b.clientName}
          <span class="status-badge ${b.status}" style="font-size:.68rem;margin-left:6px">${statusLabel(b.status)}</span>
        </h4>
        <div style="font-size:.8rem;color:var(--text-light)">${b.id}</div>
        <div class="booking-meta">
          <div class="booking-meta-item"><i class="fas fa-sparkles"></i><strong>${label}</strong></div>
          <div class="booking-meta-item"><i class="fas fa-calendar"></i><strong>${formatBDate(b.eventDate)}</strong> às <strong>${b.eventTime}</strong></div>
          ${peopleNote}
          <div class="booking-meta-item"><i class="fab fa-whatsapp"></i><strong>${b.clientPhone}</strong></div>
          ${locationLine}
          ${b.clientEmail ? `<div class="booking-meta-item"><i class="fas fa-envelope"></i><span>${b.clientEmail}</span></div>` : ''}
        </div>
        ${finRow}
        ${b.notes ? `<div class="booking-notes"><i class="fas fa-quote-left" style="font-size:.65rem;margin-right:4px"></i> ${b.notes}</div>` : ''}
      </div>
      <div class="booking-actions">${actions}</div>
    </div>
  `;
}

function statusLabel(s) {
  const m = {
    pendente:     'Pendente',
    confirmado:   'Confirmado',
    entrada_paga: 'Entrada paga',
    concluido:    'Concluído',
    rejeitado:    'Recusado',
    cancelado:    'Cancelado'
  };
  return m[s] || s;
}

function formatBDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${day} ${months[parseInt(m)-1]} ${y}`;
}

// ---------- STATUS TRANSITIONS ----------
function markEntradaPaga(id) {
  const b = updateBookingStatus(id, 'entrada_paga');
  if (!b) return;
  showToast('Entrada recebida! Agendamento atualizado.', 'success');
  renderStats();
  renderBookings();
}

function markConcluido(id) {
  const b = updateBookingStatus(id, 'concluido');
  if (!b) return;
  showToast('Agendamento concluído! 🎉', 'success');
  renderStats();
  renderBookings();
}

// ---------- CONFIRM MODAL ----------
let pendingConfirmId = null;

function openConfirmModal(id) {
  pendingConfirmId = id;
  const b = getBookingById(id);
  if (!b) return;

  // Recalculate values if missing (legacy bookings)
  if (!b.totalValue) {
    b.totalValue   = calcServiceTotal(b.serviceType, b.numPeople);
    b.depositValue = calcDeposit(b.serviceType, b.numPeople);
    b.remainingValue = calcRemaining(b.serviceType, b.numPeople);
  }

  // Financial summary in modal
  const finEl = document.getElementById('confirmFinancial');
  if (finEl) {
    const pct = Math.round((b.depositPct || 0.30) * 100);
    finEl.innerHTML = `
      <div class="modal-financial-row">
        <span>Valor total do serviço</span>
        <strong>${formatBRL(b.totalValue)}</strong>
      </div>
      <div class="modal-financial-row deposit">
        <span>Adiantamento (${pct}%) — a cobrar agora</span>
        <strong>${formatBRL(b.depositValue)}</strong>
      </div>
      <div class="modal-financial-row remaining">
        <span>Saldo restante — no dia do evento</span>
        <strong>${formatBRL(b.remainingValue)}</strong>
      </div>`;
  }

  document.getElementById('confirmMsgPreview').textContent = buildConfirmationMessage(b);
  document.getElementById('pixMsgPreview').textContent     = buildPixMessage(b);
  document.getElementById('confirmModalSub').textContent   =
    `${b.clientName} · ${BOOK_SERVICE_LABELS[b.serviceType]} · ${formatBDate(b.eventDate)}`;

  document.getElementById('btnSendWhatsapp').onclick = () =>
    window.open(`https://wa.me/${b.clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(buildConfirmationMessage(b))}`, '_blank');

  document.getElementById('btnSendPix').onclick = () =>
    window.open(`https://wa.me/${b.clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(buildPixMessage(b))}`, '_blank');

  document.getElementById('btnGoogleCal').onclick = () => openGoogleCalFromBooking(b);
  document.getElementById('btnIcal').onclick       = () => downloadICSFromBooking(b);

  document.getElementById('btnFinishConfirm').onclick = () => finishConfirm(id);

  document.getElementById('confirmModal').classList.add('open');
}

function closeConfirmModal() {
  document.getElementById('confirmModal').classList.remove('open');
  pendingConfirmId = null;
}

function finishConfirm(id) {
  updateBookingStatus(id, 'confirmado');
  closeConfirmModal();
  showToast('Agendamento confirmado! Envie o PIX para a cliente.', 'success');
  renderStats();
  renderBookings();
}

// ---------- REJECT MODAL ----------
let pendingRejectId = null;

function openRejectModal(id) {
  pendingRejectId = id;
  const b = getBookingById(id);
  if (!b) return;

  document.getElementById('rejectMsgPreview').textContent = buildRejectMessage(b);
  document.getElementById('btnRejectWhatsapp').onclick = () =>
    window.open(`https://wa.me/${b.clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(buildRejectMessage(b))}`, '_blank');

  document.getElementById('btnConfirmReject').onclick = () => {
    updateBookingStatus(pendingRejectId, 'rejeitado');
    closeRejectModal();
    showToast('Agendamento recusado.', 'error');
    renderStats();
    renderBookings();
  };

  document.getElementById('rejectModal').classList.add('open');
}

function closeRejectModal() {
  document.getElementById('rejectModal').classList.remove('open');
  pendingRejectId = null;
}

// ---------- CALENDAR SHORTCUTS (from confirmed cards) ----------
function openGoogleCal(id)       { openGoogleCalFromBooking(getBookingById(id)); }
function downloadICS(id)         { downloadICSFromBooking(getBookingById(id)); }
function openWhatsappConfirm(id) {
  const b = getBookingById(id);
  if (!b) return;
  window.open(`https://wa.me/${b.clientPhone.replace(/\D/g,'')}?text=${encodeURIComponent(buildConfirmationMessage(b))}`, '_blank');
}

// ---------- MESSAGE BUILDERS ----------
function buildConfirmationMessage(b) {
  const svc = BOOK_SERVICE_LABELS[b.serviceType] || b.serviceType;
  const dt  = formatBDate(b.eventDate);
  const pct = Math.round(((b.depositPct) || 0.30) * 100);

  let msg = `✨ *Olá ${b.clientName}!*\n\n`;
  msg += `Tudo certo! Seu agendamento foi *CONFIRMADO* 🎉\n\n`;
  msg += `📋 *Detalhes:*\n`;
  msg += `• Serviço: *${svc}*\n`;
  msg += `• Data: *${dt}*\n`;
  msg += `• Horário: *${b.eventTime}*\n`;
  if (b.location) msg += `• Local: *${b.location}*\n`;
  if (b.serviceType === 'madrinhas' && b.numPeople > 1) msg += `• Pessoas: *${b.numPeople}*\n`;
  msg += `\n💰 *Valores:*\n`;
  msg += `• Total: *${formatBRL(b.totalValue || 0)}*\n`;
  msg += `• Adiantamento (${pct}%): *${formatBRL(b.depositValue || 0)}* ← pagar agora via PIX\n`;
  msg += `• Saldo no dia: *${formatBRL(b.remainingValue || 0)}*\n`;
  msg += `\n💄 Vou fazer tudo para deixar você ainda mais linda!\n`;
  msg += `Qualquer dúvida, me chame aqui mesmo! 🌸\n`;
  msg += `_Camila Soares Makeup Artist_`;
  return msg;
}

function buildPixMessage(b) {
  const svc = BOOK_SERVICE_LABELS[b.serviceType] || b.serviceType;
  const dt  = formatBDate(b.eventDate);
  const pct = Math.round(((b.depositPct) || 0.30) * 100);
  const depositVal = b.depositValue || calcDeposit(b.serviceType, b.numPeople);

  let msg = `💳 *Solicitação de Adiantamento*\n\n`;
  msg += `Olá ${b.clientName}! Para garantir seu horário de *${svc}* em *${dt}*, `;
  msg += `envie o adiantamento de *${pct}%* via PIX:\n\n`;
  msg += `💰 *Valor da entrada: ${formatBRL(depositVal)}*\n\n`;
  msg += `🔑 *Chave PIX:*\n${CAMILA_PIX_KEY}\n\n`;
  msg += `📝 *Identificação do pagamento:* ${b.id}\n\n`;
  msg += `Após o pagamento, me envie o comprovante por aqui. `;
  msg += `O saldo restante de *${formatBRL(b.remainingValue || 0)}* será pago no dia do evento.\n\n`;
  msg += `Obrigada! 🌸\n_Camila Soares Makeup Artist_`;
  return msg;
}

function buildRejectMessage(b) {
  const svc = BOOK_SERVICE_LABELS[b.serviceType] || b.serviceType;
  const dt  = formatBDate(b.eventDate);
  let msg = `Olá ${b.clientName}! 💕\n\n`;
  msg += `Infelizmente não terei disponibilidade para o seu agendamento de *${svc}* em *${dt}*.\n\n`;
  msg += `Sinto muito pelo inconveniente. Que tal tentarmos outra data? `;
  msg += `Me conta quais datas ficam melhor para você e vejo o que posso fazer! 🌸\n\n`;
  msg += `_Camila Soares Makeup Artist_`;
  return msg;
}

// ---------- GOOGLE CALENDAR ----------
function openGoogleCalFromBooking(b) {
  if (!b) return;
  const startDT = `${b.eventDate.replace(/-/g, '')}T${(b.eventTime || '09:00').replace(':', '')}00`;
  const hours   = calcDuration(b.serviceType, b.numPeople);
  const endDT   = addHoursToDatetime(startDT, hours);
  const title   = `${BOOK_SERVICE_LABELS[b.serviceType]} — ${b.clientName}`;
  const details = [
    `Cliente: ${b.clientName}`,
    `Tel: ${b.clientPhone}`,
    b.clientEmail ? `Email: ${b.clientEmail}` : '',
    b.serviceType === 'madrinhas' ? `Pessoas: ${b.numPeople}` : '',
    `Total: ${formatBRL(b.totalValue || 0)}`,
    `Entrada: ${formatBRL(b.depositValue || 0)}`,
    b.notes ? `Obs: ${b.notes}` : '',
    `ID: ${b.id}`
  ].filter(Boolean).join('\\n');

  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE`
    + `&text=${encodeURIComponent(title)}`
    + `&dates=${startDT}/${endDT}`
    + `&details=${encodeURIComponent(details)}`
    + `&location=${encodeURIComponent(b.location || '')}`
    + `&sf=true&output=xml`;

  window.open(url, '_blank');
}

// ---------- APPLE / IOS (.ICS) ----------
function downloadICSFromBooking(b) {
  if (!b) return;
  const startDT = `${b.eventDate.replace(/-/g, '')}T${(b.eventTime || '09:00').replace(':', '')}00`;
  const hours   = calcDuration(b.serviceType, b.numPeople);
  const endDT   = addHoursToDatetime(startDT, hours);
  const now     = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const title   = `${BOOK_SERVICE_LABELS[b.serviceType]} — ${b.clientName}`;
  const desc    = [
    `Cliente: ${b.clientName}`,
    `Tel: ${b.clientPhone}`,
    b.clientEmail ? `Email: ${b.clientEmail}` : '',
    `Total: ${formatBRL(b.totalValue || 0)}`,
    `Entrada: ${formatBRL(b.depositValue || 0)}`,
    b.notes ? `Obs: ${b.notes}` : '',
    `ID: ${b.id}`
  ].filter(Boolean).join('\\n');

  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//Camila Soares Makeup Artist//PT',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@makeupcamilasoares.com`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDT}`,
    `DTEND:${endDT}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${b.location || ''}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY',
    `DESCRIPTION:Lembrete: ${title}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `agendamento_${b.id}_${b.clientName.replace(/\s+/g, '_')}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Arquivo .ics baixado! Abra para adicionar ao Apple Calendar.', 'success');
}

// ---------- DATE UTIL ----------
function addHoursToDatetime(dtStr, hours) {
  const year  = parseInt(dtStr.slice(0, 4));
  const month = parseInt(dtStr.slice(4, 6)) - 1;
  const day   = parseInt(dtStr.slice(6, 8));
  const hour  = parseInt(dtStr.slice(9, 11));
  const min   = parseInt(dtStr.slice(11, 13));
  const d     = new Date(year, month, day, hour, min);
  d.setMinutes(d.getMinutes() + Math.round(hours * 60));
  const pad   = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// formatBRL falls back to services-config.js's formatBRL; define locally if not loaded
if (typeof formatBRL === 'undefined') {
  window.formatBRL = v => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
}
if (typeof buildWazeUrl === 'undefined') {
  window.buildWazeUrl = addr => addr ? `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes` : null;
}
if (typeof calcServiceTotal === 'undefined') {
  window.calcServiceTotal = () => 0;
  window.calcDeposit      = () => 0;
  window.calcRemaining    = () => 0;
  window.calcDuration     = () => 2;
}
