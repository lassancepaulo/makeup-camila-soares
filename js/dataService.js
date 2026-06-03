/* ============================================================
   MAKEUP CAMILA SOARES — Data Service (MVP Backend Layer)

   Architecture: localStorage now → REST API ready.

   All methods mirror REST patterns so the app can migrate to
   a real backend (Node/Supabase/Firebase) by replacing the
   _read/_write internals without touching callers.

   Entities:
     bookings  → agendamentos (key: camilaAgendamentos)
     quotes    → orçamentos   (key: camilaOrcamentos)
     clients   → clientes/leads (key: camilaClientes)
     costs     → custos        (key: camilaCustos)

   Future app modules this data powers:
     Agendamento · Faturamento · Leads/CRM · Custo ·
     Deslocamento · Negociação · Andamento
   ============================================================ */

'use strict';

const DS = {

  // ── Storage keys ──────────────────────────────────────────
  _keys: {
    bookings: 'camilaAgendamentos',
    quotes:   'camilaOrcamentos',
    clients:  'camilaClientes',
    costs:    'camilaCustos'
  },

  // ── Core I/O ──────────────────────────────────────────────
  _read(entity) {
    try { return JSON.parse(localStorage.getItem(this._keys[entity]) || '[]'); }
    catch { return []; }
  },

  _write(entity, data) {
    localStorage.setItem(this._keys[entity], JSON.stringify(data));
    if (window.DB) DB.sync(this._keys[entity], data);
  },

  // ── CRUD ──────────────────────────────────────────────────

  /** GET /api/{entity}?filters */
  getAll(entity, filters = {}) {
    let data = this._read(entity);
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '')
        data = data.filter(item => item[k] === v);
    });
    return data;
  },

  /** GET /api/{entity}/:id */
  getById(entity, id) {
    return this._read(entity).find(item => item.id === id) || null;
  },

  /** POST /api/{entity} */
  create(entity, data) {
    const all  = this._read(entity);
    const item = { ...data, createdAt: data.createdAt || new Date().toISOString() };
    all.unshift(item);
    this._write(entity, all);
    return item;
  },

  /** PATCH /api/{entity}/:id */
  update(entity, id, changes) {
    const all = this._read(entity);
    const idx = all.findIndex(item => item.id === id);
    if (idx < 0) return null;
    all[idx] = { ...all[idx], ...changes, updatedAt: new Date().toISOString() };
    this._write(entity, all);
    return all[idx];
  },

  /** DELETE /api/{entity}/:id */
  remove(entity, id) {
    this._write(entity, this._read(entity).filter(item => item.id !== id));
  },

  // ── Bookings ───────────────────────────────────────────────

  createBooking(data) {
    const booking = this.create('bookings', data);
    this.upsertClient({
      name:     booking.clientName,
      phone:    booking.clientPhone,
      email:    booking.clientEmail,
      source:   'site',
      bookingId: booking.id
    });
    return booking;
  },

  updateBookingStatus(id, status, extra = {}) {
    const ts = {};
    if (status === 'confirmado')    ts.confirmedAt   = new Date().toISOString();
    if (status === 'entrada_paga')  ts.depositPaidAt = new Date().toISOString();
    if (status === 'concluido')     ts.completedAt   = new Date().toISOString();
    return this.update('bookings', id, { status, ...ts, ...extra });
  },

  getBookingsThisMonth() {
    const now = new Date();
    return this._read('bookings').filter(b => {
      const d = new Date(b.eventDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  },

  // ── Revenue aggregation ────────────────────────────────────

  /**
   * Returns monthly revenue for a given year.
   * Includes: quotes (pago) + bookings (entrada_paga / concluido).
   * @param {number} year — e.g. 2026
   * @returns {number[]} Array[12] with totals per month (Jan–Dec)
   */
  getMonthlyRevenue(year) {
    const months = Array(12).fill(0);

    this._read('quotes')
      .filter(q => q.status === 'pago')
      .forEach(q => {
        const d = new Date(q.eventDate || q.createdAt);
        if (!year || d.getFullYear() === year) months[d.getMonth()] += q.total || 0;
      });

    this._read('bookings')
      .filter(b => b.status === 'entrada_paga' || b.status === 'concluido')
      .forEach(b => {
        const d = new Date(b.eventDate);
        if (!year || d.getFullYear() === year) {
          if (b.status === 'concluido')    months[d.getMonth()] += b.totalValue    || 0;
          else /* entrada_paga */          months[d.getMonth()] += b.depositValue  || 0;
        }
      });

    return months;
  },

  /** Total received (deposits + full payments from bookings) */
  getBookingRevenueSummary() {
    const bookings = this._read('bookings');
    return {
      totalReceived: bookings
        .filter(b => ['entrada_paga','concluido'].includes(b.status))
        .reduce((s, b) => {
          return s + (b.status === 'concluido' ? (b.totalValue || 0) : (b.depositValue || 0));
        }, 0),
      depositsPending: bookings
        .filter(b => b.status === 'confirmado')
        .reduce((s, b) => s + (b.depositValue || 0), 0),
      remainingPending: bookings
        .filter(b => b.status === 'entrada_paga')
        .reduce((s, b) => s + (b.remainingValue || 0), 0)
    };
  },

  // ── Clients / CRM ──────────────────────────────────────────

  upsertClient({ name, phone, email, source, bookingId, quoteId }) {
    const all       = this._read('clients');
    const cleanPhone = (phone || '').replace(/\D/g, '');
    const idx = all.findIndex(c => (c.phone || '').replace(/\D/g, '') === cleanPhone);

    if (idx >= 0) {
      all[idx].bookingCount  = (all[idx].bookingCount || 0) + (bookingId ? 1 : 0);
      all[idx].quoteCount    = (all[idx].quoteCount   || 0) + (quoteId   ? 1 : 0);
      if (bookingId) all[idx].lastBookingId = bookingId;
      if (quoteId)   all[idx].lastQuoteId   = quoteId;
      all[idx].updatedAt = new Date().toISOString();
    } else {
      all.unshift({
        id:           `CLI-${Date.now()}`,
        name:         name   || '',
        phone:        phone  || '',
        email:        email  || '',
        source:       source || 'site',
        status:       'lead',
        bookingCount: bookingId ? 1 : 0,
        quoteCount:   quoteId   ? 1 : 0,
        lastBookingId: bookingId || null,
        lastQuoteId:   quoteId   || null,
        notes:        '',
        createdAt:    new Date().toISOString()
      });
    }
    this._write('clients', all);
  },

  // ── Costs ─────────────────────────────────────────────────

  addCost({ description, amount, category, bookingId, date }) {
    return this.create('costs', {
      id:          `COST-${Date.now()}`,
      description: description || '',
      amount:      parseFloat(amount) || 0,
      category:    category || 'outros',   // deslocamento | produto | taxa | outros
      bookingId:   bookingId || null,
      date:        date || new Date().toISOString().split('T')[0]
    });
  },

  // ── Stats snapshot (for dashboard / future API endpoint) ──

  getSnapshot() {
    const bookings = this._read('bookings');
    const quotes   = this._read('quotes');
    const clients  = this._read('clients');

    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();

    const thisMonthBookings = bookings.filter(b => {
      const d = new Date(b.eventDate);
      return d.getMonth() === month && d.getFullYear() === year;
    });

    return {
      bookings: {
        total:       bookings.length,
        pendente:    bookings.filter(b => b.status === 'pendente').length,
        confirmado:  bookings.filter(b => b.status === 'confirmado').length,
        entrada_paga: bookings.filter(b => b.status === 'entrada_paga').length,
        concluido:   bookings.filter(b => b.status === 'concluido').length,
        thisMonth:   thisMonthBookings.length
      },
      quotes: {
        total:    quotes.length,
        pendente: quotes.filter(q => q.status === 'pendente').length,
        pago:     quotes.filter(q => q.status === 'pago').length
      },
      clients: {
        total: clients.length,
        leads: clients.filter(c => c.status === 'lead').length
      },
      revenue: this.getBookingRevenueSummary()
    };
  }
};
