/* CA³ client layer — no framework. Header state, scroll progress, parallax,
   glide covers, dialogs, the people dome, and Pagefind search. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── header: transparent while over the hero ─────────────── */
  const hdr = $(".hdr");
  if (hdr && hdr.dataset.overHero === "true") {
    const on = () => hdr.classList.toggle("over", scrollY < innerHeight * 0.62);
    on(); addEventListener("scroll", on, { passive: true }); addEventListener("resize", on);
  }

  /* ── scroll progress in place of a scrollbar ─────────────── */
  const prog = $(".sprog");
  if (prog) {
    let t;
    const run = () => {
      const h = document.documentElement.scrollHeight - innerHeight;
      prog.style.width = ((h > 0 ? Math.min(1, scrollY / h) : 0) * 100).toFixed(2) + "%";
      prog.classList.remove("idle");
      clearTimeout(t); t = setTimeout(() => prog.classList.add("idle"), 1200);
    };
    run(); addEventListener("scroll", run, { passive: true }); addEventListener("resize", run);
  }

  /* ── parallax + glide covers ─────────────────────────────── */
  if (!reduce) {
    const px = $$("[data-parallax]");
    if (px.length) {
      let raf = 0;
      const run = () => {
        raf = 0;
        px.forEach((el) => {
          const r = el.parentElement.getBoundingClientRect();
          const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
          el.style.transform = `translate3d(0,${(-p * (parseFloat(el.dataset.parallax) || 40)).toFixed(2)}px,0) scale(1.06)`;
        });
      };
      const on = () => { if (!raf) raf = requestAnimationFrame(run); };
      run(); addEventListener("scroll", on, { passive: true }); addEventListener("resize", on);
    }
  }

  /* ── dialogs (publication video) ─────────────────────────── */
  document.addEventListener("click", (e) => {
    const open = e.target.closest("[data-dialog-open]");
    if (open) { const d = document.getElementById(open.dataset.dialogOpen); if (d) { d.showModal(); document.body.style.overflow = "hidden"; } }
    const close = e.target.closest("[data-dialog-close]");
    if (close) close.closest("dialog").close();
  });
  $$("dialog.modal").forEach((d) => {
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    d.addEventListener("close", () => { document.body.style.overflow = ""; });
  });

  /* ── people dome ─────────────────────────────────────────── */
  const dome = $("[data-dome]");
  if (dome) {
    const sph = $(".sphere", dome), segments = +dome.dataset.segments || 22;
    const rot = { x: 0, y: 0 };
    let vel = 0, dragging = false, moved = false, start = null;
    const apply = () => { sph.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`; };
    new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      const basis = w / h >= 1.3 ? w : Math.min(w, h);
      const r = Math.min(Math.max(Math.min(basis * 0.62, h * 1.5), 440), 780);
      dome.style.setProperty("--radius", Math.round(r) + "px");
      dome.style.setProperty("--segx", segments);
      dome.style.setProperty("--segy", segments);
      apply();
    }).observe(dome);
    const step = () => {
      if (!dragging) { vel *= 0.955; rot.y = (rot.y + vel + (reduce ? 0 : 0.018)) % 360; apply(); }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - start.px, dy = e.clientY - start.py;
      if (dx * dx + dy * dy > 36) moved = true;
      rot.x = Math.max(-5, Math.min(5, start.rx - dy / 22));
      rot.y = start.ry + dx / 12;
      vel = (e.clientX - start.last) / 14; start.last = e.clientX;
      apply();
    };
    const up = () => {
      dragging = false; dome.classList.remove("grabbing");
      removeEventListener("pointermove", onMove); removeEventListener("pointerup", up); removeEventListener("pointercancel", up);
    };
    dome.addEventListener("pointerdown", (e) => {
      if (e.button) return;
      dragging = true; moved = false; vel = 0;
      start = { px: e.clientX, py: e.clientY, rx: rot.x, ry: rot.y, last: e.clientX };
      dome.classList.add("grabbing");
      addEventListener("pointermove", onMove); addEventListener("pointerup", up); addEventListener("pointercancel", up);
    });
    $$(".face", dome).forEach((a) => a.addEventListener("click", (e) => { if (moved) e.preventDefault(); }));
  }

  /* ── search: Pagefind index, built by `pagefind --site dist` ─ */
  const over = $("[data-search-overlay]"), input = $("[data-search-input]"),
        outEl = $("[data-search-results]"), sugg = $("[data-search-suggested]");
  if (over) {
    let pf = null, sel = 0, rows = [], groups = [], missing = false;
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const load = async () => {
      if (pf) return pf;
      try { pf = await import("/pagefind/pagefind.js"); await pf.init(); }
      catch {
        /* no index: `astro dev` before any `npm run build`, or a failed deploy */
        console.warn("Search index not found at /pagefind/ — run `npm run build` to create it.");
        missing = true; pf = { search: async () => ({ results: [] }) };
      }
      return pf;
    };
    const open = () => {
      over.hidden = false; document.body.style.overflow = "hidden";
      input.focus(); load();
    };
    const close = () => { over.hidden = true; document.body.style.overflow = ""; };
    const render = () => {
      if (!rows.length) {
        const q = input.value.trim();
        outEl.innerHTML = !q ? "" : missing
          ? `<div class="sgroup"><h4>Search unavailable</h4><p class="small">The search index has not been built. Run <code>npm run build</code> once, then search works here too.</p></div>`
          : `<div class="sgroup"><h4>No results</h4><p class="small">Nothing matches “${esc(q)}”.</p></div>`;
        return;
      }
      outEl.innerHTML = groups.map((g) => `<div class="sgroup"><h4>${esc(g.k)}</h4>${g.rows.map((r) => {
        const i = rows.indexOf(r);
        return `<a class="sres" href="${esc(r.href)}"${i === sel ? " data-on" : ""}><span class="k">${esc(r.kind)}</span><span class="t">${esc(r.title)}</span><span class="m">${esc(r.meta)}</span></a>`;
      }).join("")}</div>`).join("");
      const on = outEl.querySelector("[data-on]");
      if (on) on.scrollIntoView({ block: "nearest" });
    };
    let timer, seq = 0;
    const query = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const q = input.value.trim(), mine = ++seq;
        sugg.hidden = !!q;
        if (!q) { rows = []; render(); return; }
        const api = await load();
        const res = await api.search(q);
        const data = await Promise.all(res.results.slice(0, 24).map((x) => x.data()));
        if (mine !== seq) return; // a newer keystroke already answered
        const found = data.map((d) => ({
          kind: (d.meta && d.meta.kind) || "Page",
          title: (d.meta && d.meta.title) || d.url,
          meta: (d.meta && d.meta.meta) || "",
          href: d.url,
        }));
        /* group by kind in order of best hit; rows follow the on-screen order so arrow keys walk down the list */
        groups = [];
        found.forEach((r) => { let g = groups.find((x) => x.k === r.kind); if (!g) groups.push((g = { k: r.kind, rows: [] })); g.rows.push(r); });
        rows = groups.flatMap((g) => g.rows);
        sel = 0; render();
      }, 110);
    };
    input.addEventListener("input", query);
    $$("[data-search-suggest]").forEach((b) => b.addEventListener("click", () => { input.value = b.dataset.searchSuggest; query(); input.focus(); }));
    $$("[data-search-open]").forEach((b) => b.addEventListener("click", open));
    $$("[data-search-close]").forEach((b) => b.addEventListener("click", close));
    addEventListener("keydown", (e) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName))) { e.preventDefault(); open(); return; }
      if (over.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, rows.length - 1); render(); }
      if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); render(); }
      if (e.key === "Enter" && rows[sel]) { e.preventDefault(); location.href = rows[sel].href; }
    });
  }
  /* ── filter rail: collapse only; the bar stays pinned (headroom hide jittered) ───── */
  const rail = $("[data-filters]");
  if (rail) {
    const toggle = $("[data-filters-toggle]", rail), countEl = $("[data-filters-count]", rail);
    toggle && toggle.addEventListener("click", () => {
      const open = rail.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    const sync = () => {
      const n = $$("[data-facet]", rail).filter((b) => b.checked).length;
      if (countEl) countEl.textContent = n ? n + " active" : "All";
    };
    rail.addEventListener("change", sync);
    rail.addEventListener("click", (e) => { if (e.target.closest("[data-clear]")) setTimeout(sync, 0); });
    sync();
    /* facet groups fold; a group arriving with a selection (from an ?author= link) starts open */
    $$("[data-fgroup]", rail).forEach((g) => {
      const t = $("[data-fgroup-toggle]", g);
      if ($$("[data-facet]", g).some((b) => b.checked)) g.classList.add("open");
      t && t.setAttribute("aria-expanded", String(g.classList.contains("open")));
      t && t.addEventListener("click", () => { const o = g.classList.toggle("open"); t.setAttribute("aria-expanded", String(o)); });
    });
  }
})();
