(function () {
  'use strict';

  // Scroll reveal (service pages don't use main.js)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('aos-visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('[data-aos]:not(.aos-visible)').forEach(function (el) {
      io.observe(el);
    });
  }

  // Home banner: GIF / video / YouTube from localStorage
  function initHomeBanner() {
    var wrap = document.getElementById('home-banner-media');
    var def  = document.getElementById('banner-default');
    if (!wrap) return;
    try {
      var cfg = JSON.parse(localStorage.getItem('camilaSiteConfig') || '{}');
      var url = (cfg.homeBanner && cfg.homeBanner.url) ? cfg.homeBanner.url.trim() : '';
      if (!url) return;
      var el;
      var ytMatch = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
      if (ytMatch) {
        el = document.createElement('iframe');
        el.src = 'https://www.youtube.com/embed/' + ytMatch[1]
          + '?autoplay=1&mute=1&loop=1&playlist=' + ytMatch[1] + '&controls=0&rel=0';
        el.setAttribute('frameborder', '0');
        el.setAttribute('allow', 'autoplay; encrypted-media');
        el.setAttribute('allowfullscreen', '');
      } else if (/\.(mp4|webm|ogg)$/i.test(url)) {
        el = document.createElement('video');
        el.src = url;
        el.autoplay = true;
        el.muted    = true;
        el.loop     = true;
        el.setAttribute('playsinline', '');
      } else {
        // GIF or static image
        el = document.createElement('img');
        el.src = url;
        el.alt = 'Camila Soares Makeup';
      }
      if (el) {
        wrap.innerHTML = '';
        wrap.appendChild(el);
        if (def) def.style.display = 'none';
      }
    } catch (e) {}
  }

  // Service gallery: loads portfolio images by category + optional video
  function initServiceGallery() {
    var grid = document.getElementById('svcGallery');
    if (!grid) return;
    var cat = grid.getAttribute('data-category') || '';
    try {
      var cfg     = JSON.parse(localStorage.getItem('camilaSiteConfig') || '{}');
      var vidUrl  = (cfg.serviceVideos && cfg.serviceVideos[cat]) ? cfg.serviceVideos[cat] : '';
      var imgs    = [];
      if (cfg.portfolio && Array.isArray(cfg.portfolio.images)) {
        imgs = cfg.portfolio.images.filter(function (i) { return i.category === cat; });
      }

      var html = '';

      // Video slot (full-width)
      if (vidUrl) {
        var ytM = vidUrl.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
        if (ytM) {
          html += '<div class="sg-video-card"><iframe src="https://www.youtube.com/embed/' + ytM[1]
            + '?autoplay=1&mute=1&loop=1&playlist=' + ytM[1] + '&controls=1" frameborder="0"'
            + ' allow="autoplay; encrypted-media" allowfullscreen></iframe></div>';
        } else if (/\.(mp4|webm)$/i.test(vidUrl)) {
          html += '<div class="sg-video-card"><video src="' + vidUrl
            + '" autoplay muted loop playsinline></video></div>';
        }
      }

      // Photo cards
      if (imgs.length > 0) {
        html += imgs.map(function (img) {
          return '<div class="sg-card"><img src="' + img.url + '" alt="'
            + (img.title || '') + '" loading="lazy" /></div>';
        }).join('');
      } else if (!vidUrl) {
        // Placeholders
        var ph = [
          { icon: 'fa-camera',    label: 'Fotos em breve' },
          { icon: 'fa-images',    label: 'Galeria exclusiva' },
          { icon: 'fa-heart',     label: 'Momentos especiais' },
          { icon: 'fa-star',      label: 'Beleza que transforma' },
          { icon: 'fa-magic',     label: 'Produções únicas' },
          { icon: 'fa-gem',       label: 'Portfólio em preparação' }
        ];
        html += ph.slice(0, 6).map(function (p) {
          return '<div class="sg-card sg-placeholder"><i class="fas ' + p.icon + '"></i>'
            + '<span>' + p.label + '</span></div>';
        }).join('');
      }

      grid.innerHTML = html;
    } catch (e) {
      grid.innerHTML = '<div class="sg-card sg-placeholder"><i class="fas fa-camera"></i>'
        + '<span>Galeria em breve</span></div>';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initHomeBanner();
      initServiceGallery();
    });
  } else {
    initHomeBanner();
    initServiceGallery();
  }
})();
