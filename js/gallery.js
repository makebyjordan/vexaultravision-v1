/* VEXA Gallery Page JS */
(function() {
  'use strict';

  // Header scroll
  var hdr = document.getElementById('hdr');
  window.addEventListener('scroll', function() {
    if (hdr) hdr.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });

  // Burger
  var burger   = document.getElementById('burger');
  var navLinks = document.getElementById('nav-links');
  if (burger && navLinks) {
    burger.addEventListener('click', function() { navLinks.classList.toggle('open'); });
  }

  // Filter buttons
  var filterBtns = document.querySelectorAll('.filter-btn');
  var galleryItems = document.querySelectorAll('.fg-item');

  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      var cat = btn.dataset.cat;
      galleryItems.forEach(function(item) {
        if (cat === 'all' || item.dataset.cat === cat) {
          item.classList.remove('hidden');
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });

  // Lazy image animations
  if ('IntersectionObserver' in window) {
    var imgObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          imgObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });

    galleryItems.forEach(function(item) {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'opacity .5s ease, transform .5s ease';
      imgObs.observe(item);
    });
  }

})();
