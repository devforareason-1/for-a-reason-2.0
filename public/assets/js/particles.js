(() => {
  "use strict";
  // Hero particle wordmark plus scroll parallax on artwork only.
  // Copy and controls stay in normal document flow.
  const reduce = matchMedia("(prefers-reduced-motion:reduce)"),
    root = document.documentElement,
    hero = document.querySelector(".hero"),
    visual = document.querySelector(".hero-visual"),
    cv = document.getElementById("field"),
    toggle = document.querySelector(".motion-toggle"),
    archive = document.querySelector(".archive"),
    projectImages = [...document.querySelectorAll(".project-image img")];
  let paused = false,
    inView = true,
    parallaxFrame = 0;

  // ---- Parallax: one batched read pass, then one write pass per frame. ----
  function updateParallax() {
    parallaxFrame = 0;
    const disabled = reduce.matches || paused,
      vh = innerHeight,
      heroTop = visual.getBoundingClientRect().top;
    const reads = [];
    if (!disabled && archive && archive.open) {
      for (const img of projectImages) {
        if (img.closest(".project-card").hidden) continue;
        const rect = img.parentElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) continue;
        reads.push([img, Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)))]);
      }
    }
    visual.style.setProperty(
      "--hero-shift",
      disabled ? "0px" : `${-Math.min(64, Math.max(0, -heroTop) * 0.14)}px`,
    );
    if (disabled) for (const img of projectImages) img.style.setProperty("--image-shift", "-14px");
    else for (const [img, progress] of reads) img.style.setProperty("--image-shift", `${-28 * progress}px`);
  }
  function queueParallax() {
    if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
  }
  addEventListener("scroll", queueParallax, { passive: true });
  addEventListener("resize", queueParallax);
  archive?.addEventListener("toggle", queueParallax);
  document.querySelector(".work-filters")?.addEventListener("click", queueParallax);
  document.querySelector(".show-work")?.addEventListener("click", queueParallax);
  updateParallax();

  // ---- Particle wordmark: settles into the word and scatters from the pointer. ----
  const ctx = cv.getContext("2d");
  let W = 0,
    H = 0,
    dpr = 1,
    builtW = 0,
    builtH = 0,
    parts = [],
    raf = 0,
    fontsReady = false,
    resizeTimer;
  const m = { x: innerWidth / 2, y: innerHeight / 2, active: false };

  function canAnimate() {
    return !reduce.matches && !paused && !document.hidden && inView;
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    m.active = false;
  }
  function paint(staticOnly = false) {
    if (!ctx) return false;
    ctx.clearRect(0, 0, W, H);
    if (!inView) return false;
    const mx = m.x * dpr,
      my = m.y * dpr,
      R = 170 * dpr;
    let moving = false;
    for (const p of parts) {
      if (staticOnly) {
        p.x = p.tx;
        p.y = p.ty;
        p.vx = p.vy = 0;
      } else {
        const dx = p.x - mx,
          dy = p.y - my,
          d2 = dx * dx + dy * dy;
        if (m.active && d2 < R * R) {
          const distance = Math.sqrt(d2) || 1,
            force = (1 - distance / R) * 9 * dpr;
          p.vx += (dx / distance) * force;
          p.vy += (dy / distance) * force;
        }
        p.vx += (p.tx - p.x) * 0.06;
        p.vy += (p.ty - p.y) * 0.06;
        p.vx *= 0.86;
        p.vy *= 0.86;
        p.x += p.vx;
        p.y += p.vy;
        moving ||= Math.abs(p.vx) + Math.abs(p.vy) > 0.02;
      }
      const disp = Math.min(1, Math.hypot(p.x - p.tx, p.y - p.ty) / (60 * dpr));
      ctx.globalAlpha = 0.9 + 0.1 * disp;
      ctx.fillStyle = disp > 0.15 ? (p.h > 0.5 ? "#FF6A00" : "#FFB56B") : p.c;
      const size = (2.6 + disp * 1.6) * dpr;
      ctx.fillRect(p.x, p.y, size, size);
    }
    ctx.globalAlpha = 1;
    return moving;
  }
  function frame() {
    raf = 0;
    if (!canAnimate()) return;
    const moving = paint();
    if (moving || m.active) raf = requestAnimationFrame(frame);
  }
  function wake() {
    if (!raf && canAnimate()) raf = requestAnimationFrame(frame);
  }
  // Repaint after any state change: animate when allowed, otherwise show the settled word.
  function refresh() {
    stop();
    if (canAnimate()) wake();
    else paint(true);
  }
  function updateControl() {
    toggle.hidden = reduce.matches;
    toggle.textContent = paused ? "Resume motion" : "Pause motion";
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute("aria-label", paused ? "Resume page animation" : "Pause page animation");
  }
  function build() {
    if (!ctx) return;
    clearTimeout(resizeTimer);
    stop();
    const cssW = visual.clientWidth,
      cssH = visual.clientHeight;
    builtW = cssW;
    builtH = cssH;
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.width = Math.round(cssW * dpr);
    H = cv.height = Math.round(cssH * dpr);
    if (!W || !H) return;
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const o = off.getContext("2d", { willReadFrequently: true });
    if (!o) return;
    const narrow = innerWidth < 700,
      lines = narrow ? ["for a", "reason"] : ["for a reason"];
    let size = Math.min(W / (narrow ? 4.2 : 6.3), H * (narrow ? 0.4 : 0.72));
    const setFont = () => {
      o.font = `800 ${size}px Inter, Arial, sans-serif`;
      o.letterSpacing = `${-size * 0.04}px`;
    };
    setFont();
    // Fit the word if fallback-font metrics differ from Inter.
    const maxWidth = Math.max(
      ...lines.map((text, i) => o.measureText(text + (i === lines.length - 1 ? "." : "")).width),
    );
    if (maxWidth > W * 0.94) size *= (W * 0.94) / maxWidth;
    setFont();
    o.textAlign = "left";
    o.textBaseline = "middle";
    lines.forEach((text, i) => {
      const last = i === lines.length - 1,
        y = H * 0.48 + (i - (lines.length - 1) / 2) * size * 1.05,
        tw = o.measureText(text + (last ? "." : "")).width,
        x0 = (W - tw) / 2;
      o.fillStyle = "#F5F2EC";
      o.fillText(text, x0, y);
      if (last) {
        o.fillStyle = "#FF6A00";
        o.fillText(".", x0 + o.measureText(text).width, y);
      }
    });
    const pixels = o.getImageData(0, 0, W, H).data,
      // Coarser sampling on dense phone screens keeps the particle count and build cost down.
      gap = Math.max(3, Math.round((narrow ? 4.5 : 4) * dpr)),
      scatter = canAnimate();
    parts = [];
    for (let y = 0; y < H; y += gap)
      for (let x = 0; x < W; x += gap) {
        const k = (y * W + x) * 4;
        if (pixels[k + 3] > 128)
          parts.push({
            tx: x,
            ty: y,
            x: scatter ? Math.random() * W : x,
            y: scatter ? Math.random() * H : y,
            vx: 0,
            vy: 0,
            h: Math.random(),
            c: `rgb(${pixels[k]},${pixels[k + 1]},${pixels[k + 2]})`,
          });
      }
    hero.classList.add("has-particles");
    updateControl();
    if (scatter) {
      paint();
      wake();
    } else paint(true);
  }
  // Rebuild only for real size changes. Mobile toolbar show/hide changes the window height,
  // not the hero box, so it no longer re-scatters the word mid-scroll.
  function scheduleBuild(delay) {
    if (!fontsReady || visual.clientWidth === builtW && visual.clientHeight === builtH) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, delay);
  }

  updateControl();
  toggle.addEventListener("click", () => {
    paused = !paused;
    // Pauses every decorative animation on the page, including the marquee.
    root.classList.toggle("motion-paused", paused);
    updateControl();
    queueParallax();
    refresh();
  });
  reduce.addEventListener("change", () => {
    updateControl();
    queueParallax();
    refresh();
  });
  if (!ctx) return;

  addEventListener("pointermove", (e) => {
    if (!canAnimate()) return;
    const rect = cv.getBoundingClientRect();
    m.x = e.clientX - rect.left;
    m.y = e.clientY - rect.top;
    m.active =
      e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    wake();
  });
  addEventListener("pointerout", (e) => {
    if (!e.relatedTarget) {
      m.active = false;
      wake();
    }
  });
  // Scrolling moves the canvas under a stationary pointer; release it. Painting is not needed here:
  // the parallax shift is a CSS transform, and visibility changes are handled below.
  addEventListener("scroll", () => { m.active = false; }, { passive: true });
  if ("IntersectionObserver" in window)
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting === inView) return;
      inView = entry.isIntersecting;
      refresh();
    }).observe(visual);
  document.addEventListener("visibilitychange", refresh);
  if ("ResizeObserver" in window) new ResizeObserver(() => scheduleBuild(120)).observe(visual);
  else addEventListener("resize", () => scheduleBuild(180));
  (document.fonts ? document.fonts.ready : Promise.resolve())
    .then(() => {
      fontsReady = true; // Build once with Inter metrics; observers then handle real resizes.
      build();
    })
    .catch(() => {});
})();
