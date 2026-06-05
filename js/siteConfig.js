/* ============================================================
   MAKEUP CAMILA SOARES — Site Config (público)
   Lê localStorage['camilaSiteConfig'] e aplica ao DOM.
   Carregado ANTES de main.js para que os dados sejam aplicados
   logo que o DOM estiver pronto.
   ============================================================ */

const SITE_CONFIG_KEY = 'camilaSiteConfig';

// Configuração padrão (valores usados quando não há config salva)
const SITE_CONFIG_DEFAULT = {
  hero: {
    tagline:      '✦ Beleza que transforma ✦',
    title:        'Camila',
    titleItalic:  'Soares',
    subtitle:     'Makeup Artist Profissional',
    desc:         'Criando experiências únicas de beleza para os momentos mais especiais da sua vida',
    ctaPrimary:   'Agende sua consultoria',
    ctaSecondary: 'Ver portfólio',
    bgImage:      ''
  },
  sobre: {
    photo: '',
    text1: 'Com mais de 8 anos de experiência, Camila Soares se especializou em transformar beleza natural em arte. Formada pelos melhores cursos do Brasil, com certificações internacionais, cada trabalho é uma expressão única de talento e dedicação.',
    text2: 'Seja para o seu casamento, formatura ou evento especial, Camila garante que você se sinta deslumbrante e confiante. Produtos premium e técnicas modernas para uma make que dura o dia todo.'
  },
  servicos: {
    noiva:     { title: 'Noiva',              desc: 'Atendimento exclusivo e completo para o dia mais especial.' },
    madrinhas: { title: 'Madrinhas',           desc: 'Pacote especial para o grupo de madrinhas.' },
    formatura: { title: 'Formatura',           desc: 'Make sofisticada para eternizar seu momento de conquista.' },
    ensaio:    { title: 'Ensaio Fotográfico',  desc: 'Make artística e editorial para ensaios e campanhas.' },
    evento:    { title: 'Eventos Sociais',     desc: 'Make impecável para festas, aniversários e celebrações.' },
    aula:      { title: 'Aulas Particulares',  desc: 'Aprenda técnicas profissionais em aulas personalizadas.' }
  },
  contato: {
    whatsapp:  '5511999999999',
    instagram: 'makeupcamilasoares',
    email:     'contato@makeupcamilasoares.com',
    endereco:  'Domicílio e estúdio próprio'
  },
  depoimentos: [],   // vazio = usa os do HTML
  portfolio: {
    beholdFeedId: ''  // ID do feed Behold.so (vazio = usa portfólio estático)
  }
};

