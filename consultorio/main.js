(function () {
  'use strict';
  var doc = document.documentElement;
  doc.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  $('#yr').textContent = new Date().getFullYear();

  // Header: sólido al bajar, botón flotante de WhatsApp y menú activo
  var top = $('#top'), fab = $('.fab'), mbar = $('.mbar'), hero = $('.hero'), contact = $('#contacto');
  function onScroll() {
    var y = window.scrollY, past = y > hero.offsetHeight * 0.6;
    top.classList.toggle('is-solid', y > 40);
    fab.classList.toggle('is-on', past);
    // En el celular la barra se esconde al llegar a Contacto, que ya tiene los mismos botones
    mbar.classList.toggle('is-on', past && contact.getBoundingClientRect().top > window.innerHeight * 0.75);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var links = $$('.menu a');
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) spy.observe(s); });

  // Menú móvil
  var burger = $('.burger');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  burger.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  links.forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Aparición al hacer scroll
  var rv = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); rv.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(function (el, i) {
    el.style.transitionDelay = (i % 4) * 70 + 'ms';
    rv.observe(el);
  });

  // Contadores
  if (!reduce) {
    var cnt = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        cnt.unobserve(e.target);
        var el = e.target, end = +el.dataset.count, start = end > 1000 ? end - 60 : 0, t0 = null;
        (function step(t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / 1400, 1), k = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(start + (end - start) * k);
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: .6 });
    $$('[data-count]').forEach(function (el) { cnt.observe(el); });
  }

  // Videos: cargan y se reproducen solo cuando están en pantalla
  var saveData = navigator.connection && navigator.connection.saveData;
  var vids = $$('video[data-src]');
  if (reduce || saveData) {
    vids.forEach(function (v) {
      v.controls = true;
      v.preload = 'none';
      v.src = v.dataset.src;
    });
  } else {
    var vo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.src) v.src = v.dataset.src;
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else if (v.src) v.pause();
      });
    }, { threshold: .25 });
    vids.forEach(function (v) { vo.observe(v); });
  }

  // Mapa diferido
  var map = $('.map iframe');
  if (map) {
    var mo = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { map.src = map.dataset.src; mo.disconnect(); }
    }, { rootMargin: '400px' });
    mo.observe(map);
  }

  // Pestañas de casos de planificación digital
  var tabs = $$('.ctabs [role=tab]');
  function selectTab(t) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      $('#' + x.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var n = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(n); n.focus();
    });
  });

  // Imágenes sensibles
  $$('.sens').forEach(function (s) {
    var show = $('.sens__show', s), hide = s.nextElementSibling, inner = $$('.zoom', s);
    function set(hidden) {
      s.dataset.hidden = hidden;
      hide.hidden = hidden;
      inner.forEach(function (b) { b.tabIndex = hidden ? -1 : 0; });
    }
    show.addEventListener('click', function () { set(false); hide.focus(); });
    hide.addEventListener('click', function () { set(true); show.focus(); });
  });

  // Filtros de casos
  var fbtn = $$('.filters button'), figs = $$('#cases > figure');
  fbtn.forEach(function (b) {
    var f = b.dataset.f;
    $('small', b).textContent = figs.filter(function (g) { return f === 'all' || g.dataset.c.split(' ').indexOf(f) > -1; }).length;
    b.addEventListener('click', function () {
      fbtn.forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
      figs.forEach(function (g) { g.hidden = f !== 'all' && g.dataset.c.split(' ').indexOf(f) < 0; });
    });
  });

  // En el celular se muestran los primeros 6 casos y el resto con "Ver todos"
  var cases = $('#cases'), more = $('.more'), mq = matchMedia('(max-width: 760px)');
  function collapse() {
    var on = mq.matches && !cases.dataset.open;
    cases.classList.toggle('is-collapsed', on);
    var n = figs.filter(function (g) { return !g.hidden; }).length;
    more.hidden = !on || n <= 6;
    $('span', more).textContent = '(' + n + ')';
  }
  more.addEventListener('click', function () {
    cases.dataset.open = '1';
    collapse();
    var f = figs.filter(function (g) { return !g.hidden; })[6];
    if (f) { var b = $('.zoom', f); b.focus({ preventScroll: true }); }
  });
  fbtn.forEach(function (b) { b.addEventListener('click', collapse); });
  if (mq.addEventListener) mq.addEventListener('change', collapse);
  collapse();

  // Visor de imágenes
  var lb = $('#lb'), lbImg = $('img', lb), lbCap = $('.lb__cap', lb), group = [], idx = 0, opener = null;
  // En el celular vertical, los antes/después se muestran uno arriba del otro para que se vean grandes
  var lbBa = $('.lb__ba', lb), halves = $$('.lb__half', lb);
  var stackMq = matchMedia('(max-width: 760px) and (orientation: portrait)');
  function setSplit(b) {
    var sp = b.dataset.split, on = !!sp && stackMq.matches;
    lbImg.hidden = on; lbBa.hidden = !on;
    if (!on) return false;
    var w = +$('img', b).getAttribute('width'), h = +$('img', b).getAttribute('height');
    var cut = sp.split(',').map(Number);
    [[0, cut[0]], [cut[1], w]].forEach(function (r, i) {
      var hw = r[1] - r[0], el = halves[i], im = $('img', el);
      el.style.setProperty('--ar', hw / h);
      el.style.setProperty('--k', w / hw);
      el.style.setProperty('--o', r[0] / hw);
      im.src = b.dataset.full;
      im.alt = (i ? 'Después: ' : 'Antes: ') + caption(b);
    });
    return true;
  }
  function caption(btn) {
    var fig = btn.closest('figure');
    var c = fig && $('figcaption', fig);
    return (c && c.textContent) || $('img', btn).alt;
  }
  function show(i) {
    idx = (i + group.length) % group.length;
    var b = group[idx];
    if (!setSplit(b)) lbImg.src = b.dataset.full;
    lbImg.alt = $('img', b).alt;
    lbCap.textContent = caption(b) + (group.length > 1 ? '  ·  ' + (idx + 1) + ' / ' + group.length : '');
  }
  function visible(b) { return !b.closest('[hidden], [data-hidden=true]'); }
  $$('.zoom').forEach(function (b) {
    b.addEventListener('click', function () {
      var scope = b.closest('.cases, .cpanel, .tour') || document;
      group = $$('.zoom', scope).filter(visible);
      opener = b;
      show(group.indexOf(b));
      $('.lb__prev', lb).hidden = $('.lb__next', lb).hidden = group.length < 2;
      lb.showModal();
    });
  });
  $('.lb__x', lb).addEventListener('click', function () { lb.close(); });
  $('.lb__prev', lb).addEventListener('click', function () { show(idx - 1); });
  $('.lb__next', lb).addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
  });
  lb.addEventListener('close', function () { lbImg.removeAttribute('src'); if (opener) opener.focus(); });
  function reflow() { if (lb.open) show(idx); }
  if (stackMq.addEventListener) stackMq.addEventListener('change', reflow); else stackMq.addListener(reflow);
  var tx = null;
  lb.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50 && group.length > 1) show(idx + (dx < 0 ? 1 : -1));
  });
})();
