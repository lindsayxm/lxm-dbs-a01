/* ==========================================================================
   SNR Animation — draws the wave field inside an .snr element:
   noisy strands + static on the left, a glowing pure sine on the right,
   a halo behind the lens, and dust motes drifting up through it all.

   Usage:
     <section class="snr" data-snr> … <canvas class="snr__field"></canvas> … </section>
     <script src="snr-animation.js"></script>   // auto-mounts every [data-snr]

   Or mount manually:
     const anim = SNRAnimation.mount(element, { colors: { … } });
     anim.destroy();
   ========================================================================== */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  const DEFAULTS = {
    // rgb triplets for the noisy strands and static specks
    noiseColors: ['217,164,91', '79,124,255', '58,224,200', '150,165,185'],
    // gradient across the clean sine: [start, middle, end]
    signalColors: ['79,124,255', '58,224,200', '220,245,255'],
    haloColor: '58,224,200',
    moteColor: '160,240,228',
    scanlineColor: '233,238,244',
    strands: 7,              // noisy wave lines
    specks: 520,             // static dots per frame
    speed: 1.7,              // wave phase speed
    centerY: .52,            // vertical centre of the waves (fraction of height)
    lensX: .5,               // where noise turns into signal (fraction of width)
  };

  function fit(cv) {
    const dpr = Math.min(global.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    cv.width = Math.max(1, w * dpr); cv.height = Math.max(1, h * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  // A pure sine rendered as light: ghost echoes trailing behind, then halo → core.
  function glowSine(ctx, x0, x1, cy, amp, k, phase, fade, cols) {
    const trace = (ph, a = amp) => {
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 3) {
        const y = cy + a * Math.sin(k * x - ph);
        x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    };
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, `rgba(${cols[0]},${fade})`);
    g.addColorStop(.5, `rgba(${cols[1]},${fade})`);
    g.addColorStop(1, `rgba(${cols[2]},${fade * .9})`);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let e = 4; e >= 1; e--) {
      ctx.globalAlpha = .09 * (5 - e) / 4; ctx.strokeStyle = g; ctx.lineWidth = 1.2;
      trace(phase - e * .32, amp * (1 - e * .04)); ctx.stroke();
    }
    ctx.strokeStyle = g;
    ctx.lineWidth = 26; ctx.globalAlpha = .1; trace(phase); ctx.stroke();
    ctx.lineWidth = 11; ctx.globalAlpha = .22; trace(phase); ctx.stroke();
    ctx.lineWidth = 4.5; ctx.globalAlpha = .55; trace(phase); ctx.stroke();
    ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.6; trace(phase); ctx.stroke();
  }

  function mount(root, options) {
    const o = Object.assign({}, DEFAULTS, options || {});
    if (options && options.colors) Object.assign(o, options.colors);
    const field = root.querySelector('.snr__field') || root.appendChild(Object.assign(document.createElement('canvas'), { className: 'snr__field' }));
    field.setAttribute('aria-hidden', 'true');
    const reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let F, strands = [], motes = [], raf = 0, visible = true, running = true;

    function setup() {
      F = fit(field);
      strands = Array.from({ length: o.strands }, (_, s) => ({
        col: o.noiseColors[s % o.noiseColors.length],
        parts: Array.from({ length: 6 }, () => ({ a: Math.random(), f: .012 + Math.random() * .2, p: Math.random() * TAU, w: (Math.random() - .5) * 14 })),
      }));
      motes = Array.from({ length: Math.round(F.w / 18) }, () => ({ x: Math.random() * F.w, y: Math.random() * F.h, r: .6 + Math.random() * 1.8, v: 4 + Math.random() * 12, tw: Math.random() * TAU }));
    }

    function draw(ts) {
      const { ctx, w, h } = F;
      ctx.clearRect(0, 0, w, h);
      const cy = h * o.centerY, amp = Math.min(h * .1, 84), k = TAU / Math.max(260, w * .2), phase = ts * o.speed;
      const fx = w * o.lensX;

      // light gathering behind the lens
      const halo = ctx.createRadialGradient(fx, cy, 0, fx, cy, Math.max(w, h) * .32);
      halo.addColorStop(0, `rgba(${o.haloColor},.14)`); halo.addColorStop(1, `rgba(${o.haloColor},0)`);
      ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);

      // --- the noisy input: carrier buried under static ---
      const env = x => .55 + .6 * (1 - x / fx);
      ctx.lineJoin = 'round';
      for (const s of strands) {
        ctx.beginPath();
        for (let x = -10; x <= fx + 20; x += 3) {
          let n = 0;
          for (const q of s.parts) n += q.a * Math.sin(q.f * x + q.p + q.w * ts);
          n = n / 2.2 * amp * env(x) + (Math.random() - .5) * amp * .5 * env(x);
          const y = cy + amp * Math.sin(k * x - phase) + n;
          x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${s.col},.09)`; ctx.lineWidth = 6; ctx.stroke();
        ctx.strokeStyle = `rgba(${s.col},.55)`; ctx.lineWidth = 1; ctx.stroke();
      }
      // static: specks clustered around the signal, a few loose everywhere, torn scanlines
      for (let i = 0; i < o.specks; i++) {
        const x = Math.random() * (fx + 10);
        const spread = i < o.specks * .8 ? (Math.random() + Math.random() + Math.random() - 1.5) * amp * 2.2 * env(x) : (Math.random() - .5) * h;
        ctx.fillStyle = `rgba(${o.noiseColors[i % o.noiseColors.length]},${.12 + Math.random() * .5})`;
        const r = .6 + Math.random() * 1.8;
        ctx.fillRect(x, cy + spread, r, r);
      }
      for (let i = 0; i < 4; i++) {
        const y = cy + (Math.random() - .5) * amp * 5, x = Math.random() * fx * .9, len = 20 + Math.random() * 140;
        ctx.fillStyle = `rgba(${o.scanlineColor},${.2 + Math.random() * .3})`; ctx.fillRect(x, y, len, 1);
        ctx.fillStyle = `rgba(${o.noiseColors[i % o.noiseColors.length]},.25)`; ctx.fillRect(x + 4, y + 2, len * .7, 1);
      }

      // --- the clean output ---
      glowSine(ctx, fx - 10, w + 10, cy, amp, k, phase, 1, o.signalColors);

      // --- dust motes drifting up through the light ---
      for (const m of motes) {
        m.y -= m.v / 60; if (m.y < -5) { m.y = h + 5; m.x = Math.random() * w; }
        const a = .25 + .25 * Math.sin(ts * 1.5 + m.tw);
        ctx.fillStyle = `rgba(${o.moteColor},${a})`;
        ctx.beginPath(); ctx.arc(m.x + Math.sin(ts * .4 + m.tw) * 6, m.y, m.r, 0, TAU); ctx.fill();
      }
    }

    function loop(now) {
      if (!running) return;
      if (visible) draw(now / 1000);
      raf = requestAnimationFrame(loop);
    }

    setup(); draw(0);

    let io = null, rt = 0;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { setup(); draw(performance.now() / 1000); }, 150); };
    global.addEventListener('resize', onResize);
    if (!reduce) {
      if ('IntersectionObserver' in global) { io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(root); }
      raf = requestAnimationFrame(loop);
    }

    return {
      destroy() { running = false; cancelAnimationFrame(raf); if (io) io.disconnect(); global.removeEventListener('resize', onResize); },
      redraw: () => { setup(); draw(performance.now() / 1000); },
    };
  }

  const api = { mount, defaults: DEFAULTS };
  global.SNRAnimation = api;

  // auto-mount every [data-snr] once the DOM is ready
  const auto = () => document.querySelectorAll('[data-snr]').forEach(el => { if (!el._snr) el._snr = mount(el); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto); else auto();
})(window);
