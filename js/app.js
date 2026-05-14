/* ═══════════════════════════════════════════════════
   VEXA ULTRA VISION — app.js
   Dual scroll-driven canvas: Video1 (WAVE) + Video2 (new)
   ═══════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ═══════════════════
     CONFIG
     ═══════════════════ */
  var V1_TOTAL  = 290;   // wave video frames (ajustado al quitar d'strict)
  var V2_TOTAL  = 241;   // new video frames
  var FRAME_EXT = 'jpg';

  /* ═══════════════════
     CANVAS 1 — WAVE
     ═══════════════════ */
  var canvas1 = document.getElementById('bgCanvas');
  var ctx1    = canvas1.getContext('2d', { alpha: false });
  var W, H, dpr;
  var img1Current = null;
  var draw1Needed = false;
  var frames1 = new Array(V1_TOTAL);
  var frame1Index = 0;

  /* ═══════════════════
     CANVAS 2 — New video
     ═══════════════════ */
  var canvas2 = document.getElementById('bgCanvas2');
  var ctx2    = canvas2.getContext('2d', { alpha: false });
  var img2Current = null;
  var draw2Needed = false;
  var frames2 = new Array(V2_TOTAL);
  var frame2Index = 0;

  /* Shared resize */
  function resizeCanvases() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    [canvas1, canvas2].forEach(function(c) {
      c.width  = Math.round(W * dpr);
      c.height = Math.round(H * dpr);
      c.style.width  = W + 'px';
      c.style.height = H + 'px';
    });
    ctx1.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw1Needed = true;
    draw2Needed = true;
  }
  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();

  /* Draw helper — cover fit + vignette + tint */
  function drawOnCtx(ctx, img) {
    if (!img || !img.naturalWidth) return;
    var ia = img.naturalWidth / img.naturalHeight;
    var ca = W / H;
    var dw, dh, ox = 0, oy = 0;
    if (ia > ca) { dh = H; dw = H * ia; ox = (W - dw) / 2; }
    else          { dw = W; dh = W / ia; oy = (H - dh) / 2; }
    ctx.drawImage(img, ox, oy, dw, dh);
    var g = ctx.createRadialGradient(W/2, H/2, H*.22, W/2, H/2, H*.9);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.68)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,12,22,.17)';
    ctx.fillRect(0, 0, W, H);
  }

  /* RAF render loop */
  function renderLoop() {
    if (draw1Needed && img1Current) { drawOnCtx(ctx1, img1Current); draw1Needed = false; }
    if (draw2Needed && img2Current) { drawOnCtx(ctx2, img2Current); draw2Needed = false; }
    requestAnimationFrame(renderLoop);
  }
  renderLoop();

  /* Set frame helpers */
  function setFrame1(idx) {
    idx = Math.max(0, Math.min(V1_TOTAL - 1, Math.round(idx)));
    if (idx === frame1Index && img1Current) return;
    frame1Index = idx;
    var img = frames1[idx];
    if (img && img.complete && img.naturalWidth) { img1Current = img; draw1Needed = true; }
  }
  function setFrame2(idx) {
    idx = Math.max(0, Math.min(V2_TOTAL - 1, Math.round(idx)));
    if (idx === frame2Index && img2Current) return;
    frame2Index = idx;
    var img = frames2[idx];
    if (img && img.complete && img.naturalWidth) { img2Current = img; draw2Needed = true; }
  }

  /* ═══════════════════
     LOADER
     ═══════════════════ */
  var loaderEl = document.getElementById('loader');
  var ldBar    = document.getElementById('ld-bar');
  var ldPct    = document.getElementById('ld-pct');
  var loaded1  = 0, loaded2 = 0;
  var TOTAL_ALL = V1_TOTAL + V2_TOTAL;

  function updateLoader() {
    var p = ((loaded1 + loaded2) / TOTAL_ALL) * 100;
    if (ldBar) ldBar.style.width = p + '%';
    if (ldPct) ldPct.textContent = Math.round(p) + '%';
  }

  function pad4(n) { var s = '' + n; while (s.length < 4) s = '0' + s; return s; }

  /* ═══════════════════
     PROGRESSIVE LOADING
     Priority: first 20 frames of each video, then batch the rest
     ═══════════════════ */
  var priority1Done = 0, priority2Done = 0;
  var PRIORITY = 20;
  var appReady = false;

  function checkReady() {
    if (!appReady && priority1Done >= PRIORITY && priority2Done >= PRIORITY) {
      appReady = true;
      setTimeout(function() {
        if (loaderEl) loaderEl.classList.add('out');
        initApp();
      }, 300);
    }
  }

  /* Load video 1 priority */
  for (var p1 = 1; p1 <= PRIORITY; p1++) {
    (function(idx) {
      var img = new Image();
      frames1[idx - 1] = img;
      img.onload = function() {
        loaded1++; priority1Done++;
        updateLoader();
        if (idx === 1) { img1Current = img; draw1Needed = true; }
        checkReady();
        if (priority1Done === PRIORITY) loadBatch1(PRIORITY + 1);
      };
      img.onerror = function() { loaded1++; priority1Done++; updateLoader(); checkReady(); if (priority1Done === PRIORITY) loadBatch1(PRIORITY + 1); };
      img.src = 'assets/video/frame_' + pad4(idx) + '.' + FRAME_EXT;
    })(p1);
  }

  /* Load video 2 priority */
  for (var p2 = 1; p2 <= PRIORITY; p2++) {
    (function(idx) {
      var img = new Image();
      frames2[idx - 1] = img;
      img.onload = function() {
        loaded2++; priority2Done++;
        updateLoader();
        if (idx === 1) { img2Current = img; } // pre-load but don't draw yet
        checkReady();
        if (priority2Done === PRIORITY) loadBatch2(PRIORITY + 1);
      };
      img.onerror = function() { loaded2++; priority2Done++; updateLoader(); checkReady(); if (priority2Done === PRIORITY) loadBatch2(PRIORITY + 1); };
      img.src = 'assets/video2/frame2_' + pad4(idx) + '.' + FRAME_EXT;
    })(p2);
  }

  function loadBatch1(start) {
    if (start > V1_TOTAL) return;
    var end = Math.min(start + 29, V1_TOTAL);
    for (var i = start; i <= end; i++) {
      (function(idx) {
        var img = new Image();
        frames1[idx - 1] = img;
        img.onload = function() { loaded1++; updateLoader(); };
        img.onerror = function() { loaded1++; };
        img.src = 'assets/video/frame_' + pad4(idx) + '.' + FRAME_EXT;
      })(i);
    }
    if (end < V1_TOTAL) setTimeout(function() { loadBatch1(end + 1); }, 50);
  }

  function loadBatch2(start) {
    if (start > V2_TOTAL) return;
    var end = Math.min(start + 29, V2_TOTAL);
    for (var i = start; i <= end; i++) {
      (function(idx) {
        var img = new Image();
        frames2[idx - 1] = img;
        img.onload = function() { loaded2++; updateLoader(); };
        img.onerror = function() { loaded2++; };
        img.src = 'assets/video2/frame2_' + pad4(idx) + '.' + FRAME_EXT;
      })(i);
    }
    if (end < V2_TOTAL) setTimeout(function() { loadBatch2(end + 1); }, 50);
  }

  /* ═══════════════════
     INIT APP
     ═══════════════════ */
  function initApp() {
    /* Header scroll */
    var hdr = document.getElementById('hdr');
    if (hdr) {
      window.addEventListener('scroll', function() {
        hdr.classList.toggle('scrolled', window.scrollY > 80);
      }, { passive: true });
    }

    /* Burger */
    var burger   = document.getElementById('burger');
    var navLinks = document.getElementById('nav-links');
    if (burger && navLinks) {
      burger.addEventListener('click', function() { navLinks.classList.toggle('open'); });
    }

    /* Load GSAP + ScrollTrigger + Lenis from CDN */
    var s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js';
    s1.onload = function() {
      var s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/gsap@3/dist/ScrollTrigger.min.js';
      s2.onload = function() {
        var s3 = document.createElement('script');
        s3.src = 'https://cdn.jsdelivr.net/npm/lenis@1/dist/lenis.min.js';
        s3.onload = initGSAP;
        document.head.appendChild(s3);
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }

  /* ═══════════════════
     GSAP SCROLL LOGIC
     ═══════════════════ */
  function initGSAP() {
    gsap.registerPlugin(ScrollTrigger);

    var lenis = new Lenis({
      duration: 1.1,
      easing: function(t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function(t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    var sc   = document.getElementById('sc');
    var sc2  = document.getElementById('sc2');
    var hero = document.getElementById('hero');
    var dov  = document.getElementById('dov');
    var med1 = document.getElementById('media1');
    var med2 = document.getElementById('media2');

    /* ─────────────────────────────────────
       VIDEO 1 SCRUB (sc → canvas1 visible)
       ───────────────────────────────────── */
    var lastF1 = -1;
    ScrollTrigger.create({
      trigger: sc, start: 'top top', end: 'bottom bottom', scrub: 1.6,
      onUpdate: function(self) {
        var t = Math.floor(self.progress * (V1_TOTAL - 1) * 1.05); // Finishes exactly with the end of sc
        t = Math.min(t, V1_TOTAL - 1);
        if (t !== lastF1) { setFrame1(t); lastF1 = t; }
      }
    });

    /* ─────────────────────────────────────
       DARK OVERLAY for stats section (sc)
       ───────────────────────────────────── */
    var DE = 0.47, DL = 0.65, FR = 0.03;
    ScrollTrigger.create({
      trigger: sc, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: function(self) {
        var p = self.progress, o = 0;
        if (p >= DE - FR && p <= DE)   o = (p - (DE - FR)) / FR;
        else if (p > DE && p < DL)     o = 1;
        else if (p >= DL && p <= DL+FR) o = 1 - (p - DL) / FR;
        dov.style.opacity = Math.max(0, Math.min(.93, o));
      }
    });

    /* ─────────────────────────────────────
       HERO FADE (fades out as sc scrolls)
       ───────────────────────────────────── */
    ScrollTrigger.create({
      trigger: sc, start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: function(self) {
        var o = Math.max(0, 1 - self.progress / 0.11);
        hero.style.opacity = o;
        hero.style.pointerEvents = o > 0.01 ? '' : 'none';
      }
    });

    /* ─────────────────────────────────────
       CANVAS SWAP: media1 ↔ media2
       When sc2 enters viewport → show media2, hide media1
       When sc2 leaves → restore media1
       ───────────────────────────────────── */
    ScrollTrigger.create({
      trigger: sc2,
      start: 'top bottom',  // Trigger exactly when sc ends and sc2 begins for a seamless transition
      end: 'bottom top',
      onEnter: function() {
        med1.style.opacity = '0';
        med2.style.opacity = '1';
        med2.classList.remove('media-hidden');
      },
      onLeaveBack: function() {
        med1.style.opacity = '1';
        med2.style.opacity = '0';
      }
    });

    /* ─────────────────────────────────────
       VIDEO 2 SCRUB (sc2 → canvas2)
       ───────────────────────────────────── */
    var lastF2 = -1;
    ScrollTrigger.create({
      trigger: sc2, start: 'top top', end: 'bottom bottom', scrub: 1.6,
      onUpdate: function(self) {
        /* Video2 is 241 frames / 10s. Play it fully then loop-hold last frame */
        var t = Math.floor(self.progress * (V2_TOTAL - 1) * 1.4);
        t = Math.min(t, V2_TOTAL - 1);
        if (t !== lastF2) { setFrame2(t); lastF2 = t; }
      }
    });

    /* Smooth transition opacity on media wrap */
    [med1, med2].forEach(function(m) {
      m.style.transition = 'opacity 0.6s ease';
    });

    /* ─────────────────────────────────────
       SECTIONS 1 (sc)
       ───────────────────────────────────── */
    initSections('.ss', sc);

    /* ─────────────────────────────────────
       SECTIONS 2 (sc2)
       ───────────────────────────────────── */
    initSections('.ss2', sc2);

    /* ─────────────────────────────────────
       COUNTERS
       ───────────────────────────────────── */
    document.querySelectorAll('.sn').forEach(function(el) {
      var target = parseFloat(el.dataset.v);
      var proxy  = { v: 0 };
      gsap.fromTo(proxy, { v: 0 }, {
        v: target, duration: 2.2, ease: 'power2.out',
        onUpdate: function() {
          el.textContent = target >= 1000 ? Math.round(proxy.v).toLocaleString() : Math.round(proxy.v);
        },
        onComplete: function() {
          el.textContent = target >= 1000 ? target.toLocaleString() : target;
        },
        scrollTrigger: {
          trigger: el.closest('.ss, .ss2') || el.closest('[data-v]').parentElement,
          start: 'top 80%',
          toggleActions: 'play none none reset'
        }
      });
    });

    /* ─────────────────────────────────────
       BELOW-FOLD ANIMATIONS
       ───────────────────────────────────── */
    gsap.from('.prod-card', {
      y: 50, opacity: 0, duration: .7, stagger: .1, ease: 'power3.out',
      scrollTrigger: { trigger: '.products-grid', start: 'top 85%' }
    });
    gsap.from('.gp-item', {
      y: 40, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out',
      scrollTrigger: { trigger: '.gp-grid', start: 'top 88%' }
    });
    gsap.from('.ft-tagline', { y: 60, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.ft-hero', start: 'top 88%' }
    });
    gsap.from(['.ft-sub', '.ft-cta-wrap'], { y: 30, opacity: 0, duration: .8, stagger: .15, ease: 'power3.out',
      scrollTrigger: { trigger: '.ft-hero', start: 'top 88%' }
    });
    gsap.from('.ft-brand', { y: 40, opacity: 0, duration: .8, ease: 'power3.out',
      scrollTrigger: { trigger: '.ft-grid', start: 'top 88%' }
    });
    gsap.from('.ft-col', { y: 40, opacity: 0, duration: .7, stagger: .1, ease: 'power3.out',
      scrollTrigger: { trigger: '.ft-grid', start: 'top 88%' }
    });
    gsap.from('.cert-list span', { y: 20, opacity: 0, duration: .4, stagger: .04, ease: 'power2.out',
      scrollTrigger: { trigger: '.cert-band', start: 'top 90%' }
    });
  }

  /* ─────────────────────────────────────
     SECTION INIT helper (reused for both sc/sc2)
     ───────────────────────────────────── */
  function initSections(selector, container) {
    var sections = document.querySelectorAll(selector);
    var totalH   = container.offsetHeight;
    var vpH      = window.innerHeight;

    sections.forEach(function(sec) {
      var ep      = parseFloat(sec.dataset.e) / 100;
      var lp      = parseFloat(sec.dataset.l) / 100;
      var persist = sec.dataset.p === '1';
      var mid     = (ep + lp) / 2;
      sec.style.top = (mid * totalH - vpH / 2) + 'px';

      var anim  = sec.dataset.a || 'fade-up';
      var inner = sec.querySelector('.si') || sec;
      var kids  = inner.querySelectorAll(
        '.sl,.sh,.sb,.tags,.slink,.bp,.bs,.cinfo,.btns,.stat,.sn-wrap,.stats-title'
      );

      setInitial(kids, anim);

      var wasVis = false;
      ScrollTrigger.create({
        trigger: container, start: 'top top', end: 'bottom bottom',
        onUpdate: function(self) {
          var p = self.progress;
          var vis = p >= ep && (persist || p <= lp);
          if (vis && !wasVis) {
            wasVis = true;
            sec.style.opacity = '1';
            sec.classList.add('vis');
            animateIn(kids, anim);
          } else if (!vis && wasVis && !persist) {
            wasVis = false;
            sec.style.opacity = '0';
            sec.classList.remove('vis');
            gsap.killTweensOf(kids);
            setInitial(kids, anim);
          }
        }
      });
    });
  }

  /* ─────────────────────────────────────
     ANIMATION HELPERS
     ───────────────────────────────────── */
  function setInitial(els, type) {
    var m = getInitial(type);
    els.forEach(function(el) { gsap.set(el, m); });
  }
  function getInitial(type) {
    if (type === 'fade-up')     return { y: 55, opacity: 0 };
    if (type === 'scale-up')    return { y: 45, scale: .85, opacity: 0 };
    if (type === 'rotate-in')   return { y: 45, rotation: 3, opacity: 0 };
    if (type === 'stagger-up')  return { y: 65, opacity: 0 };
    if (type === 'clip-reveal') return { clipPath: 'inset(100% 0 0 0)', opacity: 0 };
    if (type === 'blur-up')     return { y: 55, opacity: 0, filter: 'blur(8px)' };
    return { y: 40, opacity: 0 };
  }
  function animateIn(els, type) {
    if (type === 'fade-up')     { gsap.to(els, { y:0, opacity:1, duration:.9, stagger:.12, ease:'power3.out' }); return; }
    if (type === 'scale-up')    { gsap.to(els, { y:0, scale:1, opacity:1, duration:1, stagger:.12, ease:'power2.out' }); return; }
    if (type === 'rotate-in')   { gsap.to(els, { y:0, rotation:0, opacity:1, duration:.9, stagger:.12, ease:'power3.out' }); return; }
    if (type === 'stagger-up')  { gsap.to(els, { y:0, opacity:1, duration:.8, stagger:.09, ease:'power3.out' }); return; }
    if (type === 'clip-reveal') { gsap.to(els, { clipPath:'inset(0% 0 0 0)', opacity:1, duration:1.2, stagger:.14, ease:'power4.inOut' }); return; }
    if (type === 'blur-up')     { gsap.to(els, { y:0, opacity:1, filter:'blur(0px)', duration:1, stagger:.12, ease:'power3.out' }); return; }
    gsap.to(els, { y:0, opacity:1, duration:.9, stagger:.11, ease:'power3.out' });
  }

}());
