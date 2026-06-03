'use strict';

const ESTOQUE_CATS  = ['Base', 'Primer', 'Pó / Contorno', 'Blush / Iluminador', 'Sombras',
                       'Delineador / Lápis', 'Máscara de Cílios', 'Batom / Gloss',
                       'Fixador / Spray', 'Pincéis / Esponjas', 'Cuidados de Pele',
                       'Acessórios', 'Outros'];
const ESTOQUE_UNITS = ['un', 'ml', 'g'];

let _estoqueData      = [];
let _editingEstoqueId = null;

async function loadEstoque() {
  await DB.prefetch('camilaEstoque');
  _estoqueData = JSON.parse(localStorage.getItem('camilaEstoque') || '[]');
  _populateCatFilter();
  _renderEstoque();
  initEstoqueBadge();
}

function _saveEstoque() {
  localStorage.setItem('camilaEstoque', JSON.stringify(_estoqueData));
  DB.sync('camilaEstoque', _estoqueData);
  initEstoqueBadge();
}

// Called by any page that has #estoqueBadge in sidebar
function initEstoqueBadge() {
  const badge = document.getElementById('estoqueBadge');
  if (!badge) return;
  const data  = JSON.parse(localStorage.getItem('camilaEstoque') || '[]');
  const count = data.filter(i => i.qty <= i.minQty).length;
  if (count > 0) {
    badge.textContent   = count;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}

function _populateCatFilter() {
  const sel = document.getElementById('estoqueCatFilter');
  if (!sel) return;
  sel.innerHTML = '<option value="">Todas as categorias</option>' +
    ESTOQUE_CATS.map(c => `<option value="${c}">${c}</option>`).join('');
}

function _renderEstoque() {
  const filter  = document.getElementById('estoqueCatFilter')?.value || '';
  const search  = (document.getElementById('estoqueSearch')?.value || '').toLowerCase();
  const showLow = document.getElementById('estoqueShowLow')?.checked;

  let items = [..._estoqueData];
  if (filter)  items = items.filter(i => i.category === filter);
  if (search)  items = items.filter(i =>
    i.name.toLowerCase().includes(search) || (i.brand || '').toLowerCase().includes(search));
  if (showLow) items = items.filter(i => i.qty <= i.minQty);

  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const tbody = document.getElementById('estoqueBody');
  if (!tbody) return;

  if (items.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="estoque-empty">
      <i class="fas fa-boxes"></i><br>Nenhum produto encontrado</td></tr>`;
  } else {
    tbody.innerHTML = items.map(item => {
      const isOut = item.qty === 0;
      const isLow = !isOut && item.qty <= item.minQty;
      return `
        <tr class="${isOut ? 'row-out' : isLow ? 'row-low' : ''}">
          <td>
            <div class="est-item-name">${item.name}</div>
            ${item.brand ? `<div class="est-item-brand">${item.brand}</div>` : ''}
          </td>
          <td><span class="est-cat-badge">${item.category}</span></td>
          <td>
            <div class="est-qty-ctrl">
              <button onclick="adjustQty('${item.id}',-1)">−</button>
              <span class="${isOut ? 'qty-zero' : isLow ? 'qty-low' : ''}">${item.qty}</span>
              <button onclick="adjustQty('${item.id}',1)">+</button>
            </div>
            <div class="est-unit">${item.unit}</div>
          </td>
          <td class="est-min">${item.minQty} ${item.unit}</td>
          <td>
            ${isOut ? '<span class="est-badge est-badge-out">Sem estoque</span>' :
              isLow ? '<span class="est-badge est-badge-low"><i class="fas fa-exclamation-circle"></i> Repor</span>' :
                      '<span class="est-badge est-badge-ok"><i class="fas fa-check"></i> OK</span>'}
          </td>
          <td class="est-date">${item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('pt-BR') : '—'}</td>
          <td>
            <button class="btn-tbl" onclick="openEditEstoque('${item.id}')"><i class="fas fa-pencil-alt"></i></button>
            <button class="btn-tbl btn-tbl-del" onclick="deleteEstoque('${item.id}')"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    }).join('');
  }

  // KPI counters
  const total   = _estoqueData.length;
  const lowCount = _estoqueData.filter(i => i.qty > 0 && i.qty <= i.minQty).length;
  const outCount = _estoqueData.filter(i => i.qty === 0).length;
  _setText2('estoqueTotal', total);
  _setText2('estoqueLow',   lowCount);
  _setText2('estoqueOut',   outCount);
}

