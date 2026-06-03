/* ============================================================
   MAKEUP CAMILA SOARES — Faturamento Aprimorado
   Receita · Despesas · Lucro · Conversão · Filtros
   ============================================================ */
'use strict';

let _fatYear = new Date().getFullYear();
let _chartInstances = {};

// ── Bootstrap ─────────────────────────────────────────────
async function loadFaturamentoV2() {
  await DB.prefetchAll(['camilaOrcamentos', 'camilaCustos']);
  const yearSel = document.getElementById('yearFilter');
  const now     = new Date();

  // Popula seletor de ano
  const quotes   = _fatGetAll();
  const custos   = _fatGetCustos();
  const years = [...new Set([
    ...quotes.map(q => q.eventDate?.substring(0, 4)).filter(Boolean),
    ...custos.map(c => c.date?.substring(0, 4)).filter(Boolean),
    String(now.getFullYear())
  ])].sort().reverse();

  if (yearSel) {
    yearSel.innerHTML = '';
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      if (y === String(now.getFullYear())) opt.selected = true;
      yearSel.appendChild(opt);
    });
    yearSel.addEventListener('change', () => {
      _fatYear = parseInt(yearSel.value);
      renderFaturamentoV2(_fatYear);
    });
  }

  _fatYear = now.getFullYear();
  renderFaturamentoV2(_fatYear);
}

