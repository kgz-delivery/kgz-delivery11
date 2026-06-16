/**
 * Плавное появление карточек и текста слева направо при загрузке страницы.
 * Без оверлея и без перехвата навигации.
 */
(function () {
  var STAGGER_MS = 55;
  var STAGGER_CAP_MS = 880;
  var AUTO_SELECTORS = [
    '.calc-hero > *',
    '.calc-toolbar',
    '.calc-panel',
    '.calc-sidebar',
    '.components-hero > *',
    '.comp-cat-title',
    '.builds-grid .build-card',
    '.buy-header-inner > *',
    '.product-detail > *',
    '.back-btn',
    '.buy-footer-inner > *',
    '.otz-header',
    '.otz-header > *',
    '.review-card',
    '.otz-placeholder-card',
    '.otz-back-wrap'
  ];

  var observer = null;
  var reduceMotion = false;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function staggerParent(el) {
    return el.closest(
      '.builds-grid, .comp-section, .about-values, .team-grid, .calc-layout, .calc-main, main, .otz-main, .buy-wrap'
    );
  }

  function applyStagger(els) {
    var groupIndex = {};

    els.forEach(function (el) {
      var parent = staggerParent(el);
      var key = parent ? parent.tagName + (parent.className || '') : '__page__';
      if (!groupIndex[key]) groupIndex[key] = 0;
      var idx = groupIndex[key];
      groupIndex[key] = idx + 1;
      el.style.setProperty('--reveal-delay', Math.min(idx * STAGGER_MS, STAGGER_CAP_MS) + 'ms');
    });
  }

  function autoTagTargets() {
    AUTO_SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        if (!el.classList.contains('reveal')) el.classList.add('reveal');
      });
    });
  }

  function showAll(els) {
    els.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  function initReveals() {
    reduceMotion = prefersReducedMotion();
    autoTagTargets();

    var els = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
    applyStagger(els);

    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (reduceMotion) {
      showAll(els);
      return;
    }

    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    els.forEach(function (el) {
      if (el.classList.contains('is-visible')) return;
      observer.observe(el);
    });
  }

  window.CyberSpaceReveal = { refresh: initReveals };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReveals);
  } else {
    initReveals();
  }
})();
