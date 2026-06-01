'use strict';

let _agendaDate = new Date();

function loadAgenda() {
  _agendaDate = new Date();
  _renderAgendaWeek();
}

function _getWeekDays(anchor) {
  const d = new Date(anchor);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(d);
    dd.setDate(d.getDate() + i);
    days.push(dd);
  }
  return days;
}

function _renderAgendaWeek() {
  const days = _getWeekDays(_agendaDate);
  const bookings = JSON.parse(localStorage.getItem('camilaAgendamentos') || '[]');
  const quotes   = JSON.parse(localStorage.getItem('camilaOrcamentos')   || '[]');

  const fmt = d => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  document.getElementById('agendaWeekLabel').textContent =
    `${fmt(days[0])} – ${fmt(days[6])} ${days[0].getFullYear()}`;

  const today = new Date().toISOString().slice(0, 10);

  // Build slot index from bookings + approved/paid quotes that have date/time
  const slotMap = {};
  const addItem = (item, type) => {
    if (!item.date) return;
    const time = item.time || '00:00';
    const key  = `${item.date}__${_normalizeTime(time)}`;
    if (!slotMap[key]) slotMap[key] = [];
    slotMap[key].push({ ...item, _type: type });
  };
  bookings.forEach(b => addItem(b, 'booking'));
  quotes.filter(q => (q.status === 'aprovado' || q.status === 'pago') && q.eventDate)
        .forEach(q => addItem({ ...q, date: q.eventDate, clientName: q.clientName, serviceType: q.serviceType }, 'quote'));

  // Time slots 7:00–21:00 in 30-min steps
  const slots = [];
  for (let h = 7; h <= 21; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    if (h < 21) slots.push(`${String(h).padStart(2, '0')}:30`);
  }

  const grid = document.getElementById('agendaGrid');
  grid.innerHTML = '';

  // Header row
  const header = document.createElement('div');
  header.className = 'agenda-header-row';
  header.innerHTML = '<div class="agenda-time-col"></div>';
  days.forEach(d => {
    const iso     = d.toISOString().slice(0, 10);
    const isToday = iso === today;
    const dow     = d.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dom     = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    header.innerHTML += `
      <div class="agenda-day-col${isToday ? ' is-today' : ''}">
        <div class="agenda-dow">${dow}</div>
        <div class="agenda-dom${isToday ? ' today-circle' : ''}">${dom}</div>
      </div>`;
  });
  grid.appendChild(header);

  // Count items per day for summary row
  const dayCount = {};
  days.forEach(d => {
    const iso = d.toISOString().slice(0, 10);
    dayCount[iso] = Object.keys(slotMap)
      .filter(k => k.startsWith(iso + '__'))
      .reduce((s, k) => s + slotMap[k].length, 0);
  });

  // Slot rows
  slots.forEach(slot => {
    const row = document.createElement('div');
    row.className = 'agenda-slot-row';
    const isHour = slot.endsWith(':00');
    row.innerHTML = `<div class="agenda-time-label${isHour ? ' is-hour' : ''}">${isHour ? slot : ''}</div>`;

    days.forEach(d => {
      const iso     = d.toISOString().slice(0, 10);
      const isToday = iso === today;
      const cell    = document.createElement('div');
      cell.className = `agenda-cell${isToday ? ' is-today' : ''}`;

      const key   = `${iso}__${slot}`;
      const items = slotMap[key] || [];
      const hasConflict = items.length > 1;

      items.forEach(item => {
        const block = document.createElement('div');
        const status = item.status || (item._type === 'quote' ? 'aprovado' : 'pendente');
        block.className = `agenda-block status-${status}${hasConflict ? ' conflict' : ''}`;
        block.innerHTML = `
          <div class="ab-name">${item.clientName || '—'}</div>
          <div class="ab-service">${_agendaServiceLabel(item.serviceType)}</div>
          ${hasConflict ? '<i class="fas fa-exclamation-triangle ab-warn"></i>' : ''}`;
        block.onclick = () => _openAgendaDetail(item);
        cell.appendChild(block);
      });

      row.appendChild(cell);
    });

    grid.appendChild(row);
  });

  // Conflict counter
  let conflicts = 0;
  Object.values(slotMap).forEach(arr => { if (arr.length > 1) conflicts += arr.length; });
  const conflictEl = document.getElementById('agendaConflicts');
  if (conflictEl) {
    conflictEl.style.display = conflicts > 0 ? 'inline-flex' : 'none';
    conflictEl.textContent = `${conflicts} conflito${conflicts !== 1 ? 's' : ''}`;
  }
}

function _normalizeTime(t) {
  if (!t) return '00:00';
  const parts = t.split(':');
  const h = parts[0].padStart(2, '0');
  const m = parts[1] ? parts[1].padStart(2, '0') : '00';
  const mRounded = parseInt(m) < 30 ? '00' : '30';
  return `${h}:${mRounded}`;
}

function _agendaServiceLabel(type) {
  const map = { noiva: 'Noiva', madrinhas: 'Madrinhas', formatura: 'Formatura',
                ensaio: 'Ensaio', evento: 'Evento', social: 'Social', aula: 'Aula' };
  return map[type] || type || '—';
}

function agendaPrev()  { _agendaDate.setDate(_agendaDate.getDate() - 7); _renderAgendaWeek(); }
function agendaNext()  { _agendaDate.setDate(_agendaDate.getDate() + 7); _renderAgendaWeek(); }
function agendaToday() { _agendaDate = new Date(); _renderAgendaWeek(); }

function _openAgendaDetail(item) {
  const fmt = iso => new Date(iso + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  document.getElementById('adm-name').textContent    = item.clientName || '—';
  document.getElementById('adm-service').textContent = _agendaServiceLabel(item.serviceType);
  document.getElementById('adm-date').textContent    = (item.date || item.eventDate) ? fmt(item.date || item.eventDate) : '—';
  document.getElementById('adm-time').textContent    = item.time || '—';
  document.getElementById('adm-address').textContent = item.address || item.eventAddress || '—';
  document.getElementById('adm-phone').textContent   = item.clientPhone || item.phone || '—';

  const statusEl = document.getElementById('adm-status');
  const status   = item.status || 'pendente';
  statusEl.textContent  = status.charAt(0).toUpperCase() + status.slice(1);
  statusEl.className    = `adm-status-badge status-${status}`;

  const phone  = (item.clientPhone || item.phone || '').replace(/\D/g, '');
  const waBtn  = document.getElementById('adm-wa-btn');
  if (phone) {
    waBtn.href          = `https://wa.me/55${phone}`;
    waBtn.style.display = 'inline-flex';
  } else {
    waBtn.style.display = 'none';
  }

  // Edit link
  const editBtn = document.getElementById('adm-edit-btn');
  if (editBtn) {
    if (item._type === 'quote') {
      editBtn.href = `orcamentos.html`;
    } else {
      editBtn.href = `agendamentos.html`;
    }
  }

  document.getElementById('agendaDetailModal').style.display = 'flex';
}

function closeAgendaDetail() {
  document.getElementById('agendaDetailModal').style.display = 'none';
}
