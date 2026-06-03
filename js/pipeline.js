'use strict';

const PIPELINE_COLS = [
  { id: 'lead',       label: 'Lead',             icon: 'fa-user-plus',    color: '#6B7280' },
  { id: 'contato',    label: 'Em Contato',        icon: 'fa-phone',        color: '#2563EB' },
  { id: 'orcamento',  label: 'Orçamento Enviado', icon: 'fa-file-invoice', color: '#D97706' },
  { id: 'negociando', label: 'Negociando',        icon: 'fa-handshake',    color: '#7C3AED' },
  { id: 'fechado',    label: 'Fechado',           icon: 'fa-check-circle', color: '#059669' },
  { id: 'perdido',    label: 'Perdido',           icon: 'fa-times-circle', color: '#DC2626' },
];

let _pipelineData  = [];
let _editingCardId = null;
let _dragCardId    = null;

async function loadPipeline() {
  await DB.prefetch('camilaPipeline');
  _pipelineData = JSON.parse(localStorage.getItem('camilaPipeline') || '[]');
  _renderPipeline();
  _renderPipelineStats();
}

function _savePipeline() {
  localStorage.setItem('camilaPipeline', JSON.stringify(_pipelineData));
  DB.sync('camilaPipeline', _pipelineData);
}

function _renderPipelineStats() {
  const total    = _pipelineData.length;
  const fechados = _pipelineData.filter(c => c.stage === 'fechado').length;
  const perdidos = _pipelineData.filter(c => c.stage === 'perdido').length;
  const ativos   = total - fechados - perdidos;
  const conv     = total > 0 ? Math.round(fechados / total * 100) : 0;
  const pipeline = _pipelineData
    .filter(c => c.stage !== 'perdido' && c.value)
    .reduce((s, c) => s + (parseFloat(c.value) || 0), 0);

  _setText('plStat-total',    total);
  _setText('plStat-ativos',   ativos);
  _setText('plStat-conv',     `${conv}%`);
  _setText('plStat-pipeline', formatBRL(pipeline));
}

function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _renderPipeline() {
  const board = document.getElementById('pipelineBoard');
  if (!board) return;
  board.innerHTML = '';

  PIPELINE_COLS.forEach(col => {
    const cards      = _pipelineData.filter(c => c.stage === col.id);
    const totalValue = cards.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);

    const colEl = document.createElement('div');
    colEl.className = 'pipeline-col';
    colEl.dataset.stage = col.id;
    colEl.innerHTML = `
      <div class="pipeline-col-header" style="border-top:3px solid ${col.color}">
        <div class="pipeline-col-title">
          <i class="fas ${col.icon}" style="color:${col.color}"></i>
          ${col.label}
          <span class="pipeline-count">${cards.length}</span>
        </div>
        ${totalValue > 0 ? `<div class="pipeline-col-value">${formatBRL(totalValue)}</div>` : ''}
      </div>
      <div class="pipeline-cards" id="col-${col.id}"
           ondragover="event.preventDefault()"
           ondrop="pipelineDrop(event,'${col.id}')"></div>
      <button class="pipeline-add-btn" onclick="openPipelineNewCard('${col.id}')">
        <i class="fas fa-plus"></i> Adicionar
      </button>`;

    board.appendChild(colEl);

    const container = document.getElementById(`col-${col.id}`);
    [...cards].sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1)
              .forEach(card => container.appendChild(_buildPipelineCard(card)));
  });

  _renderPipelineStats();
}

