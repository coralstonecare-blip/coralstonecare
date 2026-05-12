(function () {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function isInChrome(el) {
    return !!el.closest('nav, footer, header');
  }

  function init() {
    var headings = document.querySelectorAll('h1, h2, h3');
    headings.forEach(function (el) {
      if (isInChrome(el)) return;
      el.classList.add('scroll-fade');
    });

    var grids = document.querySelectorAll('section .grid');
    grids.forEach(function (grid) {
      if (isInChrome(grid)) return;
      grid.classList.add('scroll-fade-stagger');
      Array.prototype.forEach.call(grid.children, function (child) {
        child.classList.add('scroll-fade');
      });
    });

    var sectionParagraphs = document.querySelectorAll('section > div > div > p, section > div > p');
    sectionParagraphs.forEach(function (p) {
      if (isInChrome(p)) return;
      p.classList.add('scroll-fade');
    });

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.scroll-fade').forEach(function (el) {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
