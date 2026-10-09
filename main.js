(() => {
  const doc = document.documentElement;
  doc.classList.add("js");

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── Smooth scroll ───────────────────────────────────────── */
  let lenis = null;
  const startLenis = () => {
    if (reduced || !window.Lenis) return;
    lenis = window.__lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  };
  if (window.Lenis) startLenis();
  else window.addEventListener("load", startLenis, { once: true });

  // Anchor links
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href");
    const target = id === "#topo" ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: id === "#topo" ? 0 : -72, duration: 1.4 });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    history.replaceState(null, "", id);
  });

  /* ── Split headings into words ───────────────────────────── */
  $$("[data-split]").forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) { if (i) frag.append(" "); return; }
            const w = document.createElement("span");
            w.className = "w";
            w.style.setProperty("--i", i++);
            w.textContent = part;
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  });

  /* ── Reveal on scroll ────────────────────────────────────── */
  const counters = new WeakSet();
  const countUp = (el) => {
    if (counters.has(el)) return;
    counters.add(el);
    const to = +el.dataset.count;
    if (reduced) { el.textContent = to; return; }
    const t0 = performance.now(), dur = 1600;
    const tick = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      $$("[data-count]", en.target).forEach(countUp);
      io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  $$("[data-reveal], [data-split]").forEach((el) => io.observe(el));

  /* ── Barcode ─────────────────────────────────────────────── */
  const bc = $("[data-barcode]");
  if (bc) {
    let seed = 297;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 46; k++) {
      const i = document.createElement("i");
      i.style.flex = `${[1, 1, 2, 1, 3, 1, 2][Math.floor(rnd() * 7)]} 0 0`;
      if (rnd() > 0.7) i.style.opacity = "0";
      bc.append(i);
    }
  }

  /* ── Accordion ───────────────────────────────────────────── */
  $$("[data-accordion] .acc").forEach((acc) => {
    const btn = $(".acc__q", acc);
    btn.addEventListener("click", () => {
      const open = !acc.classList.contains("is-open");
      $$("[data-accordion] .acc.is-open").forEach((o) => {
        if (o !== acc) { o.classList.remove("is-open"); $(".acc__q", o).setAttribute("aria-expanded", "false"); }
      });
      acc.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ── Ticket tilt ─────────────────────────────────────────── */
  const ticket = $("[data-tilt]");
  if (ticket && finePointer && !reduced) {
    ticket.addEventListener("pointermove", (e) => {
      const r = ticket.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      ticket.style.transform = `perspective(1400px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg)`;
    });
    ticket.addEventListener("pointerleave", () => { ticket.style.transform = ""; });
  }

  /* ── Gallery ─────────────────────────────────────────────── */
  const gallery = $("[data-gallery]");
  const track = $("[data-gallery-track]");
  const viewport = $(".gallery__viewport");
  const bar = $("[data-gallery-bar]");
  const indexEl = $("[data-gallery-index]");
  const shots = $$(".shot", track);
  const pinMQ = matchMedia("(min-width: 861px)");
  let pinned = false, dist = 0;

  const setProgress = (p) => {
    bar.style.transform = `scaleX(${Math.max(p, 1 / shots.length)})`;
    indexEl.textContent = String(Math.min(shots.length, Math.round(p * (shots.length - 1)) + 1)).padStart(2, "0");
  };

  const layoutGallery = () => {
    pinned = pinMQ.matches && !reduced;
    gallery.classList.toggle("is-pinned", pinned);
    track.style.transform = "";
    if (pinned) {
      dist = Math.max(0, track.scrollWidth - innerWidth);
      gallery.style.height = `${innerHeight + dist}px`;
    } else {
      gallery.style.height = "";
    }
  };

  // Layout is measured once (and on resize), never inside the scroll frame.
  const absTop = (el) => { let t = 0; for (; el; el = el.offsetParent) t += el.offsetTop; return t; };
  const m = { vh: innerHeight, gallery: 0, heroEnd: 0, priceTop: 0, priceEnd: 0, footTop: 0, para: [] };

  const updateGallery = (y) => {
    if (!pinned) return;
    const p = clamp((y - m.gallery) / Math.max(1, dist), 0, 1);
    track.style.transform = `translate3d(${(-p * dist).toFixed(1)}px,0,0)`;
    setProgress(p);
  };

  // Lazy images inside a transformed track: load them all once the section is near.
  const preload = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    $$("img", track).forEach((img) => { img.loading = "eager"; });
    preload.disconnect();
  }, { rootMargin: "100% 0px" });
  preload.observe(gallery);

  viewport.addEventListener("scroll", () => {
    if (pinned) return;
    const max = viewport.scrollWidth - viewport.clientWidth;
    setProgress(max > 0 ? viewport.scrollLeft / max : 0);
  }, { passive: true });

  /* ── Parallax ────────────────────────────────────────────── */
  const parallax = reduced ? [] : $$("[data-parallax]").map((el) => ({ el, img: el.firstElementChild }));
  const updateParallax = (y) => {
    const vh = m.vh;
    m.para.forEach(({ img, top, h, extra }) => {
      const rTop = top - y;
      if (rTop + h < -100 || rTop > vh + 100) return;
      const p = clamp((rTop + h / 2 - vh / 2) / (vh / 2 + h / 2), -1, 1); // 1 below → -1 above
      img.style.transform = `translate3d(0,${((-extra / 2) * (1 - p)).toFixed(1)}px,0)`;
    });
  };

  /* ── Nav + dock ──────────────────────────────────────────── */
  const nav = $("[data-nav]");
  const dock = $("[data-dock]");
  const hero = $(".hero");
  const pricing = $("#preco");
  const footer = $(".footer");
  let lastY = scrollY;

  const updateChrome = (y) => {
    nav.classList.toggle("is-scrolled", y > 16);
    if (y > 480 && y > lastY + 2) nav.classList.add("is-hidden");
    else if (y < lastY - 2 || y <= 480) nav.classList.remove("is-hidden");
    lastY = y;

    const bottom = y + m.vh;
    const inPricing = m.priceTop < bottom && m.priceEnd > y;
    dock.classList.toggle("is-visible", y > m.heroEnd && !inPricing && bottom < m.footTop);
  };

  /* ── Loop ────────────────────────────────────────────────── */
  let ticking = false;
  const frame = () => {
    const y = scrollY;
    updateGallery(y);
    updateParallax(y);
    updateChrome(y);
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };

  const measure = () => {
    m.vh = innerHeight;
    m.gallery = absTop(gallery);
    m.heroEnd = absTop(hero) + hero.offsetHeight;
    m.priceTop = absTop(pricing);
    m.priceEnd = m.priceTop + pricing.offsetHeight;
    m.footTop = absTop(footer);
    m.para = parallax.map(({ el, img }) => ({ img, top: absTop(el), h: el.offsetHeight, extra: img.offsetHeight - el.offsetHeight }));
    onScroll();
  };

  const onResize = () => { layoutGallery(); measure(); };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  addEventListener("load", onResize);
  pinMQ.addEventListener("change", onResize);
  document.fonts?.ready.then(measure);
  // Late layout shifts (images, fonts) move sections; re-measure without re-laying out the gallery.
  new ResizeObserver(() => measure()).observe(document.body);
  onResize();

  /* ── Pause decorative loops while offscreen ──────────────── */
  const idle = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle("is-offscreen", !en.isIntersecting));
  });
  $$(".marquee, .stamp, .ticket__plane, .dot").forEach((el) => idle.observe(el));

  const y = $("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
