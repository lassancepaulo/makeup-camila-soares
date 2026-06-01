/* ============================================================
   MAKEUP CAMILA SOARES — Booking (Public Site)
   Requires: services-config.js loaded before this file.
   ============================================================ */

'use strict';

const BOOKINGS_KEY    = 'camilaAgendamentos';
const CAMILA_WHATSAPP = '5511999999999';

const BOOKING_SERVICE_LABELS = {
  noiva:     'Noiva (Dia Exclusivo)',
  madrinhas: 'Madrinhas',
  formatura: 'Formatura',
  ensaio:    'Ensaio Fotográfico',
  evento:    'Evento Social',
  social:    'Make Social',
  aula:      'Aula Particular'
};

// ---------- STATE ----------
let selectedTime    = '';
let selectedService = '';

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', initBooking);

function initBooking() {
  const dateInput = document.getElementById('bookDate');
  if (dateInput) dateInput.min = new Date().toISOString().split('T')[0];

  // Time slot selection
  document.querySelectorAll('.slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTime = btn.dataset.time;
    });
  });

  // Service selection
  document.querySelectorAll('input[name="bookService"]').forEach(radio => {
    radio.addEventListener('change', () => {
      selectedService = radio.value;
      const peopleField = document.getElementById('peopleField');
      if (peopleField) peopleField.style.display = radio.value === 'madrinhas' ? 'flex' : 'none';
      updatePriceSummary();
    });
  });

  // People count → update strip
  document.getElementById('bookPeople')?.addEventListener('input', updatePriceSummary);

  // Phone mask
  const phoneInput = document.getElementById('bookPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      let v = phoneInput.value.replace(/\D/g, '').substring(0, 11);
      if      (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
      else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
      else if (v.length > 0) v = `(${v}`;
      phoneInput.value = v;
    });
  }

  document.getElementById('bookSubmitBtn')?.addEventListener('click', submitBooking);
}

// ---------- PRICE SUMMARY STRIP ----------
function updatePriceSummary() {
  const strip = document.getElementById('priceSummaryStrip');
  if (!strip || !selectedService) return;

  const people  = parseInt(document.getElementById('bookPeople')?.value) || 1;
  const total   = calcServiceTotal(selectedService, people);
  const deposit = calcDeposit(selectedService, people);
  const remain  = calcRemaining(selectedService, people);
  const svc     = getServiceConfig(selectedService);

  document.getElementById('stripTotal').textContent     = formatBRL(total);
  document.getElementById('stripDeposit').textContent   = formatBRL(deposit);
  document.getElementById('stripRemaining').textContent = formatBRL(remain);

  const noteEl = document.getElementById('stripNote');
  if (noteEl) {
    const pct = Math.round((svc?.depositPct || 0.30) * 100);
    noteEl.textContent = selectedService === 'madrinhas'
      ? `Total para ${people} pessoa${people > 1 ? 's' : ''}: ${formatBRL(total)} · Adiantamento (${pct}%): ${formatBRL(deposit)}`
      : `Adiantamento de ${pct}% para confirmar o horário. Saldo pago no dia do evento.`;
  }

  strip.style.display = 'block';
}

