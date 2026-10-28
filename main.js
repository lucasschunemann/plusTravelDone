(() => {
  const doc = document.documentElement;
  doc.classList.add("js");

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── Split headings into masked words ────────────────────── */
  $$("[data-split]").forEach((el) => {
    const label = el.textContent.replace(/\s+/g, " ").trim();
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.append(" "); return; }
            const w = document.createElement("span");
            const wi = document.createElement("span");
            w.className = "w";
            wi.className = "wi";
            wi.style.setProperty("--i", i++);
            wi.textContent = part;
            w.append(wi);
            frag.append(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === 1) walk(child);
      });
    };
    walk(el);
    el.setAttribute("aria-label", label);
    $$(".w", el).forEach((w) => w.setAttribute("aria-hidden", "true"));
  });

  /* ── Stagger indexes for lists ───────────────────────────── */
  $$(".topic").forEach((t) => $$("li", t).forEach((li, i) => li.style.setProperty("--i", i)));

  /* ── Hero intro ──────────────────────────────────────────── */
  const hero = $(".hero");
  const heroTitle = $("[data-split]", hero);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    hero.classList.add("is-loaded");
    heroTitle?.classList.add("is-in");
  }));

  /* ── Count up ────────────────────────────────────────────── */
  const countUp = (el) => {
    const to = +el.dataset.count;
    if (reduced) return;
    const t0 = performance.now(), dur = 1200;
    const tick = (t) => {
      const p = clamp((t - t0) / dur, 0, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  /* ── Reveal on scroll ────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      $$("[data-count]", en.target).forEach(countUp);
      io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  $$("[data-reveal], [data-split], .stats").forEach((el) => {
    if (el !== heroTitle) io.observe(el);
  });

  /* ── Marquee: duplicate items so the loop is seamless ────── */
  $$("[data-marquee] .marquee__track").forEach((track) => {
    [...track.children].forEach((li) => {
      const clone = li.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.append(clone);
    });
  });

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

  /* ── Lightbox for review screenshots ─────────────────────── */
  const box = $("[data-lightbox]");
  const boxImg = $("img", box);
  $$("[data-zoom]").forEach((btn) => {
    btn.addEventListener("click", () => {
      boxImg.src = btn.dataset.zoom;
      boxImg.alt = $("img", btn).alt;
      box.showModal();
    });
  });
  box.addEventListener("click", () => box.close());

  /* ── Scroll: nav, progress, dock, floating photos ────────── */
  const nav = $("[data-nav]");
  const progress = $(".nav__progress");
  const dock = $("[data-dock]");
  const pricing = $("#preco");
  const footer = $(".footer");
  const final = $("[data-final]");
  const floats = reduced ? [] : $$("[data-depth]", final);
  let lastY = scrollY;
  let ticking = false;

  const frame = () => {
    const y = scrollY;
    const vh = innerHeight;
    nav.classList.toggle("is-scrolled", y > 16);
    if (y > 480 && y > lastY + 2) nav.classList.add("is-hidden");
    else if (y < lastY - 2 || y <= 480) nav.classList.remove("is-hidden");
    lastY = y;

    const max = doc.scrollHeight - vh;
    progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);

    const p = pricing.getBoundingClientRect();
    const inPricing = p.top < vh && p.bottom > 0;
    const pastHero = hero.getBoundingClientRect().bottom < 0;
    const atFooter = footer.getBoundingClientRect().top < vh;
    dock.classList.toggle("is-visible", pastHero && !inPricing && !atFooter);

    if (floats.length) {
      const r = final.getBoundingClientRect();
      if (r.bottom > 0 && r.top < vh) {
        const off = r.top + r.height / 2 - vh / 2;
        floats.forEach((f) => f.style.setProperty("--y", `${(off * +f.dataset.depth).toFixed(1)}px`));
      }
    }
    ticking = false;
  };

  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }, { passive: true });
  addEventListener("resize", frame);
  frame();

  const yr = $("[data-year]");
  if (yr) yr.textContent = new Date().getFullYear();
})();