function _buildPipelineCard(card) {
  const el      = document.createElement('div');
  el.className  = 'pipeline-card';
  el.draggable  = true;
  el.dataset.id = card.id;
  el.addEventListener('dragstart', () => { _dragCardId = card.id; el.classList.add('dragging'); });
  el.addEventListener('dragend',   () => el.classList.remove('dragging'));

  const phone        = (card.phone || '').replace(/\D/g, '');
  const waLink       = phone
    ? `<a href="https://wa.me/55${phone}" target="_blank" class="pipeline-wa-link" title="WhatsApp"><i class="fab fa-whatsapp"></i></a>`
    : '';
  const serviceLabel = _plServiceLabel(card.service);
  const dateLabel    = card.eventDate
    ? new Date(card.eventDate + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : '';
  const canConvert   = !['fechado','perdido'].includes(card.stage);

  el.innerHTML = `
    <div class="pipeline-card-header">
      <div class="pipeline-card-name">${card.name || 'Sem nome'}</div>
      ${waLink}
    </div>
    ${serviceLabel ? `<div class="pipeline-card-tag">${serviceLabel}</div>` : ''}
    ${card.value    ? `<div class="pipeline-card-value">${formatBRL(parseFloat(card.value))}</div>` : ''}
    ${dateLabel     ? `<div class="pipeline-card-date"><i class="fas fa-calendar"></i> ${dateLabel}</div>` : ''}
    ${card.notes    ? `<div class="pipeline-card-notes">${card.notes}</div>` : ''}
    <div class="pipeline-card-actions">
      <button class="pc-btn" onclick="openEditPipelineCard('${card.id}')" title="Editar"><i class="fas fa-pencil-alt"></i></button>
      <button class="pc-btn pc-btn-del" onclick="deletePipelineCard('${card.id}')" title="Remover"><i class="fas fa-trash"></i></button>
      ${canConvert ? `<button class="pc-btn pc-btn-quote" onclick="convertToQuote('${card.id}')" title="Converter em orçamento"><i class="fas fa-file-invoice"></i></button>` : ''}
    </div>`;
  return el;
}

function _plServiceLabel(type) {
  const map = { noiva: 'Noiva', madrinhas: 'Madrinhas', formatura: 'Formatura',
                ensaio: 'Ensaio', evento: 'Evento', social: 'Social', aula: 'Aula' };
  return map[type] || type || '';
}

function pipelineDrop(event, stage) {
  event.preventDefault();
  if (!_dragCardId) return;
  const card = _pipelineData.find(c => c.id === _dragCardId);
  if (card) { card.stage = stage; _savePipeline(); _renderPipeline(); }
  _dragCardId = null;
}

function openPipelineNewCard(stage) {
  _editingCardId = null;
  document.getElementById('pcModalTitle').textContent = 'Novo Prospect';
  document.getElementById('pcStage').value     = stage;
  document.getElementById('pcName').value      = '';
  document.getElementById('pcPhone').value     = '';
  document.getElementById('pcService').value   = '';
  document.getElementById('pcValue').value     = '';
  document.getElementById('pcEventDate').value = '';
  document.getElementById('pcNotes').value     = '';
  document.getElementById('pipelineCardModal').style.display = 'flex';
  document.getElementById('pcName').focus();
}

function openEditPipelineCard(id) {
  _editingCardId = id;
  const card = _pipelineData.find(c => c.id === id);
  if (!card) return;
  document.getElementById('pcModalTitle').textContent = 'Editar Prospect';
  document.getElementById('pcStage').value     = card.stage;
  document.getElementById('pcName').value      = card.name      || '';
  document.getElementById('pcPhone').value     = card.phone     || '';
  document.getElementById('pcService').value   = card.service   || '';
  document.getElementById('pcValue').value     = card.value     || '';
  document.getElementById('pcEventDate').value = card.eventDate || '';
  document.getElementById('pcNotes').value     = card.notes     || '';
  document.getElementById('pipelineCardModal').style.display = 'flex';
}

function savePipelineCard() {
  const name = document.getElementById('pcName').value.trim();
  if (!name) { alert('Informe o nome do prospect'); return; }

  const existing = _editingCardId ? _pipelineData.find(c => c.id === _editingCardId) : null;

  const data = {
    id:        _editingCardId || `pc_${Date.now()}`,
    stage:     document.getElementById('pcStage').value,
    name,
    phone:     document.getElementById('pcPhone').value.trim(),
    service:   document.getElementById('pcService').value,
    value:     document.getElementById('pcValue').value,
    eventDate: document.getElementById('pcEventDate').value,
    notes:     document.getElementById('pcNotes').value.trim(),
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
  };

  if (_editingCardId) {
    const idx = _pipelineData.findIndex(c => c.id === _editingCardId);
    if (idx >= 0) _pipelineData[idx] = data;
  } else {
    _pipelineData.unshift(data);
  }

  _savePipeline();
  _renderPipeline();
  closePipelineCardModal();
  showToast(_editingCardId ? 'Prospect atualizado!' : 'Prospect adicionado!');
}

function deletePipelineCard(id) {
  if (!confirm('Remover este prospect do pipeline?')) return;
  _pipelineData = _pipelineData.filter(c => c.id !== id);
  _savePipeline();
  _renderPipeline();
}

function closePipelineCardModal() {
  document.getElementById('pipelineCardModal').style.display = 'none';
}

function convertToQuote(cardId) {
  const card = _pipelineData.find(c => c.id === cardId);
  if (!card) return;
  sessionStorage.setItem('pipelineToQuote', JSON.stringify({
    clientName:  card.name,
    clientPhone: card.phone,
    serviceType: card.service,
    eventDate:   card.eventDate,
    totalValue:  card.value,
  }));
  // Mark card as orcamento stage
  card.stage = 'orcamento';
  _savePipeline();
  window.location.href = 'orcamento-novo.html';
}