// ── Render principal ──────────────────────────────────────
function renderFaturamentoV2(year) {
  const quotes    = _fatGetAll();
  const custos    = _fatGetCustos();
  const now       = new Date();

  const paid = quotes.filter(q => q.status === 'pago' && q.eventDate?.startsWith(String(year)));
  const annual  = paid.reduce((s, q) => s + (q.total || 0), 0);

  const despesasAnual = custos
    .filter(c => c.date?.startsWith(String(year)))
    .reduce((s, c) => s + (c.amount || 0), 0);

  const lucro   = annual - despesasAnual;
  const margem  = annual > 0 ? (lucro / annual) * 100 : 0;

  // Mês atual
  const mesAtualData = paid.filter(q => {
    const d = new Date(q.eventDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === year;
  });
  const mesAtual = mesAtualData.reduce((s, q) => s + (q.total || 0), 0);

  // Média mensal (meses com receita)
  const monthly = _monthlyRevenue(paid);
  const nonZero = monthly.filter(v => v > 0);
  const media   = nonZero.length ? nonZero.reduce((a, b) => a + b, 0) / nonZero.length : 0;
  const maxMonthIdx = monthly.indexOf(Math.max(...monthly));
  const melhorMes   = Math.max(...monthly) > 0
    ? `${_MONTHS_FULL[maxMonthIdx]} (${_fmtM(monthly[maxMonthIdx])})` : '—';

  // Taxa de conversão
  const totalQuotes    = quotes.filter(q =>
    q.createdAt?.startsWith(String(year)) || q.eventDate?.startsWith(String(year))).length;
  const paidQuotes     = quotes.filter(q => q.status === 'pago').length;
  const approvedQuotes = quotes.filter(q => q.status === 'aprovado' || q.status === 'pago').length;
  const convRate = totalQuotes > 0 ? ((paidQuotes / totalQuotes) * 100).toFixed(0) : 0;

  // KPI cards
  _setText('fatTotal',      _fmtM(annual));
  _setText('fatDespesas',   _fmtM(despesasAnual));
  _setText('fatLucro',      _fmtM(lucro));
  _setText('fatMargem',     `${margem.toFixed(0)}%`);
  _setText('fatMesAtual',   _fmtM(mesAtual));
  _setText('fatMedia',      _fmtM(media));
  _setText('fatMelhor',     melhorMes);
  _setText('fatConversao',  `${convRate}%`);
  _setText('fatPropostas',  totalQuotes);
  _setText('fatAprovadas',  approvedQuotes);
  _setText('fatPagas',      paidQuotes);

  // Color lucro card
  const lucroEl = document.getElementById('fatLucro');
  if (lucroEl) lucroEl.style.color = lucro >= 0 ? '#059669' : '#DC2626';

  // Charts
  _buildRevenueExpensesChart(year, monthly, custos);
  _buildConversionChart(totalQuotes, approvedQuotes, paidQuotes);
  _buildServicosChart2(year, quotes);
  _buildDespesasCatChart(year, custos);
  _buildStatusChart2(year, quotes);
  _buildPaymentChart2(paid);
  _buildTransactionsTable2(paid);
}

// ── Gráfico: Receita × Despesas × Lucro ──────────────────
function _buildRevenueExpensesChart(year, revenueMonthly, custos) {
  _destroyChart('revenueExpensesChart');
  const canvas = document.getElementById('revenueExpensesChart');
  if (!canvas) return;

  const expenseMonthly = Array(12).fill(0);
  custos.filter(c => c.date?.startsWith(String(year))).forEach(c => {
    const m = new Date(c.date).getMonth();
    expenseMonthly[m] += c.amount || 0;
  });
  const profitMonthly = revenueMonthly.map((r, i) => r - expenseMonthly[i]);

  _chartInstances.revenueExpensesChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: _MONTHS,
      datasets: [
        {
          label: 'Receita',
          data: revenueMonthly,
          backgroundColor: 'rgba(201,149,108,.85)',
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'Despesas',
          data: expenseMonthly,
          backgroundColor: 'rgba(239,68,68,.75)',
          borderRadius: 6,
          borderSkipped: false
        },
        {
          label: 'Lucro',
          data: profitMonthly,
          type: 'line',
          borderColor: '#10B981',
          backgroundColor: 'rgba(16,185,129,.1)',
          pointBackgroundColor: '#10B981',
          tension: 0.35,
          fill: false,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${_fmtM(ctx.raw)}` } }
      },
      scales: {
        y: {
          ticks: { callback: v => _fmtM(v), font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,.05)' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── Gráfico: Funil de Conversão ───────────────────────────
function _buildConversionChart(total, approved, paid) {
  _destroyChart('conversionChart');
  const canvas = document.getElementById('conversionChart');
  if (!canvas) return;

  const approvedPct = total > 0 ? ((approved / total) * 100).toFixed(0) : 0;
  const paidPct     = total > 0 ? ((paid    / total) * 100).toFixed(0) : 0;

  _chartInstances.conversionChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: [
        `Propostas criadas (${total})`,
        `Aprovadas (${approved})  ${approvedPct}%`,
        `Pagas (${paid})  ${paidPct}%`
      ],
      datasets: [{
        data: [total, approved, paid],
        backgroundColor: [
          'rgba(201,149,108,.85)',
          'rgba(59,130,246,.85)',
          'rgba(16,185,129,.85)'
        ],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => `${ctx.raw} orçamentos` } }
      },
      scales: {
        x: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 10 } } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ── Gráfico: Serviços por receita ─────────────────────────
function _buildServicosChart2(year, quotes) {
  _destroyChart('servicosChart');
  const canvas = document.getElementById('servicosChart');
  if (!canvas) return;

  const filter = document.getElementById('servicoFilter')?.value || '';
  let data = quotes.filter(q => q.status === 'pago' && q.eventDate?.startsWith(String(year)));
  if (filter) data = data.filter(q => q.serviceType === filter);

  const counts = {};
  const revenue = {};
  data.forEach(q => {
    counts[q.serviceType]  = (counts[q.serviceType]  || 0) + 1;
    revenue[q.serviceType] = (revenue[q.serviceType] || 0) + (q.total || 0);
  });

  const keys = Object.keys(counts).sort((a, b) => revenue[b] - revenue[a]);
  const labels = keys.map(k => _SVC_LABELS[k] || k);

  _chartInstances.servicosChart = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Receita',
          data: keys.map(k => revenue[k]),
          backgroundColor: ['#C9956C','#8B4B6B','#DEB896','#6B3553','#A67B5B','#3D2B2B','#5B8B4B'],
          borderRadius: 8,
          borderSkipped: false,
          yAxisID: 'yRevenue'
        },
        {
          label: 'Atendimentos',
          data: keys.map(k => counts[k]),
          type: 'line',
          borderColor: '#6B3553',
          backgroundColor: 'rgba(107,53,83,.1)',
          pointBackgroundColor: '#6B3553',
          tension: 0.3,
          fill: false,
          yAxisID: 'yCount'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, padding: 10 } },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label === 'Receita'
              ? `Receita: ${_fmtM(ctx.raw)}`
              : `Atendimentos: ${ctx.raw}`
          }
        }
      },
      scales: {
        yRevenue: {
          type: 'linear',
          position: 'left',
          ticks: { callback: v => _fmtM(v), font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,.05)' }
        },
        yCount: {
          type: 'linear',
          position: 'right',
          ticks: { stepSize: 1, font: { size: 10 } },
          grid: { display: false }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

// ── Gráfico: Despesas por Categoria ──────────────────────
function _buildDespesasCatChart(year, custos) {
  _destroyChart('despesasChart');
  const canvas = document.getElementById('despesasChart');
  if (!canvas) return;

  const byCat = {};
  custos.filter(c => c.date?.startsWith(String(year))).forEach(c => {
    const cat = c.category || 'outros';
    // Disaggregate main records
    if (c.isMain) {
      if (c.custoDeslocamento > 0) byCat['deslocamento'] = (byCat['deslocamento'] || 0) + c.custoDeslocamento;
      if (c.custoPedagio      > 0) byCat['pedagio']      = (byCat['pedagio']      || 0) + c.custoPedagio;
      if (c.custoMaterial     > 0) byCat['material']     = (byCat['material']     || 0) + c.custoMaterial;
      if (c.custoAssistente   > 0) byCat['assistente']   = (byCat['assistente']   || 0) + c.custoAssistente;
      if (c.custoEstacionamento > 0) byCat['estacionamento'] = (byCat['estacionamento'] || 0) + c.custoEstacionamento;
      if (c.custoAlimentacao  > 0) byCat['alimentacao']  = (byCat['alimentacao']  || 0) + c.custoAlimentacao;
      if (c.custoOutros       > 0) byCat['outros']       = (byCat['outros']       || 0) + c.custoOutros;
    } else {
      byCat[cat] = (byCat[cat] || 0) + (c.amount || 0);
    }
  });

  const CAT_LABELS = {
    deslocamento: 'Deslocamento', pedagio: 'Pedágio', material: 'Material',
    assistente: 'Assistente', estacionamento: 'Estacionamento',
    alimentacao: 'Alimentação', outros: 'Outros', atendimento: 'Atendimento'
  };
  const CAT_COLORS = ['#C9956C','#EF4444','#8B4B6B','#A67B5B','#4B6B8B','#6B3553','#3D2B2B','#DEB896'];

  const keys = Object.keys(byCat).filter(k => byCat[k] > 0);
  if (!keys.length) {
    canvas.parentElement.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>Sem despesas registradas este ano</p></div>`;
    return;
  }

  _chartInstances.despesasChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: keys.map(k => CAT_LABELS[k] || k),
      datasets: [{
        data: keys.map(k => byCat[k]),
        backgroundColor: CAT_COLORS.slice(0, keys.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 }, padding: 12 } },
        tooltip: { callbacks: { label: ctx => `${ctx.label}: ${_fmtM(ctx.raw)}` } }
      },
      cutout: '60%'
    }
  });
}

