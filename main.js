(() => {
  const doc = document.documentElement;
  doc.classList.add("js");

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ── Reveal on scroll ────────────────────────────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add("is-in");
      io.unobserve(en.target);
    });
  }, { rootMargin: "0px 0px -5% 0px" });
  $$("[data-reveal]").forEach((el) => io.observe(el));

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

  /* ── Nav + dock ──────────────────────────────────────────── */
  const nav = $("[data-nav]");
  const dock = $("[data-dock]");
  const hero = $(".hero");
  const pricing = $("#preco");
  const footer = $(".footer");
  let lastY = scrollY;
  let ticking = false;

  const frame = () => {
    const y = scrollY;
    nav.classList.toggle("is-scrolled", y > 16);
    if (y > 480 && y > lastY + 2) nav.classList.add("is-hidden");
    else if (y < lastY - 2 || y <= 480) nav.classList.remove("is-hidden");
    lastY = y;

    const vh = innerHeight;
    const p = pricing.getBoundingClientRect();
    const inPricing = p.top < vh && p.bottom > 0;
    const pastHero = hero.getBoundingClientRect().bottom < 0;
    const atFooter = footer.getBoundingClientRect().top < vh;
    dock.classList.toggle("is-visible", pastHero && !inPricing && !atFooter);
    ticking = false;
  };

  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  }, { passive: true });
  frame();

  const y = $("[data-year]");
  if (y) y.textContent = new Date().getFullYear();
})();