// ---------- SUBMIT ----------
function submitBooking() {
  const name     = document.getElementById('bookName')?.value.trim();
  const phone    = document.getElementById('bookPhone')?.value.trim();
  const email    = document.getElementById('bookEmail')?.value.trim();
  const date     = document.getElementById('bookDate')?.value;
  const location = document.getElementById('bookLocation')?.value.trim();
  const notes    = document.getElementById('bookNotes')?.value.trim();
  const people   = parseInt(document.getElementById('bookPeople')?.value) || 1;

  if (!selectedService) return alert('Por favor, escolha um serviço.');
  if (!name)            return alert('Por favor, informe seu nome.');
  if (!phone)           return alert('Por favor, informe seu WhatsApp.');
  if (!date)            return alert('Por favor, selecione a data do evento.');
  if (!selectedTime)    return alert('Por favor, selecione um horário preferido.');

  const numPeople    = selectedService === 'madrinhas' ? people : 1;
  const totalValue   = calcServiceTotal(selectedService, numPeople);
  const depositValue = calcDeposit(selectedService, numPeople);
  const remaining    = calcRemaining(selectedService, numPeople);

  const booking = {
    id:             generateBookingId(),
    clientName:     name,
    clientPhone:    phone,
    clientEmail:    email    || '',
    serviceType:    selectedService,
    eventDate:      date,
    eventTime:      selectedTime,
    location:       location || '',
    numPeople,
    notes:          notes    || '',
    // Financial
    totalValue,
    depositValue,
    remainingValue: remaining,
    depositPct:     getServiceConfig(selectedService)?.depositPct || 0.30,
    // Status
    status:        'pendente',
    paymentStatus: 'aguardando',
    createdAt:     new Date().toISOString(),
    confirmedAt:   null,
    depositPaidAt: null,
    completedAt:   null
  };

  saveBooking(booking);

  const msg = buildCamilaNotification(booking);
  window.open(`https://wa.me/${CAMILA_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');

  document.querySelector('.booking-wrapper').style.display = 'none';
  document.getElementById('bookingSuccess').style.display  = 'block';
}

function buildCamilaNotification(b) {
  const svc = BOOKING_SERVICE_LABELS[b.serviceType] || b.serviceType;
  const dt  = formatBookingDate(b.eventDate);
  const pct = Math.round((b.depositPct || 0.30) * 100);

  let msg = `🌸 *Nova solicitação de agendamento!*\n\n`;
  msg += `*Nº:* ${b.id}\n`;
  msg += `*Cliente:* ${b.clientName}\n`;
  msg += `*WhatsApp:* ${b.clientPhone}\n`;
  if (b.clientEmail) msg += `*E-mail:* ${b.clientEmail}\n`;
  msg += `\n*Serviço:* ${svc}\n`;
  msg += `*Data:* ${dt}\n`;
  msg += `*Horário preferido:* ${b.eventTime}\n`;
  if (b.serviceType === 'madrinhas') msg += `*Número de pessoas:* ${b.numPeople}\n`;
  if (b.location) msg += `*Local:* ${b.location}\n`;
  msg += `\n💰 *Valores:*\n`;
  msg += `• Total: *${formatBRL(b.totalValue)}*\n`;
  msg += `• Adiantamento (${pct}%): *${formatBRL(b.depositValue)}*\n`;
  msg += `• Saldo no dia: *${formatBRL(b.remainingValue)}*\n`;
  if (b.notes) msg += `\n*Observações:* ${b.notes}\n`;
  msg += `\n_Agendamento ID: ${b.id}_`;
  return msg;
}

function resetBookingForm() {
  document.querySelector('.booking-wrapper').style.display = 'grid';
  document.getElementById('bookingSuccess').style.display  = 'none';
  document.getElementById('bookName').value     = '';
  document.getElementById('bookPhone').value    = '';
  document.getElementById('bookEmail').value    = '';
  document.getElementById('bookDate').value     = '';
  document.getElementById('bookLocation').value = '';
  document.getElementById('bookNotes').value    = '';
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('input[name="bookService"]').forEach(r => r.checked = false);
  document.querySelectorAll('.service-opt-inner').forEach(el => el.style.background = '');
  const strip = document.getElementById('priceSummaryStrip');
  if (strip) strip.style.display = 'none';
  selectedTime    = '';
  selectedService = '';
}

// ---------- STORAGE ----------
function saveBooking(booking) {
  const all = getAllBookings();
  all.unshift(booking);
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(all));
}

function getAllBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY) || '[]'); }
  catch { return []; }
}

function generateBookingId() {
  const year = new Date().getFullYear();
  const num  = String(getAllBookings().length + 1).padStart(3, '0');
  return `AGE-${year}-${num}`;
}

function formatBookingDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}
