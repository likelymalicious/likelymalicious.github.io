/* likelymalicious.com intro animation
   A red dot glides into its place in the logo, the logo spreads outward from it,
   "under construction" settles in, the dot breathes, and it all loops every 12 seconds. */
(function () {
  document.documentElement.classList.add('js');

  function init() {
    var $ = function (id) { return document.getElementById(id); };
    var stage = $('stage'), logo = $('logo'), slot = $('slot'), bl = $('bl'), uc = $('uc');
    var dot = $('dot'), halo = $('halo'), grain = $('grain');
    if (!stage || !logo) return;
    var LOOP = 12, M = null, letters = [];

    uc.textContent = '';
    'UNDER CONSTRUCTION'.split('').forEach(function (ch) {
      var s = document.createElement('span');
      s.textContent = ch === ' ' ? ' ' : ch;
      uc.appendChild(s); letters.push(s);
    });

    /* film grain: a static, seeded noise tile that also prevents banding in the dark gradient */
    (function () {
      var c = document.createElement('canvas'); c.width = c.height = 160;
      var g = c.getContext('2d'), img = g.createImageData(160, 160), seed = 1337;
      for (var i = 0; i < img.data.length; i += 4) {
        seed = (seed * 1664525 + 1013904223) >>> 0; var v = seed >>> 24;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grain.style.backgroundImage = 'url(' + c.toDataURL() + ')';
    })();

    /* easing */
    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function norm(t, a, b) { return clamp((t - a) / (b - a)); }
    function lerp(a, b, p) { return a + (b - a) * p; }
    function eIO3(p) { return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
    function eIO4(p) { return p < .5 ? 8 * Math.pow(p, 4) : 1 - Math.pow(-2 * p + 2, 4) / 2; }
    function eO3(p) { return 1 - Math.pow(1 - p, 3); }
    function eO4(p) { return 1 - Math.pow(1 - p, 4); }
    function spring(t, z, w) {
      if (t <= 0) return 0;
      var wd = w * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
    }
    function bez(u) {
      var A = M.P0, B = M.C1, C = M.C2, D = M.P3;
      if (u > 1) return { x: D.x + (u - 1) * 3 * (D.x - C.x), y: D.y + (u - 1) * 3 * (D.y - C.y) };
      var v = 1 - u;
      return {
        x: v * v * v * A.x + 3 * v * v * u * B.x + 3 * v * u * u * C.x + u * u * u * D.x,
        y: v * v * v * A.y + 3 * v * v * u * B.y + 3 * v * u * u * C.y + u * u * u * D.y
      };
    }

    /* exact size, position and shape of the font's period, so the moving dot lands on it */
    function inkBox(size) {
      var S = Math.ceil(size * 1.4) + 8, c = document.createElement('canvas'); c.width = S; c.height = S;
      var g = c.getContext('2d', { willReadFrequently: true });
      g.font = '300 ' + size + 'px Archivo, "Arial Narrow", sans-serif';
      try { if ('fontStretch' in g) g.fontStretch = 'expanded'; } catch (e) {}
      g.textBaseline = 'alphabetic'; g.fillStyle = '#fff';
      var ox = Math.round(S * 0.3), oy = Math.round(S * 0.75);
      g.fillText('.', ox, oy);
      var d = g.getImageData(0, 0, S, S).data, sum = 0, sx = 0, sy = 0, x0 = S, x1 = -1, y0 = S, y1 = -1, x, y, a;
      for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
        a = d[(y * S + x) * 4 + 3] / 255;
        if (a > 0) { sum += a; sx += a * (x + .5); sy += a * (y + .5); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (sum < 1) return { cx: size * .09, cy: -size * .07, w: size * .14, h: size * .14, round: false };
      var mx = sx / sum, my = sy / sum, row = 0, col = 0, ry = Math.floor(my), rx = Math.floor(mx);
      for (x = x0; x <= x1; x++) row += d[(ry * S + x) * 4 + 3] / 255;
      for (y = y0; y <= y1; y++) col += d[(y * S + rx) * 4 + 3] / 255;
      return { cx: mx - ox, cy: my - oy, w: row, h: col, round: (sum / (row * col)) < 0.88 };
    }

    function measure() {
      var W = stage.clientWidth, H = stage.clientHeight;
      var stacked = W < 640 && H > W * 1.15;   /* portrait phones get the stacked logo */
      logo.classList.toggle('stacked', stacked);
      logo.style.transform = 'none';
      logo.style.webkitMaskImage = logo.style.maskImage = 'none';
      logo.style.fontSize = '100px';
      var w100 = logo.getBoundingClientRect().width || 1300;
      var target = stacked ? Math.min(W * 0.78, 560) : Math.min(W * 0.8, 1100);
      var size = Math.max(16, Math.min(stacked ? 180 : 140, target / w100 * 100));
      logo.style.fontSize = size + 'px';
      var ucSize = Math.max(11, size * (stacked ? 0.2 : 0.18));
      uc.style.fontSize = ucSize + 'px';
      uc.style.marginTop = (size * (stacked ? 0.5 : 0.55)) + 'px';

      var sr = stage.getBoundingClientRect(), lr = logo.getBoundingClientRect();
      var rg = document.createRange(); rg.selectNodeContents(slot);
      var r = rg.getBoundingClientRect();
      var base = bl.getBoundingClientRect().top - sr.top;
      var k = inkBox(size);
      var cx = (r.left - sr.left) + k.cx, cy = base + k.cy;
      var ox = cx - (lr.left - sr.left), oy = cy - (lr.top - sr.top);
      var F = size * 0.7, R = 0;
      [[0, 0], [lr.width, 0], [0, lr.height], [lr.width, lr.height]].forEach(function (p) {
        R = Math.max(R, Math.sqrt((p[0] - ox) * (p[0] - ox) + (p[1] - oy) * (p[1] - oy)));
      });

      dot.style.width = k.w + 'px'; dot.style.height = k.h + 'px';
      dot.style.borderRadius = k.round ? '50%' : '0';
      logo.style.transformOrigin = ox + 'px ' + oy + 'px';

      /* the dot always arrives from the side opposite its final spot */
      var fromLeft = cx >= W / 2;
      M = {
        W: W, H: H, dotW: k.w, dotH: k.h, cx: cx, cy: cy, ox: ox, oy: oy, F: F, R: R + F, uc: ucSize,
        P0: fromLeft ? { x: W * 0.12, y: cy + H * 0.22 } : { x: W * 0.88, y: cy + H * 0.16 },
        C1: fromLeft ? { x: W * 0.22, y: cy - H * 0.12 } : { x: W * 0.80, y: cy - H * 0.10 },
        C2: fromLeft ? { x: cx - W * 0.16, y: cy } : { x: cx + W * 0.30, y: cy },
        P3: { x: cx, y: cy }
      };
    }

    function render(t) {
      if (!M) return;
      t = ((t % LOOP) + LOOP) % LOOP;
      var i;

      /* 1 glide: the dot fades in and springs along a curve into its place in the logo,
         condensing from a soft point of light into the exact dot as it arrives */
      var u = spring(t - 0.4, 0.78, 2.7), p = bez(u), x = p.x, y = p.y;
      var appear = eO3(norm(t, 0.4, 1.0)), arrive = clamp(u);
      var s = lerp(0.6, 1, appear) * lerp(1.8, 1, arrive);
      var op = appear, haloOp = 0.55 * appear * (1 - 0.5 * arrive), haloS = lerp(1.5, 1, arrive);

      /* 2 arrival beat: one soft pulse of light */
      var beat = norm(t, 2.0, 2.9);
      if (beat > 0 && beat < 1) { var b = Math.sin(Math.PI * beat); haloOp += 0.35 * b; haloS += 0.5 * b; }

      /* 3 reveal: the logo spreads outward from the dot, and on exit pulls back into it */
      var reveal = eIO4(norm(t, 2.55, 4.15)) * (1 - eIO3(norm(t, 10.0, 10.9)));

      /* 5 breathe: two slow pulses */
      if (t > 5.8 && t < 9.8) {
        var ph = 0.5 - 0.5 * Math.cos(2 * Math.PI * (t - 5.8) / 2);
        haloOp = 0.42 * ph; haloS = 1 + 0.4 * ph; op = 1 - 0.2 * ph;
      }

      /* 6 out: the dot drifts away and fades */
      var out = norm(t, 10.75, 11.7);
      if (out > 0) { var e = eIO3(out); x += M.W * 0.06 * e; y -= M.H * 0.015 * e; op *= 1 - e; haloOp *= 1 - e; s *= lerp(1, 0.4, e); }

      dot.style.opacity = op;
      dot.style.transform = 'translate3d(' + (x - M.dotW / 2) + 'px,' + (y - M.dotH / 2) + 'px,0) scale(' + s + ')';
      halo.style.opacity = Math.max(0, haloOp);
      halo.style.transform = 'translate3d(' + (x - 120) + 'px,' + (y - 120) + 'px,0) scale(' + (haloS * s * M.dotW * 9 / 240) + ')';

      if (reveal <= 0) {
        logo.style.opacity = 0;
      } else {
        logo.style.opacity = 1;
        var sc = lerp(1.03, 1, eO3(norm(t, 2.55, 4.6)));
        logo.style.transform = sc === 1 ? 'none' : 'scale(' + sc + ')';
        if (reveal >= 1) {
          logo.style.webkitMaskImage = logo.style.maskImage = 'none';
        } else {
          var r = reveal * M.R;
          var mask = 'radial-gradient(circle at ' + M.ox + 'px ' + M.oy + 'px, #000 ' + (r - M.F) + 'px, transparent ' + r + 'px)';
          logo.style.webkitMaskImage = logo.style.maskImage = mask;
        }
      }

      /* 4 settle: "under construction" fades in as its letters draw together */
      var uIn = eO4(norm(t, 4.0, 5.6)), uOp = eO3(norm(t, 4.0, 5.0)) * (1 - eIO3(norm(t, 9.9, 10.5)));
      var mid = (letters.length - 1) / 2, spread = M.uc * 0.5 * (1 - uIn), dy = M.uc * 0.6 * (1 - eO3(norm(t, 4.0, 5.0)));
      for (i = 0; i < letters.length; i++) {
        letters[i].style.opacity = uOp * 0.9;
        letters[i].style.transform = 'translate3d(' + ((i - mid) * spread) + 'px,' + dy + 'px,0)';
      }
    }

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var running = false, pending = false;
    function start() {
      if (running) return; running = true;
      measure();
      if (window.__CAPTURE) return;
      if (reduce) { render(5.8); return; }
      var t0 = performance.now();
      (function frame(now) { render((now - t0) / 1000); requestAnimationFrame(frame); })(t0);
    }
    function remeasure() {
      if (!running || pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; measure(); if (reduce) render(5.8); });
    }

    window.__lm = { measure: measure, render: render };
    window.addEventListener('resize', remeasure);
    window.addEventListener('orientationchange', remeasure);
    if (document.fonts) document.fonts.addEventListener('loadingdone', remeasure);

    var fontsReady = document.fonts
      ? Promise.all([document.fonts.load('300 72px Archivo'), document.fonts.load('800 72px Archivo')]).then(function () { return document.fonts.ready; })
      : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2000); })]).then(start, start);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