function _setText2(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function adjustQty(id, delta) {
  const item = _estoqueData.find(i => i.id === id);
  if (!item) return;
  item.qty       = Math.max(0, (item.qty || 0) + delta);
  item.updatedAt = new Date().toISOString();
  _saveEstoque();
  _renderEstoque();
}

function openNewEstoque() {
  _editingEstoqueId = null;
  document.getElementById('estoqueModalTitle').textContent = 'Novo Produto';
  ['estoqueName','estoqueBrand','estoqueQty','estoqueMinQty'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'estoqueQty' || id === 'estoqueMinQty' ? '1' : '';
  });
  document.getElementById('estoqueCategory').value = '';
  document.getElementById('estoqueUnit').value     = 'un';

  const catSel = document.getElementById('estoqueCategory');
  if (catSel && !catSel.options.length) {
    catSel.innerHTML = '<option value="">Selecione...</option>' +
      ESTOQUE_CATS.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  document.getElementById('estoqueModal').style.display = 'flex';
  document.getElementById('estoqueName').focus();
}

function openEditEstoque(id) {
  _editingEstoqueId = id;
  const item = _estoqueData.find(i => i.id === id);
  if (!item) return;
  document.getElementById('estoqueModalTitle').textContent = 'Editar Produto';
  document.getElementById('estoqueName').value     = item.name     || '';
  document.getElementById('estoqueBrand').value    = item.brand    || '';
  document.getElementById('estoqueCategory').value = item.category || '';
  document.getElementById('estoqueQty').value      = item.qty      ?? 1;
  document.getElementById('estoqueMinQty').value   = item.minQty   ?? 1;
  document.getElementById('estoqueUnit').value     = item.unit     || 'un';
  document.getElementById('estoqueModal').style.display = 'flex';
}

function saveEstoqueItem() {
  const name     = document.getElementById('estoqueName').value.trim();
  const category = document.getElementById('estoqueCategory').value;
  if (!name)     { alert('Informe o nome do produto'); return; }
  if (!category) { alert('Selecione a categoria');     return; }

  const existing = _editingEstoqueId ? _estoqueData.find(i => i.id === _editingEstoqueId) : null;

  const data = {
    id:        _editingEstoqueId || `est_${Date.now()}`,
    name,
    brand:     document.getElementById('estoqueBrand').value.trim(),
    category,
    qty:       parseInt(document.getElementById('estoqueQty').value)    || 0,
    minQty:    parseInt(document.getElementById('estoqueMinQty').value) || 1,
    unit:      document.getElementById('estoqueUnit').value,
    updatedAt: new Date().toISOString(),
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
  };

  if (_editingEstoqueId) {
    const idx = _estoqueData.findIndex(i => i.id === _editingEstoqueId);
    if (idx >= 0) _estoqueData[idx] = data;
  } else {
    _estoqueData.unshift(data);
  }

  _saveEstoque();
  _renderEstoque();
  closeEstoqueModal();
  showToast(_editingEstoqueId ? 'Produto atualizado!' : 'Produto cadastrado!');
}

function deleteEstoque(id) {
  if (!confirm('Remover este produto do estoque?')) return;
  _estoqueData = _estoqueData.filter(i => i.id !== id);
  _saveEstoque();
  _renderEstoque();
}

function closeEstoqueModal() {
  document.getElementById('estoqueModal').style.display = 'none';
}
