/* ============================================================
   MAKEUP CAMILA SOARES — Admin JavaScript
   Modules: Auth | Storage | Dashboard | Orçamentos | PDF | Faturamento
   ============================================================ */

'use strict';

// ===================== AUTH =====================
function requireAuth() {
  if (sessionStorage.getItem('camilaAdmin') !== 'true') {
    window.location.href = '../admin-login.html';
  }
}

function logout() {
  sessionStorage.removeItem('camilaAdmin');
  window.location.href = '../admin-login.html';
}

// ===================== STORAGE =====================
const DB_KEY = 'camilaOrcamentos';

function getAll() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); }
  catch { return []; }
}

function saveAll(data) {
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

function getById(id) {
  return getAll().find(q => q.id === id);
}

function saveQuote(quote) {
  const all = getAll();
  const idx = all.findIndex(q => q.id === quote.id);
  if (idx >= 0) all[idx] = quote;
  else all.unshift(quote);
  saveAll(all);
}

function deleteQuote(id) {
  saveAll(getAll().filter(q => q.id !== id));
}

function generateId() {
  const all = getAll();
  const year = new Date().getFullYear();
  const num = String(all.length + 1).padStart(3, '0');
  return `ORC-${year}-${num}`;
}

// ===================== BOOKINGS STORAGE =====================
const BOOKINGS_DB_KEY = 'camilaAgendamentos';

function getAllBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_DB_KEY) || '[]'); }
  catch { return []; }
}

function saveBookingData(bookings) {
  localStorage.setItem(BOOKINGS_DB_KEY, JSON.stringify(bookings));
}

function updateBooking(id, changes) {
  const all = getAllBookings();
  const idx = all.findIndex(b => b.id === id);
  if (idx >= 0) { all[idx] = { ...all[idx], ...changes }; saveBookingData(all); }
}

// ===================== HELPERS =====================
const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const SERVICE_LABELS = {
  noiva: 'Noiva',
  formatura: 'Formatura',
  ensaio: 'Ensaio Fotográfico',
  evento: 'Evento Social',
  social: 'Make Social',
  aula: 'Aula Particular',
  outro: 'Outro'
};

const PAYMENT_LABELS = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  transferencia: 'Transferência'
};

function formatMoney(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}
const formatBRL = formatMoney;

