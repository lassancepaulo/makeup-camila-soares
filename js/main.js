/* ============================================================
   MAKEUP CAMILA SOARES — Main JavaScript
   ============================================================ */

'use strict';

// ---------- NAVBAR ----------
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

navToggle?.addEventListener('click', () => {
  navLinks.classList.toggle('open');
  document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
});

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ---------- SCROLL ANIMATIONS ----------
function checkAos() {
  const vh = window.innerHeight;
  let pending = 0;
  document.querySelectorAll('[data-aos]:not(.aos-visible)').forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh - 20) {
      setTimeout(() => el.classList.add('aos-visible'), pending * 70);
      pending++;
    }
  });
}

// Run on scroll, load, and periodically until all visible
window.addEventListener('scroll', checkAos, { passive: true });
window.addEventListener('load', () => {
  checkAos();
  // Periodic fallback for first 3 seconds
  let t = 0;
  const interval = setInterval(() => {
    checkAos();
    t += 300;
    if (t >= 3000) clearInterval(interval);
  }, 300);
});

// ---------- NAVBAR ACTIVE LINK ----------
const sections = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-link:not(.nav-cta)');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinkEls.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
      });
    }
  });
}, { threshold: 0.3 });

sections.forEach(s => sectionObserver.observe(s));

// ---------- PORTFOLIO FILTER ----------
const filterBtns = document.querySelectorAll('.filter-btn');
const portfolioItems = document.querySelectorAll('.portfolio-item');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    portfolioItems.forEach(item => {
      const cat = item.dataset.category;
      const show = filter === 'all' || cat === filter;

      item.style.transition = 'opacity .3s, transform .3s';

      if (show) {
        item.style.display = 'block';
        requestAnimationFrame(() => {
          item.style.opacity = '1';
          item.style.transform = 'scale(1)';
        });
      } else {
        item.style.opacity = '0';
        item.style.transform = 'scale(.96)';
        setTimeout(() => { item.style.display = 'none'; }, 300);
      }
    });
  });
});

// ---------- TESTIMONIAL SLIDER ----------
const track = document.getElementById('depoimentosTrack');
const dotsContainer = document.getElementById('sliderDots');
const prevBtn = document.getElementById('sliderPrev');
const nextBtn = document.getElementById('sliderNext');

if (track) {
  const cards = track.querySelectorAll('.depoimento-card');
  let current = 0;
  let perView = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
  const total = Math.ceil(cards.length / perView);

  // Create dots
  for (let i = 0; i < total; i++) {
    const dot = document.createElement('button');
    dot.className = `slider-dot${i === 0 ? ' active' : ''}`;
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, total - 1));
    const cardWidth = cards[0].offsetWidth + 24; // gap
    track.style.transform = `translateX(-${current * cardWidth * perView}px)`;
    dotsContainer.querySelectorAll('.slider-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1));
  nextBtn?.addEventListener('click', () => goTo(current + 1));

  // Auto play
  let autoplay = setInterval(() => goTo((current + 1) % total), 5000);

  track.addEventListener('mouseenter', () => clearInterval(autoplay));
  track.addEventListener('mouseleave', () => {
    autoplay = setInterval(() => goTo((current + 1) % total), 5000);
  });

  // Touch swipe
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) goTo(dx < 0 ? current + 1 : current - 1);
  });

  window.addEventListener('resize', () => {
    const newPerView = window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1;
    if (newPerView !== perView) {
      perView = newPerView;
      goTo(0);
    }
  });
}

// ---------- LIGHTBOX ----------
const lightbox = document.getElementById('lightbox');
const lightboxClose = document.getElementById('lightboxClose');

document.querySelectorAll('.portfolio-zoom').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
});

lightboxClose?.addEventListener('click', closeLightbox);
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

function closeLightbox() {
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeLightbox();
});

// ---------- CONTACT FORM ----------
const form = document.getElementById('contatoForm');
const formSuccess = document.getElementById('formSuccess');

form?.addEventListener('submit', (e) => {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const servico = document.getElementById('servico').value;
  const data = document.getElementById('data').value;
  const mensagem = document.getElementById('mensagem').value.trim();

  const servicoMap = {
    noiva: 'Maquiagem de Noiva',
    formatura: 'Formatura',
    ensaio: 'Ensaio Fotográfico',
    evento: 'Evento Social',
    social: 'Make Social',
    aula: 'Aula Particular',
    outro: 'Outro'
  };

  let msg = `Olá Camila! Vim pelo site e gostaria de solicitar um orçamento.\n\n`;
  msg += `*Nome:* ${nome}\n`;
  msg += `*Telefone:* ${telefone}\n`;
  if (servico) msg += `*Serviço:* ${servicoMap[servico] || servico}\n`;
  if (data) msg += `*Data do evento:* ${formatDate(data)}\n`;
  if (mensagem) msg += `\n*Mensagem:* ${mensagem}`;

  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/5511999999999?text=${encoded}`, '_blank');

  form.style.display = 'none';
  formSuccess.style.display = 'block';

  setTimeout(() => {
    form.style.display = 'block';
    formSuccess.style.display = 'none';
    form.reset();
  }, 6000);
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// ---------- PHONE MASK ----------
const telInput = document.getElementById('telefone');
telInput?.addEventListener('input', () => {
  let val = telInput.value.replace(/\D/g, '').substring(0, 11);
  if (val.length > 6) val = `(${val.slice(0,2)}) ${val.slice(2,7)}-${val.slice(7)}`;
  else if (val.length > 2) val = `(${val.slice(0,2)}) ${val.slice(2)}`;
  else if (val.length > 0) val = `(${val}`;
  telInput.value = val;
});

// ---------- SMOOTH SCROLL ----------
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});