// ── Gráfico: Status ───────────────────────────────────────
function _buildStatusChart2(year, quotes) {
  _destroyChart('statusChart');
  const canvas = document.getElementById('statusChart');
  if (!canvas) return;

  const yr = String(year);
  const filtered = quotes.filter(q => q.eventDate?.startsWith(yr) || q.createdAt?.startsWith(yr));
  const vals = ['pendente','aprovado','pago','cancelado'].map(s => filtered.filter(q => q.status === s).length);
  const colors = ['#F59E0B','#3B82F6','#10B981','#EF4444'];
  const labels = ['Pendente','Aprovado','Pago','Cancelado'];

  _chartInstances.statusChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data: vals, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      cutout: '70%'
    }
  });

  const legend = document.getElementById('statusLegend');
  if (legend) {
    legend.innerHTML = labels.map((lbl, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:12px;height:12px;border-radius:3px;background:${colors[i]};flex-shrink:0"></div>
        <span style="font-size:.82rem;color:var(--text)">${lbl}</span>
        <span style="font-size:.82rem;font-weight:600;color:var(--dark-soft);margin-left:auto">${vals[i]}</span>
      </div>`).join('');
  }
}

// ── Gráfico: Pagamento ────────────────────────────────────
function _buildPaymentChart2(paid) {
  _destroyChart('paymentChart');
  const canvas = document.getElementById('paymentChart');
  if (!canvas) return;

  const PAY_LABELS = { pix:'PIX', dinheiro:'Dinheiro', cartao_debito:'Cartão Débito', cartao_credito:'Cartão Crédito', transferencia:'Transferência' };
  const data = {};
  paid.forEach(q => { data[q.paymentMethod] = (data[q.paymentMethod] || 0) + 1; });
  const keys = Object.keys(data);

  if (!keys.length) {
    canvas.parentElement.innerHTML = `<div class="empty-state"><i class="fas fa-credit-card"></i><p>Sem dados de pagamento</p></div>`;
    return;
  }

  _chartInstances.paymentChart = new Chart(canvas.getContext('2d'), {
    type: 'pie',
    data: {
      labels: keys.map(k => PAY_LABELS[k] || k),
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

// ── Tabela de transações ──────────────────────────────────
function _buildTransactionsTable2(paid) {
  const container = document.getElementById('transactionsContainer');
  if (!container) return;
  if (!paid.length) {
    container.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>Nenhuma transação registrada</p></div>`;
    return;
  }

  const custos = _fatGetCustos();
  const sorted = [...paid].sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));

  const rows = sorted.map(q => {
    const bookingCusto = custos.filter(c => c.bookingId === q.id).reduce((s, c) => s + (c.amount || 0), 0);
    const custo = bookingCusto || 0;
    const lucro = (q.total || 0) - custo;
    const PAY_LABELS = { pix:'PIX', dinheiro:'Dinheiro', cartao_debito:'Cartão Débito', cartao_credito:'Cartão Crédito', transferencia:'Transferência' };
    return `
      <tr>
        <td>
          <div style="font-weight:600;font-size:.87rem">${q.clientName}</div>
          <div style="font-size:.73rem;color:var(--text-light)">${q.id}</div>
        </td>
        <td>${_SVC_LABELS[q.serviceType] || q.serviceType || '—'}</td>
        <td>${_fmtDate(q.eventDate)}</td>
        <td>${PAY_LABELS[q.paymentMethod] || q.paymentMethod || '—'}</td>
        <td style="font-weight:700;color:#059669">${_fmtM(q.total)}</td>
        <td style="color:#DC2626">${custo > 0 ? _fmtM(custo) : '—'}</td>
        <td style="font-weight:700;color:${lucro >= 0 ? '#059669' : '#DC2626'}">${_fmtM(lucro)}</td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Cliente</th>
          <th>Serviço</th>
          <th>Data</th>
          <th>Pagamento</th>
          <th>Receita</th>
          <th>Custos</th>
          <th>Lucro</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Helpers de storage ────────────────────────────────────
function _fatGetAll() {
  try { return JSON.parse(localStorage.getItem('camilaOrcamentos') || '[]'); }
  catch { return []; }
}

function _fatGetCustos() {
  try { return JSON.parse(localStorage.getItem('camilaCustos') || '[]'); }
  catch { return []; }
}

function _monthlyRevenue(paid) {
  const months = Array(12).fill(0);
  paid.forEach(q => {
    const m = new Date(q.eventDate).getMonth();
    months[m] += q.total || 0;
  });
  return months;
}

// ── Helpers de formato ────────────────────────────────────
function _fmtM(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function _fmtDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function _setText(id, v) {
  const e = document.getElementById(id); if (e) e.textContent = v;
}

function _destroyChart(id) {
  if (_chartInstances[id]) { _chartInstances[id].destroy(); delete _chartInstances[id]; }
}

const _MONTHS      = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const _MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const _SVC_LABELS  = {
  noiva:'Noiva', formatura:'Formatura', ensaio:'Ensaio Fotográfico',
  evento:'Evento Social', social:'Make Social', aula:'Aula Particular',
  madrinhas:'Madrinhas', outro:'Outro'
};