/* ---- Leitura ---- */
function getSiteConfig() {
  try {
    const raw = localStorage.getItem(SITE_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/* ---- Merge profundo config salva com defaults ---- */
function getMergedConfig() {
  const saved = getSiteConfig();
  if (!saved) return SITE_CONFIG_DEFAULT;
  // Merge superficial por seção
  return {
    hero:        Object.assign({}, SITE_CONFIG_DEFAULT.hero,        saved.hero        || {}),
    sobre:       Object.assign({}, SITE_CONFIG_DEFAULT.sobre,       saved.sobre       || {}),
    servicos:    Object.assign({}, SITE_CONFIG_DEFAULT.servicos,    saved.servicos    || {}),
    contato:     Object.assign({}, SITE_CONFIG_DEFAULT.contato,     saved.contato     || {}),
    depoimentos: saved.depoimentos && saved.depoimentos.length ? saved.depoimentos : [],
    portfolio:   Object.assign({}, SITE_CONFIG_DEFAULT.portfolio,   saved.portfolio   || {})
  };
}

/* ---- Aplicação ao DOM ---- */
function applySiteConfig() {
  const cfg = getMergedConfig();

  // ---- HERO ----
  _setText('.hero-tagline',   cfg.hero.tagline);
  _setText('.hero-subtitle',  cfg.hero.subtitle);
  _setText('.hero-desc',      cfg.hero.desc);

  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle && cfg.hero.title) {
    heroTitle.innerHTML = cfg.hero.title + ' <em>' + cfg.hero.titleItalic + '</em>';
  }

  const heroBtns = document.querySelectorAll('.hero-buttons .btn');
  if (heroBtns[0] && cfg.hero.ctaPrimary)   heroBtns[0].textContent = cfg.hero.ctaPrimary;
  if (heroBtns[1] && cfg.hero.ctaSecondary) heroBtns[1].textContent = cfg.hero.ctaSecondary;

  if (cfg.hero.bgImage) {
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) heroBg.style.backgroundImage = 'url(' + cfg.hero.bgImage + ')';
  }

  // ---- SOBRE ----
  if (cfg.sobre.photo) {
    // Tenta img já existente; senão pega o placeholder e substitui
    const sobreImg = document.querySelector('.image-frame img');
    const sobrePlaceholder = document.querySelector('.sobre-placeholder');
    if (sobreImg) {
      sobreImg.src = cfg.sobre.photo;
    } else if (sobrePlaceholder) {
      const img = document.createElement('img');
      img.src = cfg.sobre.photo;
      img.alt = 'Camila Soares';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit';
      sobrePlaceholder.replaceWith(img);
    }
  }

  // Texto do Sobre: substitui parágrafos pelo conteúdo salvo (separa por \n\n)
  if (cfg.sobre.text1) {
    const sobreContent = document.querySelector('.sobre-content');
    if (sobreContent) {
      const existingTexts = Array.from(sobreContent.querySelectorAll('.sobre-text'));
      const certs = sobreContent.querySelector('.sobre-certs');
      const paras = cfg.sobre.text1.split(/\n\n+/).map(function(t) { return t.trim(); }).filter(Boolean);
      if (existingTexts.length && paras.length) {
        existingTexts.forEach(function(el) { el.remove(); });
        paras.forEach(function(t) {
          var p = document.createElement('p');
          p.className = 'sobre-text';
          p.textContent = t;
          if (certs) sobreContent.insertBefore(p, certs);
          else sobreContent.appendChild(p);
        });
      }
    }
  }

  // Badges/Certificações
  if (cfg.sobre.cert1) _setText('#cert1-text', cfg.sobre.cert1);
  if (cfg.sobre.cert2) _setText('#cert2-text', cfg.sobre.cert2);
  if (cfg.sobre.cert3) _setText('#cert3-text', cfg.sobre.cert3);

  // ---- CONTATO ----
  const wppNum = cfg.contato.whatsapp.replace(/\D/g, '');
  const igHandle = cfg.contato.instagram.replace('@', '');
  const wppMsg = encodeURIComponent('Olá Camila! Gostaria de solicitar um orçamento.');

  // Atualiza todos os links WhatsApp
  document.querySelectorAll('a[href*="wa.me"]').forEach(function(a) {
    a.href = 'https://wa.me/' + wppNum + '?text=' + wppMsg;
  });

  // Botão de orçamento da seção de serviços
  const wppServBtn = document.getElementById('servicos-wpp-btn');
  if (wppServBtn) {
    wppServBtn.href = 'https://wa.me/' + wppNum +
      '?text=' + encodeURIComponent('Olá Camila! Gostaria de solicitar um orçamento para maquiagem.');
  }

  // Links e handle do Instagram (todos os links com instagram.com no href)
  document.querySelectorAll('a[href*="instagram.com"]').forEach(function(a) {
    a.href = 'https://instagram.com/' + igHandle;
  });
  _setText('#instagram-handle', '@' + igHandle);

  // Email — links e texto visível
  if (cfg.contato.email) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(function(a) {
      a.href = 'mailto:' + cfg.contato.email;
      if (a.textContent.includes('@')) a.textContent = cfg.contato.email;
    });
    document.querySelectorAll('.contato-value-email').forEach(function(el) {
      el.textContent = cfg.contato.email;
    });
  }

  // Textos de contato visíveis
  document.querySelectorAll('.contato-value-phone').forEach(function(el) {
    el.textContent = _formatPhone(wppNum);
  });
  document.querySelectorAll('.contato-value-ig').forEach(function(el) {
    el.textContent = '@' + igHandle;
  });

  // Endereço / local de atendimento
  if (cfg.contato.endereco) {
    document.querySelectorAll('.contato-value-local').forEach(function(el) {
      el.textContent = cfg.contato.endereco;
    });
  }

  // ---- DEPOIMENTOS ----
  if (cfg.depoimentos && cfg.depoimentos.length > 0) {
    const track = document.getElementById('depoimentosTrack');
    if (track) {
      track.innerHTML = cfg.depoimentos.map(function(d) {
        const stars = '<i class="fas fa-star"></i>'.repeat(d.stars || 5);
        return '<div class="depoimento-card">'
          + '<div class="stars">' + stars + '</div>'
          + '<p>"' + _escHtml(d.text) + '"</p>'
          + '<div class="depoimento-autor">'
          + '<div class="autor-avatar"><i class="fas fa-user"></i></div>'
          + '<div><strong>' + _escHtml(d.name) + '</strong><span>' + _escHtml(d.date || '') + '</span></div>'
          + '</div></div>';
      }).join('');
    }
  }

  // ---- PORTFOLIO / BEHOLD ----
  const feedId = cfg.portfolio && cfg.portfolio.beholdFeedId;
  const beholdContainer = document.getElementById('behold-feed-container');
  const portfolioGrid   = document.getElementById('portfolioGrid');
  const portfolioFilter = document.querySelector('.portfolio-filter');

  if (feedId) {
    // Oculta grid de placeholders
    if (portfolioGrid)   portfolioGrid.style.display   = 'none';
    if (portfolioFilter) portfolioFilter.style.display = 'none';
    // Insere widget com feed-id correto (custom element já registrado pelo script do <head>)
    if (beholdContainer) {
      beholdContainer.style.display = 'block';
      beholdContainer.innerHTML = '<behold-widget feed-id="' + feedId + '"></behold-widget>';
    }
  } else {
    if (beholdContainer) beholdContainer.style.display = 'none';
    if (portfolioGrid)   portfolioGrid.style.display   = '';
    if (portfolioFilter) portfolioFilter.style.display = '';
  }
}

/* ---- Helpers ---- */
function _setText(sel, val) {
  if (!val) return;
  const el = document.querySelector(sel);
  if (el) el.textContent = val;
}

function _escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _formatPhone(num) {
  // Formata 5511999999999 → (11) 99999-9999
  const n = num.replace(/\D/g,'').replace(/^55/,'');
  if (n.length === 11) return '(' + n.slice(0,2) + ') ' + n.slice(2,7) + '-' + n.slice(7);
  if (n.length === 10) return '(' + n.slice(0,2) + ') ' + n.slice(2,6) + '-' + n.slice(6);
  return num;
}

/* ---- Supabase: carrega config remota antes de aplicar ao DOM ---- */
async function _initFromSupabase() {
  if (!window.DB) return;
  try {
    const remote = await window.DB.getConfig('siteConfig');
    if (remote) localStorage.setItem(SITE_CONFIG_KEY, JSON.stringify(remote));
  } catch (e) {
    console.warn('[siteConfig] Supabase fetch falhou, usando localStorage', e);
  }
}

// Aplica assim que o DOM estiver pronto (busca Supabase antes)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async function () {
    await _initFromSupabase();
    applySiteConfig();
  });
} else {
  _initFromSupabase().then(applySiteConfig);
}
