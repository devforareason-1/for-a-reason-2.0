(() => {
"use strict";
// Scroll parallax: artwork only. Copy and controls stay in normal document flow.
        const parallaxReduce = matchMedia("(prefers-reduced-motion:reduce)"),
          visual = document.querySelector(".hero-visual"),
          projectImages = [...document.querySelectorAll(".project-image img")];
        let parallaxFrame = 0,
          motionPaused = false;
        function updateParallax() {
          parallaxFrame = 0;
          const disabled = parallaxReduce.matches || motionPaused,
            heroRect = visual.getBoundingClientRect();
          const passed = Math.max(0, -heroRect.top);
          visual.style.setProperty(
            "--hero-shift",
            disabled ? "0px" : `${-Math.min(64, passed * 0.14)}px`,
          );
          for (const img of projectImages) {
            const rect = img.parentElement.getBoundingClientRect();
            if (disabled) {
              img.style.setProperty("--image-shift", "-14px");
              continue;
            }
            if (rect.bottom < 0 || rect.top > innerHeight) continue;
            const progress = Math.max(
              0,
              Math.min(
                1,
                (innerHeight - rect.top) / (innerHeight + rect.height),
              ),
            );
            img.style.setProperty("--image-shift", `${-28 * progress}px`);
          }
        }
        function queueParallax() {
          if (!parallaxFrame)
            parallaxFrame = requestAnimationFrame(updateParallax);
        }
        addEventListener("scroll", queueParallax, { passive: true });
        addEventListener("resize", queueParallax);
        parallaxReduce.addEventListener("change", queueParallax);
        document
          .querySelector(".work-filters")
          .addEventListener("click", queueParallax);
        document
          .querySelector(".show-work")
          .addEventListener("click", queueParallax);
        updateParallax();
        // Full-width particle wordmark in a clipped hero region: scrolls with the page.
        // Particles spread across the hero, settle into the word and scatter from the pointer.
        const hero = document.querySelector(".hero"),
          cv = document.getElementById("field"),
          ctx = cv.getContext("2d");
        if (!ctx) return;
        const reduce = matchMedia("(prefers-reduced-motion:reduce)"),
          toggle = document.querySelector(".motion-toggle");
        let W = 0,
          H = 0,
          dpr = 1,
          parts = [],
          raf = 0,
          paused = false,
          resizeTimer;
        const m = { x: innerWidth / 2, y: innerHeight / 2, active: false };
        function fade() {
          const rect = visual.getBoundingClientRect();
          return rect.bottom > 0 && rect.top < innerHeight ? 1 : 0;
        }
        function canAnimate() {
          return !reduce.matches && !paused && !document.hidden && fade() > 0;
        }
        function paint(staticOnly = false) {
          ctx.clearRect(0, 0, W, H);
          const mx = m.x * dpr,
            my = m.y * dpr,
            R = 170 * dpr,
            opacity = fade();
          if (opacity <= 0) return false;
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
            const disp = Math.min(
              1,
              Math.hypot(p.x - p.tx, p.y - p.ty) / (60 * dpr),
            );
            ctx.globalAlpha = opacity * (0.9 + 0.1 * disp);
            ctx.fillStyle =
              disp > 0.15 ? (p.h > 0.5 ? "#FF6A00" : "#FFB56B") : p.c;
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
        function updateControl() {
          toggle.hidden = reduce.matches;
          toggle.textContent = paused ? "Resume motion" : "Pause motion";
          toggle.setAttribute("aria-pressed", String(paused));
          toggle.setAttribute(
            "aria-label",
            paused ? "Resume particle motion" : "Pause particle motion",
          );
        }
        function build() {
          cancelAnimationFrame(raf);
          raf = 0;
          dpr = Math.min(devicePixelRatio || 1, 2);
          W = cv.width = Math.round(visual.clientWidth * dpr);
          H = cv.height = Math.round(visual.clientHeight * dpr);
          if (!W || !H) return;
          const off = document.createElement("canvas");
          off.width = W;
          off.height = H;
          const o = off.getContext("2d");
          if (!o) return;
          const lines =
            innerWidth < 700 ? ["for a", "reason"] : ["for a reason"];
          let size = Math.min(
            W / (innerWidth < 700 ? 4.2 : 6.3),
            H * (innerWidth < 700 ? 0.4 : 0.72),
          );
          o.font = `800 ${size}px Inter, Arial, sans-serif`;
          o.letterSpacing = `${-size * 0.04}px`;
          // Fit the word if fallback-font metrics differ from Inter.
          const maxWidth = Math.max(
            ...lines.map(
              (text, i) =>
                o.measureText(text + (i === lines.length - 1 ? "." : "")).width,
            ),
          );
          if (maxWidth > W * 0.94) size *= (W * 0.94) / maxWidth;
          o.font = `800 ${size}px Inter, Arial, sans-serif`;
          o.letterSpacing = `${-size * 0.04}px`;
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
              const lw = o.measureText(text).width;
              o.fillStyle = "#FF6A00";
              o.fillText(".", x0 + lw, y);
            }
          });
          const pixels = o.getImageData(0, 0, W, H).data,
            gap = Math.max(3, Math.round(4 * dpr));
          parts = [];
          for (let y = 0; y < H; y += gap)
            for (let x = 0; x < W; x += gap) {
              const k = (y * W + x) * 4;
              if (pixels[k + 3] > 128)
                parts.push({
                  tx: x,
                  ty: y,
                  x: canAnimate() ? Math.random() * W : x,
                  y: canAnimate() ? Math.random() * H : y,
                  vx: 0,
                  vy: 0,
                  h: Math.random(),
                  c: `rgb(${pixels[k]},${pixels[k + 1]},${pixels[k + 2]})`,
                });
            }
          hero.classList.add("has-particles");
          updateControl();
          if (canAnimate()) {
            paint();
            wake();
          } else paint(true);
        }
        addEventListener("pointermove", (e) => {
          if (!canAnimate()) return;
          const rect = cv.getBoundingClientRect();
          m.x = e.clientX - rect.left;
          m.y = e.clientY - rect.top;
          m.active =
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;
          wake();
        });
        addEventListener("pointerout", (e) => {
          if (!e.relatedTarget) {
            m.active = false;
            wake();
          }
        });
        addEventListener(
          "scroll",
          () => {
            m.active = false;
            if (fade() <= 0) {
              cancelAnimationFrame(raf);
              raf = 0;
              ctx.clearRect(0, 0, W, H);
              m.active = false;
            } else if (!canAnimate()) paint(true);
            else {
              paint();
              wake();
            }
          },
          { passive: true },
        );
        toggle.addEventListener("click", () => {
          paused = !paused;
          motionPaused = paused;
          queueParallax();
          cancelAnimationFrame(raf);
          raf = 0;
          m.active = false;
          updateControl();
          paint(true);
        });
        reduce.addEventListener("change", () => {
          cancelAnimationFrame(raf);
          raf = 0;
          m.active = false;
          updateControl();
          paint(true);
        });
        document.addEventListener("visibilitychange", () => {
          cancelAnimationFrame(raf);
          raf = 0;
          m.active = false;
          if (!document.hidden) {
            paint(true);
            wake();
          }
        });
        addEventListener("resize", () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(build, 180);
        });
        if ("ResizeObserver" in window)
          new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(build, 120);
          }).observe(visual);
        (document.fonts ? document.fonts.ready : Promise.resolve())
          .then(build)
          .catch(() => {});
      })();