// Show/hide estoque low-stock badge in sidebar (called on every admin page)
function initEstoqueBadge() {
  const badge = document.getElementById('estoqueBadge');
  if (!badge) return;
  const data  = JSON.parse(localStorage.getItem('camilaEstoque') || '[]');
  const count = data.filter(i => i.qty <= i.minQty).length;
  badge.textContent   = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  if (!toast) return;
  const icon = toast.querySelector('i');
  icon.className = type === 'success' ? 'fas fa-check-circle' : type === 'error' ? 'fas fa-times-circle' : 'fas fa-info-circle';
  toast.className = `toast ${type}`;
  msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ===================== DASHBOARD =====================
function loadDashboard() {
  const all = getAll();
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  const total = all.length;
  const pendentes = all.filter(q => q.status === 'pendente').length;
  const pagosThisMonth = all.filter(q => {
    if (q.status !== 'pago') return false;
    const d = new Date(q.eventDate || q.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const fatMes = pagosThisMonth.reduce((s, q) => s + (q.total || 0), 0);

  setText('statTotal', total);
  setText('statFaturamento', formatMoney(fatMes));
  setText('statPendentes', pendentes);
  setText('statPagos', pagosThisMonth.length);

  // Booking stats
  const bookings = getAllBookings();
  const pendingBookings = bookings.filter(b => b.status === 'pendente');
  setText('statAgendamentos', pendingBookings.length);

  // Pending bookings quick list
  const bookingsContainer = document.getElementById('pendingBookingsContainer');
  if (bookingsContainer) {
    if (pendingBookings.length === 0) {
      bookingsContainer.innerHTML = `<div class="empty-state"><i class="fas fa-calendar-check"></i><p>Nenhum agendamento pendente</p></div>`;
    } else {
      const BOOKING_SVC = { noiva:'Noiva', madrinhas:'Madrinhas', formatura:'Formatura', ensaio:'Ensaio Fotográfico', evento:'Evento Social', social:'Make Social', aula:'Aula Particular' };
      bookingsContainer.innerHTML = pendingBookings.slice(0, 5).map(b => `
        <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #f5f0ed">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#C9956C,#8B4B6B);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-calendar" style="color:#fff;font-size:.75rem"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:600;font-size:.85rem;color:var(--dark-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.clientName}</div>
            <div style="font-size:.78rem;color:var(--text-light)">${BOOKING_SVC[b.serviceType] || b.serviceType} · ${formatDate(b.eventDate)}</div>
          </div>
          <a href="agendamentos.html" style="font-size:.75rem;color:var(--rose-gold);white-space:nowrap">Ver <i class="fas fa-arrow-right"></i></a>
        </div>
      `).join('');
    }
  }

  // Recent quotes table
  const recent = all.slice(0, 8);
  const container = document.getElementById('recentQuotesContainer');
  if (container) {
    if (recent.length === 0) {
      container.innerHTML = `<div class="empty-state"><i class="fas fa-file-invoice"></i><p>Nenhum orçamento ainda. <a href="orcamento-novo.html" style="color:var(--rose-gold)">Criar primeiro orçamento</a></p></div>`;
    } else {
      container.innerHTML = buildQuoteTable(recent, true);
    }
  }

  // Services stats
  const servContainer = document.getElementById('servicosStats');
  if (servContainer) {
    const counts = {};
    all.forEach(q => { counts[q.serviceType] = (counts[q.serviceType] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const maxCount = sorted[0]?.[1] || 1;
    if (sorted.length === 0) {
      servContainer.innerHTML = `<div class="empty-state"><i class="fas fa-chart-pie"></i><p>Sem dados suficientes</p></div>`;
    } else {
      servContainer.innerHTML = sorted.map(([key, cnt]) => `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:5px">
            <span style="font-weight:600;color:var(--dark-soft)">${SERVICE_LABELS[key] || key}</span>
            <span style="color:var(--text-light)">${cnt} atendimento${cnt !== 1 ? 's' : ''}</span>
          </div>
          <div style="height:6px;background:#f0ebe8;border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${(cnt/maxCount)*100}%;background:var(--gradient);border-radius:3px;transition:.5s"></div>
          </div>
        </div>
      `).join('');
    }
  }

  // Mini revenue chart
  buildMiniRevenueChart(all);
}

function buildMiniRevenueChart(all) {
  const canvas = document.getElementById('miniRevenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const now = new Date();
  const labels = [];
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(MONTHS[d.getMonth()]);
    const monthTotal = all
      .filter(q => q.status === 'pago' && q.eventDate)
      .filter(q => {
        const qd = new Date(q.eventDate);
        return qd.getMonth() === d.getMonth() && qd.getFullYear() === d.getFullYear();
      })
      .reduce((s, q) => s + (q.total || 0), 0);
    data.push(monthTotal);
  }
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: createGradient(ctx, canvas),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => formatMoney(ctx.raw) }
      }},
      scales: {
        y: { ticks: { callback: v => formatMoney(v), font: { size: 11 } }, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function createGradient(ctx, canvas) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
  gradient.addColorStop(0, '#C9956C');
  gradient.addColorStop(1, '#8B4B6B');
  return gradient;
}

// ===================== QUOTE TABLE =====================
function buildQuoteTable(quotes, compact = false) {
  if (quotes.length === 0) return `<div class="empty-state"><i class="fas fa-file-invoice"></i><p>Nenhum orçamento encontrado</p></div>`;

  const rows = quotes.map(q => `
    <tr>
      <td>
        <div class="table-name">${q.clientName}</div>
        <div class="table-sub">${q.id}</div>
      </td>
      <td>${SERVICE_LABELS[q.serviceType] || q.serviceType || '—'}</td>
      ${!compact ? `<td>${formatDate(q.eventDate)}</td>` : ''}
      <td><strong>${formatMoney(q.total)}</strong></td>
      <td><span class="status-badge ${q.status}">${statusLabel(q.status)}</span></td>
      <td>
        <div class="table-actions">
          <a href="orcamento-novo.html?id=${q.id}" class="table-btn" title="Editar"><i class="fas fa-edit"></i></a>
          <button class="table-btn" onclick="downloadPDF('${q.id}')" title="PDF"><i class="fas fa-file-pdf"></i></button>
          ${!compact ? `<button class="table-btn danger" onclick="confirmDeleteQuote('${q.id}')" title="Excluir"><i class="fas fa-trash"></i></button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Serviço</th>
          ${!compact ? '<th>Data Evento</th>' : ''}
          <th>Valor</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function statusLabel(s) {
  const map = { pendente: 'Pendente', aprovado: 'Aprovado', pago: 'Pago', cancelado: 'Cancelado' };
  return map[s] || s;
}

// ===================== ORÇAMENTOS PAGE =====================
function loadOrcamentosPage() {
  let all = getAll();

  function render() {
    const search = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const servico = document.getElementById('filterServico')?.value || '';
    const mes = document.getElementById('filterMes')?.value || '';

    let filtered = all.filter(q => {
      const matchSearch = !search ||
        q.clientName?.toLowerCase().includes(search) ||
        q.serviceType?.toLowerCase().includes(search) ||
        q.id?.toLowerCase().includes(search);
      const matchStatus = !status || q.status === status;
      const matchServico = !servico || q.serviceType === servico;
      const matchMes = !mes || (q.eventDate && q.eventDate.startsWith(mes));
      return matchSearch && matchStatus && matchServico && matchMes;
    });

    const container = document.getElementById('quotesTableContainer');
    const count = document.getElementById('tableCount');
    if (container) container.innerHTML = buildQuoteTable(filtered, false);
    if (count) count.textContent = `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`;
  }

  // Populate month filter
  const months = [...new Set(all.map(q => q.eventDate?.substring(0, 7)).filter(Boolean))].sort().reverse();
  const mesFilter = document.getElementById('filterMes');
  if (mesFilter) {
    months.forEach(m => {
      const [y, mo] = m.split('-');
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = `${MONTHS_FULL[parseInt(mo) - 1]} ${y}`;
      mesFilter.appendChild(opt);
    });
    mesFilter.addEventListener('change', render);
  }

  document.getElementById('searchInput')?.addEventListener('input', render);
  document.getElementById('filterStatus')?.addEventListener('change', render);
  document.getElementById('filterServico')?.addEventListener('change', render);

  render();
}

// Delete modal
let deleteTarget = null;

function confirmDeleteQuote(id) {
  deleteTarget = id;
  document.getElementById('deleteModal')?.classList.add('open');
}

function closeModal() {
  document.getElementById('deleteModal')?.classList.remove('open');
  deleteTarget = null;
}

document.getElementById?.('confirmDelete')?.addEventListener('click', () => {
  if (deleteTarget) {
    deleteQuote(deleteTarget);
    showToast('Orçamento excluído.');
    closeModal();
    loadOrcamentosPage();
  }
});

// Setup confirm delete button after DOM loaded
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmDelete')?.addEventListener('click', () => {
    if (deleteTarget) {
      deleteQuote(deleteTarget);
      showToast('Orçamento excluído.');
      closeModal();
      if (typeof loadOrcamentosPage === 'function') loadOrcamentosPage();
    }
  });
});

// ===================== ORÇAMENTO FORM =====================
function initOrcamentoForm() {
  // Generate or load quote number
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');

  if (editId) {
    document.getElementById('pageTitle').textContent = 'Editar Orçamento';
    const q = getById(editId);
    if (q) loadFormData(q);
  } else {
    document.getElementById('quoteNumber').value = generateId();
    addItemRow(); // start with one empty row
  }

  // Add item button
  document.getElementById('addItemBtn')?.addEventListener('click', () => addItemRow());

  // Discount input
  document.getElementById('discountInput')?.addEventListener('input', updateTotals);

  // Phone mask
  const phoneInput = document.getElementById('clientPhone');
  phoneInput?.addEventListener('input', () => {
    let v = phoneInput.value.replace(/\D/g, '').substring(0, 11);
    if (v.length > 6) v = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    else if (v.length > 2) v = `(${v.slice(0,2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    phoneInput.value = v;
  });

  // Form submit
  document.getElementById('orcamentoForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const quote = buildQuoteFromForm();
    saveQuote(quote);
    showToast('Orçamento salvo com sucesso!');
    setTimeout(() => window.location.href = 'orcamentos.html', 1500);
  });

  // Save and PDF
  document.getElementById('saveAndPdfBtn')?.addEventListener('click', () => {
    const quote = buildQuoteFromForm();
    saveQuote(quote);
    showToast('Orçamento salvo! Gerando PDF...');
    setTimeout(() => generatePDF(quote), 500);
  });
}

function addItemRow(desc = '', qty = 1, price = 0) {
  const tbody = document.getElementById('itemsBody');
  if (!tbody) return;
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="col-desc">
      <input type="text" class="item-desc" placeholder="Ex: Maquiagem para noiva" value="${desc}" />
    </td>
    <td class="col-qty">
      <input type="number" class="item-qty" value="${qty}" min="1" step="1" style="text-align:center" />
    </td>
    <td class="col-price">
      <input type="number" class="item-price" value="${price}" min="0" step="0.01" placeholder="0,00" />
    </td>
    <td class="col-total item-total-cell">R$ 0,00</td>
    <td class="col-action">
      <button type="button" class="btn-remove-item" onclick="removeItemRow(this)">
        <i class="fas fa-times"></i>
      </button>
    </td>
  `;
  tbody.appendChild(row);

  row.querySelectorAll('.item-qty, .item-price').forEach(inp => inp.addEventListener('input', updateTotals));
  updateTotals();
}

function removeItemRow(btn) {
  btn.closest('tr').remove();
  updateTotals();
}

function updateTotals() {
  const rows = document.querySelectorAll('#itemsBody tr');
  let subtotal = 0;
  rows.forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    const total = qty * price;
    subtotal += total;
    const cell = row.querySelector('.item-total-cell');
    if (cell) cell.textContent = formatMoney(total);
  });
  const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
  const total = Math.max(0, subtotal - discount);
  setText('subtotalDisplay', formatMoney(subtotal));
  setText('totalDisplay', formatMoney(total));
}

function buildQuoteFromForm() {
  const rows = document.querySelectorAll('#itemsBody tr');
  const items = [];
  rows.forEach(row => {
    const desc = row.querySelector('.item-desc')?.value || '';
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    if (desc || qty || price) items.push({ desc, qty, price, total: qty * price });
  });

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
  const total = Math.max(0, subtotal - discount);

  return {
    id: document.getElementById('quoteNumber')?.value || generateId(),
    clientName: document.getElementById('clientName')?.value || '',
    clientPhone: document.getElementById('clientPhone')?.value || '',
    clientEmail: document.getElementById('clientEmail')?.value || '',
    clientAddress: document.getElementById('clientAddress')?.value || '',
    serviceType: document.getElementById('serviceType')?.value || '',
    eventDate: document.getElementById('eventDate')?.value || '',
    eventTime: document.getElementById('eventTime')?.value || '',
    status: document.getElementById('quoteStatus')?.value || 'pendente',
    paymentMethod: document.getElementById('paymentMethod')?.value || 'pix',
    notes: document.getElementById('quoteNotes')?.value || '',
    items,
    subtotal,
    discount,
    total,
    createdAt: new Date().toISOString()
  };
}

function loadFormData(q) {
  setVal('quoteNumber', q.id);
  setVal('clientName', q.clientName);
  setVal('clientPhone', q.clientPhone);
  setVal('clientEmail', q.clientEmail);
  setVal('clientAddress', q.clientAddress);
  setVal('serviceType', q.serviceType);
  setVal('eventDate', q.eventDate);
  setVal('eventTime', q.eventTime);
  setVal('quoteStatus', q.status);
  setVal('paymentMethod', q.paymentMethod);
  setVal('quoteNotes', q.notes);
  setVal('discountInput', q.discount || 0);

  const tbody = document.getElementById('itemsBody');
  if (tbody) tbody.innerHTML = '';
  (q.items || []).forEach(item => addItemRow(item.desc, item.qty, item.price));
  if (!q.items?.length) addItemRow();
  updateTotals();
}

// ===================== PDF GENERATION =====================
function downloadPDF(id) {
  const q = getById(id);
  if (q) generatePDF(q);
}

function generatePDF(quote) {
  if (typeof window.jspdf === 'undefined' && typeof jsPDF === 'undefined') {
    showToast('Biblioteca PDF nao carregada. Tente novamente.', 'error');
    return;
  }

  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const RG   = [201, 149, 108]; // rose gold
  const DARK = [42, 22, 27];
  const CREAM= [251, 247, 244];
  const TEXT = [61, 43, 43];
  const SOFT = [122, 92, 92];
  const isNoiva  = quote.serviceType === 'noiva';
  const svcLabel = SERVICE_LABELS[quote.serviceType] || quote.serviceType || 'Servico';
  const pctNum   = Math.round(((quote.depositPct) || 0.30) * 100);
  const depositV = quote.depositValue   || (typeof calcDeposit   === 'function' ? calcDeposit(quote.serviceType,   quote.numPeople) : 0);
  const remainV  = quote.remainingValue || (typeof calcRemaining === 'function' ? calcRemaining(quote.serviceType, quote.numPeople) : 0);

  // ======================================================
  // PAGINA 1 — ORCAMENTO (design original)
  // ======================================================

  // Header escuro
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 55, 'F');
  doc.setFillColor(...RG);
  doc.rect(0, 55, W, 2, 'F');

  // Nome / logo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.text('Camila Soares', 18, 24);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...RG);
  doc.text('MAKEUP ARTIST', 18, 31);
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(8);
  doc.text('@makeupcamilasoares', 18, 40);
  doc.text('(11) 99999-9999  contato@makeupcamilasoares.com', 18, 46);

  // Label orcamento
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('ORCAMENTO', W - 18, 22, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...RG);
  doc.text(quote.id, W - 18, 29, { align: 'right' });
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.text('Emitido em ' + new Date().toLocaleDateString('pt-BR'), W - 18, 36, { align: 'right' });

  // Badge de status
  const sc = ({pendente:[245,158,11],aprovado:[59,130,246],pago:[16,185,129],cancelado:[239,68,68]})[quote.status] || RG;
  doc.setFillColor(...sc);
  doc.roundedRect(W - 46, 41, 28, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel(quote.status).toUpperCase(), W - 32, 46.5, { align: 'center' });

  // Boxes cliente + servico
  let y = 68;
  const colW = (W - 36) / 2;

  doc.setFillColor(...CREAM);
  doc.roundedRect(14, y, colW, 36, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...RG);
  doc.text('DADOS DO CLIENTE', 20, y + 8);
  doc.setTextColor(...TEXT);
  doc.setFontSize(11);
  doc.text(quote.clientName || '—', 20, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SOFT);
  if (quote.clientPhone)   doc.text('Tel: ' + quote.clientPhone, 20, y + 22);
  if (quote.clientEmail)   doc.text('Email: ' + quote.clientEmail, 20, y + 28);
  if (quote.clientAddress) doc.text('End: ' + doc.splitTextToSize(quote.clientAddress, colW - 12)[0], 20, y + 34);

  const col2X = 14 + colW + 8;
  doc.setFillColor(...CREAM);
  doc.roundedRect(col2X, y, colW, 36, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...RG);
  doc.text('DADOS DO SERVICO', col2X + 6, y + 8);
  doc.setTextColor(...TEXT);
  doc.setFontSize(11);
  doc.text(svcLabel, col2X + 6, y + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SOFT);
  if (quote.eventDate) doc.text('Data: ' + formatDate(quote.eventDate) + (quote.eventTime ? ' as ' + quote.eventTime : ''), col2X + 6, y + 22);
  doc.text('Pagamento: ' + (PAYMENT_LABELS[quote.paymentMethod] || quote.paymentMethod || '—'), col2X + 6, y + 28);
  y += 46;

  // Tabela de itens
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...RG);
  doc.text('ITENS DO ORCAMENTO', 14, y);
  y += 4;

  const tableItems = (quote.items || []).map(item => [
    item.desc || '', String(item.qty || 0), formatMoney(item.price), formatMoney(item.total)
  ]);

  doc.autoTable({
    startY: y,
    head: [['Descricao', 'Qtd.', 'Valor Unit.', 'Total']],
    body: tableItems.length ? tableItems : [['—','—','—','—']],
    theme: 'plain',
    styles:      { font:'helvetica', fontSize:9, textColor:TEXT, cellPadding:{top:5,right:8,bottom:5,left:8} },
    headStyles:  { fillColor:DARK, textColor:[255,255,255], fontStyle:'bold', fontSize:8, cellPadding:{top:6,right:8,bottom:6,left:8} },
    columnStyles:{ 0:{cellWidth:'auto'}, 1:{cellWidth:20,halign:'center'}, 2:{cellWidth:36,halign:'right'}, 3:{cellWidth:40,halign:'right',fontStyle:'bold'} },
    alternateRowStyles: { fillColor: CREAM },
    margin: { left:14, right:14 }, tableWidth: W - 28
  });

  y = doc.lastAutoTable.finalY + 6;

  // Totais
  const tX = W - 80;
  doc.setFillColor(...CREAM);
  doc.roundedRect(tX - 4, y, 70, 32, 3, 3, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SOFT);
  doc.text('Subtotal:', tX, y + 8);
  doc.text(formatMoney(quote.subtotal), W - 14, y + 8, { align: 'right' });
  if (quote.discount > 0) {
    doc.setTextColor(239, 68, 68);
    doc.text('Desconto:', tX, y + 16);
    doc.text('- ' + formatMoney(quote.discount), W - 14, y + 16, { align: 'right' });
  }
  doc.setFillColor(...RG);
  doc.rect(tX - 4, y + 20, 70, 0.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text('TOTAL:', tX, y + 30);
  doc.setTextColor(139, 75, 107);
  doc.text(formatMoney(quote.total), W - 14, y + 30, { align: 'right' });
  y += 42;

  // Observacoes
  if (quote.notes) {
    doc.setFillColor(245, 230, 211);
    doc.roundedRect(14, y, W - 28, 20, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...RG);
    doc.text('OBSERVACOES', 20, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...TEXT);
    doc.text(doc.splitTextToSize(quote.notes, W - 40)[0], 20, y + 14);
    y += 26;
  }

  // Rodape
  const footY = H - 22;
  doc.setFillColor(...DARK);
  doc.rect(0, footY, W, 22, 'F');
  doc.setFillColor(...RG);
  doc.rect(0, footY, W, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('Camila Soares Makeup Artist  @makeupcamilasoares  (11) 99999-9999', W / 2, footY + 9, { align: 'center' });
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.text('Este orcamento tem validade de 30 dias a partir da data de emissao.', W / 2, footY + 16, { align: 'center' });

  // ======================================================
  // PAGINA 2 — DESCRICAO DO SERVICO + CONDICOES
  // ======================================================
  doc.addPage();

  // Header pagina 2
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 20, 'F');
  doc.setFillColor(...RG);
  doc.rect(0, 20, W, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(svcLabel.toUpperCase(), W / 2, 13, { align: 'center' });

  y = 34;

  // -- Bloco: servico bullets + valor --
  doc.setFillColor(...CREAM);
  doc.roundedRect(14, y - 6, W - 28, 2, 0, 0, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...RG);
  const secTitle = isNoiva ? 'PRODUCAO DE MAQUIAGEM E PENTEADO' : 'DESCRICAO DO SERVICO';
  doc.text(secTitle, 14, y);
  y += 8;

  const bullets = getServiceBullets(quote.serviceType);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  bullets.forEach(function(b) {
    doc.text('\u2022  ' + b + ';', 18, y);
    y += 7.5;
  });

  y += 6;
  // VALOR destaque
  doc.setFillColor(245, 230, 211);
  doc.roundedRect(14, y - 4, W - 28, 16, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...RG);
  doc.text('VALOR:', 20, y + 7);
  doc.setFontSize(14);
  doc.setTextColor(139, 75, 107);
  doc.text(formatMoney(quote.total), W - 18, y + 7, { align: 'right' });
  y += 22;

  // Valor por acompanhante (madrinhas / noiva)
  if (isNoiva || quote.serviceType === 'madrinhas') {
    const perPerson = quote.serviceType === 'madrinhas' ? 180 : 680;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...SOFT);
    doc.text('\u2022  Valor adicional para cada acompanhante:', 18, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(139, 75, 107);
    doc.text('R$ ' + perPerson.toFixed(2).replace('.',','), W - 18, y, { align: 'right' });
    y += 10;
  }

  // Adiantamento
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(...SOFT);
  doc.text('\u2022  Adiantamento (' + pctNum + '%) para confirmar: ' + formatMoney(depositV) + '   \u2022  Saldo no dia: ' + formatMoney(remainV), 18, y);
  y += 14;

  // Linha divisora
  doc.setDrawColor(...RG);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);
  y += 10;

  // -- Bloco: condicoes de pagamento --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...RG);
  doc.text('CONDICOES DE PAGAMENTO', 14, y);
  y += 8;

  const condicoes = isNoiva ? [
    'Para a reserva da data e preciso um sinal de ' + pctNum + '% do valor via deposito bancario/PIX e o restante transferido de forma parcelada ou integral para minha conta ate o ultimo dia util antes do casamento.',
    'Eu produzo no maximo uma acompanhante, cujo valor esta ao final do anexo. Mas caso precise de equipe para mais pessoas, so me solicitar que podemos viabilizar!',
    'Caso queira fechar um servico pos cerimonia, que inclui retoque de cabelo e maquiagem e ate mesmo troca de penteado caso desejado, ha um adicional de R$ 500,00 no valor da noiva.'
  ] : [
    'Para a reserva da data e necessario um sinal de ' + pctNum + '% do valor via PIX/deposito. O saldo restante de ' + formatMoney(remainV) + ' sera pago no dia do evento.',
    'Caso precise remarcar, me avise com no minimo 48h de antecedencia.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  condicoes.forEach(function(p) {
    const lines = doc.splitTextToSize(p, W - 32);
    doc.text(lines, 18, y);
    y += lines.length * 5.8 + 5;
  });

  y += 6;
  doc.setDrawColor(...RG);
  doc.setLineWidth(0.3);
  doc.line(14, y, W - 14, y);
  y += 10;

  // -- Bloco: carta pessoal --
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...RG);
  doc.text('MENSAGEM PESSOAL', 14, y);
  y += 8;

  const cartaParas = isNoiva ? [
    'Ola!',
    'Desde ja agradeco seu contato e interesse em meu trabalho!',
    'Segue em anexo o orcamento para o dia da noiva. Esse dia e reservado exclusivamente para voce, ou seja, terei minha total dedicacao em sua producao para que ela esteja impecavel! Este orcamento e valido para o local que me solicitou e ate 30 dias a partir desta data.',
    'Inclui previa, que e um dia destinado a fazer toda a producao de maquiagem e penteado que sera feita no dia. Ela e realizada na minha sala, na data combinada.',
    'Tudo e acordado via contrato, assegurando nosso compromisso no seu grande dia.'
  ] : [
    'Ola, ' + (quote.clientName || '') + '!',
    'Desde ja agradeco seu contato e interesse em meu trabalho!',
    'Estou a disposicao para esclarecer qualquer duvida. Sera um prazer cuidar da sua producao!'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  cartaParas.forEach(function(p) {
    const lines = doc.splitTextToSize(p, W - 32);
    doc.text(lines, 18, y);
    y += lines.length * 5.8 + 4;
  });

  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(...SOFT);
  doc.text('Qualquer duvida estarei a disposicao para esclarecer.', 18, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.text('Atenciosamente,', 18, y);

  // Rodape pagina 2
  doc.setFillColor(...DARK);
  doc.rect(0, H - 22, W, 22, 'F');
  doc.setFillColor(...RG);
  doc.rect(0, H - 22, W, 1, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text('Camila Soares Makeup Artist  @makeupcamilasoares  (11) 99999-9999', W / 2, H - 13, { align: 'center' });

  const fname = 'Orcamento_' + quote.id + '_' + (quote.clientName || 'cliente').replace(/\s+/g, '_') + '.pdf';
  doc.save(fname);
  showToast('PDF gerado com sucesso!');
}

// Bullets por servico (pagina 2 do PDF)
function getServiceBullets(type) {
  const m = {
    noiva:     ['Atendimento exclusivo e personalizado', 'Inclui previa da producao', 'Produtos de alta qualidade e durabilidade', 'Participacao no making of (foto e filmagem)'],
    madrinhas: ['Atendimento personalizado para cada madrinha', 'Harmonizacao do visual com a noiva', 'Produtos de alta qualidade', 'Pontualidade e profissionalismo'],
    formatura: ['Make completa para o grande momento', 'Produtos de alta fixacao e durabilidade', 'Atendimento personalizado', 'Ideal para fotos e celebracoes prolongadas'],
    ensaio:    ['Make especial para ensaio fotografico', 'Producao adequada para iluminacao', 'Produtos de alta fixacao', 'Atendimento personalizado'],
    evento:    ['Make social para ocasioes especiais', 'Produtos de longa duracao', 'Atendimento personalizado', 'Producao adequada para o evento'],
    social:    ['Make social elegante e refinada', 'Produtos de qualidade e durabilidade', 'Atendimento personalizado'],
    aula:      ['Aula pratica de maquiagem personalizada', 'Dicas e tecnicas exclusivas', 'Material incluso na aula', 'Certificado de participacao']
  };
  return m[type] || ['Atendimento personalizado', 'Produtos de alta qualidade', 'Profissionalismo e dedicacao'];
}

// ===================== FATURAMENTO =====================
function loadFaturamento() {
  const all = getAll();
  const now = new Date();
  const yearSel = document.getElementById('yearFilter');

  // Populate year filter
  const years = [...new Set(all.map(q => q.eventDate?.substring(0, 4)).filter(Boolean))];
  if (!years.includes(String(now.getFullYear()))) years.push(String(now.getFullYear()));
  years.sort().reverse();

  if (yearSel) {
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === String(now.getFullYear())) opt.selected = true;
      yearSel.appendChild(opt);
    });
    yearSel.addEventListener('change', () => renderFaturamento(parseInt(yearSel.value)));
  }

  renderFaturamento(now.getFullYear());
}

function renderFaturamento(year) {
  const all = getAll();
  const now = new Date();

  const paid = all.filter(q => q.status === 'pago' && q.eventDate && q.eventDate.startsWith(String(year)));

  const annual = paid.reduce((s, q) => s + (q.total || 0), 0);

  const mesAtualData = paid.filter(q => {
    const d = new Date(q.eventDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === year;
  });
  const mesAtual = mesAtualData.reduce((s, q) => s + (q.total || 0), 0);

  // Monthly data
  const monthly = Array(12).fill(0);
  paid.forEach(q => {
    const m = new Date(q.eventDate).getMonth();
    monthly[m] += q.total || 0;
  });

  const nonZero = monthly.filter(v => v > 0);
  const media = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  const maxMonth = monthly.indexOf(Math.max(...monthly));
  const melhorMes = Math.max(...monthly) > 0 ? `${MONTHS_FULL[maxMonth]} (${formatMoney(monthly[maxMonth])})` : '—';

  setText('fatTotal', formatMoney(annual));
  setText('fatMesAtual', formatMoney(mesAtual));
  setText('fatMedia', formatMoney(media));
  setText('fatMelhor', melhorMes);

  // Revenue chart
  buildRevenueChart(monthly);

  // Services chart
  const servCounts = {};
  all.filter(q => q.status === 'pago' && q.eventDate?.startsWith(String(year)))
    .forEach(q => { servCounts[q.serviceType] = (servCounts[q.serviceType] || 0) + 1; });
  buildServicosChart(servCounts);

  // Status chart
  const statusCounts = { pendente: 0, aprovado: 0, pago: 0, cancelado: 0 };
  all.filter(q => q.eventDate?.startsWith(String(year)) || q.createdAt?.startsWith(String(year)))
    .forEach(q => { if (statusCounts[q.status] !== undefined) statusCounts[q.status]++; });
  buildStatusChart(statusCounts);

  // Payment method chart
  const paymentCounts = {};
  paid.forEach(q => { paymentCounts[q.paymentMethod] = (paymentCounts[q.paymentMethod] || 0) + 1; });
  buildPaymentChart(paymentCounts);

  // Transactions table
  buildTransactionsTable(paid);
}

let chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function buildRevenueChart(monthly) {
  destroyChart('revenueChart');
  const canvas = document.getElementById('revenueChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  chartInstances.revenueChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: MONTHS,
      datasets: [{
        label: 'Receita',
        data: monthly,
        backgroundColor: monthly.map((_, i) => i % 2 === 0 ? '#C9956C' : '#8B4B6B'),
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => formatMoney(ctx.raw) } }
      },
      scales: {
        y: { ticks: { callback: v => formatMoney(v), font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function buildServicosChart(data) {
  destroyChart('servicosChart');
  const canvas = document.getElementById('servicosChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const keys = Object.keys(data);
  chartInstances.servicosChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: keys.map(k => SERVICE_LABELS[k] || k),
      datasets: [{
        data: keys.map(k => data[k]),
        backgroundColor: ['#C9956C','#8B4B6B','#DEB896','#6B3553','#A67B5B','#3D2B2B'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 12 } }
      },
      cutout: '65%'
    }
  });
}

function buildStatusChart(data) {
  destroyChart('statusChart');
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const colors = ['#F59E0B', '#3B82F6', '#10B981', '#EF4444'];
  const keys = ['pendente', 'aprovado', 'pago', 'cancelado'];
  const vals = keys.map(k => data[k] || 0);
  chartInstances.statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: keys.map(statusLabel),
      datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: '70%'
    }
  });

  // Custom legend
  const legend = document.getElementById('statusLegend');
  if (legend) {
    legend.innerHTML = keys.map((k, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:12px;height:12px;border-radius:3px;background:${colors[i]};flex-shrink:0"></div>
        <span style="font-size:.82rem;color:var(--text)">${statusLabel(k)}</span>
        <span style="font-size:.82rem;font-weight:600;color:var(--dark-soft);margin-left:auto">${vals[i]}</span>
      </div>
    `).join('');
  }
}

function buildPaymentChart(data) {
  destroyChart('paymentChart');
  const canvas = document.getElementById('paymentChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const keys = Object.keys(data);
  if (!keys.length) {
    canvas.parentElement.innerHTML = `<div class="empty-state"><i class="fas fa-credit-card"></i><p>Sem dados de pagamento</p></div>`;
    return;
  }
  chartInstances.paymentChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: keys.map(k => PAYMENT_LABELS[k] || k),
      datasets: [{
        data: keys.map(k => data[k]),
        backgroundColor: ['#C9956C','#8B4B6B','#DEB896','#6B3553','#A67B5B'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, padding: 10 } } }
    }
  });
}

function buildTransactionsTable(paid) {
  const container = document.getElementById('transactionsContainer');
  if (!container) return;
  if (!paid.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>Nenhuma transação registrada</p></div>`;
    return;
  }
  const sorted = [...paid].sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Serviço</th>
          <th>Data</th>
          <th>Pagamento</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(q => `
          <tr>
            <td>
              <div class="table-name">${q.clientName}</div>
              <div class="table-sub">${q.id}</div>
            </td>
            <td>${SERVICE_LABELS[q.serviceType] || q.serviceType || '—'}</td>
            <td>${formatDate(q.eventDate)}</td>
            <td>${PAYMENT_LABELS[q.paymentMethod] || q.paymentMethod || '—'}</td>
            <td><strong style="color:var(--status-paid)">${formatMoney(q.total)}</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// ===================== UTILS =====================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}
