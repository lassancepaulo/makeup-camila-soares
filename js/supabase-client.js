'use strict';

const _SUPA_URL = 'https://tnbrntnycifdoknxuouo.supabase.co';
const _SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuYnJudG55Y2lmZG9rbnh1b3VvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NDI2MTcsImV4cCI6MjA4ODUxODYxN30.wAdg-z8F8bHMA4PuLfWXnTKpfeF2nF0232m7W5Sv9Ik';

window.SUPABASE = supabase.createClient(_SUPA_URL, _SUPA_KEY);

// Mapa: chave localStorage → tabela Supabase
const _LS_TABLE = {
  camilaOrcamentos:   'makeup_orcamentos',
  camilaAgendamentos: 'makeup_agendamentos',
  camilaClientes:     'makeup_clientes',
  camilaCustos:       'makeup_custos',
  camilaEstoque:      'makeup_estoque',
  camilaPipeline:     'makeup_pipeline',
};

window.DB = {
  // Carrega entidade do Supabase → localStorage (prefetch no init da página)
  async prefetch(lsKey) {
    const table = _LS_TABLE[lsKey];
    if (!table) return;
    try {
      const { data, error } = await window.SUPABASE
        .from(table)
        .select('id, data')
        .order('created_at', { ascending: false });
      if (!error && data) {
        localStorage.setItem(lsKey, JSON.stringify(data.map(r => r.data)));
      }
    } catch (e) {
      console.warn('[DB] prefetch falhou:', lsKey, e);
    }
  },

  // Sincroniza array completo para o Supabase (upsert + remove órfãos)
  async sync(lsKey, items) {
    const table = _LS_TABLE[lsKey];
    if (!table) return;
    try {
      const valid = (items || []).filter(i => i && i.id);

      if (valid.length > 0) {
        const rows = valid.map(item => ({
          id: item.id,
          data: item,
          created_at: item.createdAt || new Date().toISOString()
        }));
        await window.SUPABASE.from(table).upsert(rows, { onConflict: 'id' });

        // Remove linhas que não estão mais no array local
        const ids = valid.map(i => `"${i.id}"`).join(',');
        await window.SUPABASE.from(table).delete().not('id', 'in', `(${ids})`);
      } else {
        // Array esvaziado — apaga tudo
        await window.SUPABASE.from(table).delete().neq('id', '__placeholder__');
      }
    } catch (e) {
      console.warn('[DB] sync falhou:', lsKey, e);
    }
  },

  // Lê configuração pontual (meta, studioAddress, fuelPrefs)
  async getConfig(key) {
    try {
      const { data } = await window.SUPABASE
        .from('makeup_config')
        .select('value')
        .eq('key', key)
        .single();
      return data ? data.value : null;
    } catch { return null; }
  },

  // Salva configuração pontual
  async setConfig(key, value) {
    try {
      await window.SUPABASE
        .from('makeup_config')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    } catch (e) {
      console.warn('[DB] setConfig falhou:', key, e);
    }
  },

  // Pré-carrega múltiplas entidades em paralelo
  async prefetchAll(keys) {
    await Promise.all(keys.map(k => this.prefetch(k)));
  },

  // Faz upload de imagem para o bucket 'portfolio' do Supabase Storage
  async uploadPortfolioImage(file) {
    try {
      const ext = file.name.split('.').pop();
      const path = Date.now() + '_' + Math.random().toString(36).slice(2) + '.' + ext;
      const { error } = await window.SUPABASE.storage
        .from('portfolio')
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = window.SUPABASE.storage.from('portfolio').getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.warn('[DB] uploadPortfolioImage falhou:', e);
      return null;
    }
  },

  // Remove imagem do bucket 'portfolio' pelo URL público
  async deletePortfolioImage(publicUrl) {
    try {
      const marker = '/object/public/portfolio/';
      const idx = publicUrl.indexOf(marker);
      if (idx === -1) return;
      const path = publicUrl.slice(idx + marker.length);
      await window.SUPABASE.storage.from('portfolio').remove([path]);
    } catch (e) {
      console.warn('[DB] deletePortfolioImage falhou:', e);
    }
  }
};
