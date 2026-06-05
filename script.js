// radical_prototypes — living research organism
// dependency-free particle engine + scroll orchestration

(() => {
  "use strict";

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const INK = "10, 10, 10";
  const YELLOW = "255, 230, 60";

  /* =======================================================
     CUSTOM CURSOR
  ======================================================= */
  (() => {
    const cursor = document.querySelector(".cursor");
    const dot = document.querySelector(".cursor__dot");
    const ring = document.querySelector(".cursor__ring");
    if (!cursor || !window.matchMedia("(hover: hover)").matches) return;

    let mx = innerWidth / 2,
      my = innerHeight / 2,
      dx = mx,
      dy = my,
      rx = mx,
      ry = my;

    addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    const tick = () => {
      dx += (mx - dx) * 0.5;
      dy += (my - dy) * 0.5;
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate(${dx}px,${dy}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    const sel =
      "a, button, .domain-label, .sidenav__link, .hero__enter, .contact-links__btn, .detail__back";
    addEventListener("mouseover", (e) => {
      if (e.target.closest(sel)) document.body.classList.add("is-hover");
    });
    addEventListener("mouseout", (e) => {
      if (e.target.closest(sel)) document.body.classList.remove("is-hover");
    });
  })();

  /* =======================================================
     REVEAL ON SCROLL
  ======================================================= */
  (() => {
    const reveals = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || prefersReduced) {
      reveals.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  })();

  /* =======================================================
     SIDE-NAV smooth scroll + active state
  ======================================================= */
  const navLinks = Array.from(document.querySelectorAll(".sidenav__link"));
  navLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const t = id && document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      t.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
    });
  });

  /* =======================================================
     PARTICLE FIELD
  ======================================================= */
  const canvas = document.getElementById("field");

  if (!canvas || prefersReduced) {
    // reduced-motion: open both detail panels, wire domain buttons as anchors
    document.querySelectorAll(".detail").forEach((d) => (d.style.display = "block"));
  }

  let W = 0,
    H = 0,
    DPR = 1;
  const ctx = canvas && !prefersReduced ? canvas.getContext("2d") : null;

  // ---- particle pool ----
  let particles = [];
  let COUNT = 0;

  function desiredCount() {
    // denser pool so assembled text reads clearly
    return Math.min(6000, Math.max(2200, Math.floor((W * H) / 450)));
  }

  function buildPool() {
    COUNT = desiredCount();
    particles = new Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      particles[i] = {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: 0,
        vy: 0,
        tx: 0,
        ty: 0,
        hasTarget: false,
        seed: Math.random() * 1000,
        k: 0.012 + Math.random() * 0.01, // per-particle spring (stagger)
        node: -1, // network node index
        struct: -1, // network structure index
        ox: 0, // orbit offset
        oy: 0,
        a: 0.35 + Math.random() * 0.3, // base alpha
      };
    }
  }

  function resize() {
    if (!canvas) return;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const want = desiredCount();
    if (!particles.length || Math.abs(particles.length - want) > want * 0.22) {
      buildPool();
    }
    structuresDirty = true;
    // re-apply current visual state to new dimensions
    applyState(true);
  }

  /* -------------------------------------------------------
     TEXT SAMPLING — turn phrases into target points
  ------------------------------------------------------- */
  const sampleCache = new Map();

  function sampleText(lines) {
    const key = lines.join("|") + "@" + W + "x" + H;
    if (sampleCache.has(key)) return sampleCache.get(key);

    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const o = off.getContext("2d");

    // size font so the longest line fits ~78% of width
    o.textAlign = "center";
    o.textBaseline = "middle";
    const base = 100;
    o.font = `600 ${base}px "Space Grotesk", sans-serif`;
    let widest = 1;
    lines.forEach((l) => {
      widest = Math.max(widest, o.measureText(l).width);
    });
    let fs = (base * (W * 0.78)) / widest;
    fs = Math.max(26, Math.min(fs, Math.min(150, H * 0.26)));
    // also constrain by total height
    const lh = fs * 1.08;
    const totalH = lh * lines.length;
    if (totalH > H * 0.6) {
      fs *= (H * 0.6) / totalH;
    }
    const lineH = fs * 1.08;

    o.font = `600 ${fs}px "Space Grotesk", sans-serif`;
    o.fillStyle = "#000";
    const startY = H / 2 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((l, i) => o.fillText(l, W / 2, startY + i * lineH));

    const img = o.getImageData(0, 0, W, H).data;
    // finer sampling = more granules tracing each letter
    const step = fs > 110 ? 3 : fs > 70 ? 2 : 2;
    const pts = [];
    for (let y = 0; y < H; y += step) {
      for (let x = 0; x < W; x += step) {
        if (img[(y * W + x) * 4 + 3] > 130) {
          pts.push({ x: x + (Math.random() - 0.5) * step, y: y + (Math.random() - 0.5) * step });
        }
      }
    }
    // shuffle so subsampling is uniform
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [pts[i], pts[j]] = [pts[j], pts[i]];
    }
    sampleCache.set(key, pts);
    return pts;
  }

  function assignText(lines) {
    const pts = sampleText(lines);
    const n = particles.length;
    if (!pts.length) {
      assignFree();
      return;
    }
    let target = pts;
    if (pts.length > n) target = pts.slice(0, n);

    for (let i = 0; i < n; i++) {
      const p = particles[i];
      p.struct = -1;
      if (i < target.length) {
        p.tx = target[i].x;
        p.ty = target[i].y;
        p.hasTarget = true;
        p.a = 0.82;
      } else {
        // surplus agents drift faintly behind
        p.hasTarget = false;
        p.a = 0.16;
      }
    }
  }

  function assignFree() {
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.hasTarget = false;
      p.struct = -1;
      p.a = 0.28 + (i % 7) * 0.02;
    }
  }

  /* -------------------------------------------------------
     NETWORK STRUCTURES (branching organisms)
  ------------------------------------------------------- */
  let structures = [];
  let structuresDirty = true;

  function makeStructure(seedAngle) {
    const nodes = [{ ux: 0, uy: 0, d: 0 }];
    const edges = [];
    const ring1 = 6;
    for (let i = 0; i < ring1; i++) {
      const ang = seedAngle + (i / ring1) * Math.PI * 2;
      const r1 = 0.42 + Math.random() * 0.08;
      const idx = nodes.length;
      nodes.push({ ux: Math.cos(ang) * r1, uy: Math.sin(ang) * r1, d: 1 });
      edges.push([0, idx]);
      // two children per ring-1 node
      const kids = 2;
      for (let k = 0; k < kids; k++) {
        const spread = 0.42;
        const a2 = ang + (k === 0 ? -spread : spread) * (0.6 + Math.random() * 0.5);
        const r2 = 0.82 + Math.random() * 0.16;
        const cidx = nodes.length;
        nodes.push({ ux: Math.cos(a2) * r2, uy: Math.sin(a2) * r2, d: 2 });
        edges.push([idx, cidx]);
      }
    }
    return {
      nodes,
      edges,
      cx: 0,
      cy: 0,
      r: 0,
      tcx: 0,
      tcy: 0,
      tr: 0,
      alpha: 1,
      talpha: 1,
      hover: 0,
      rot: Math.random() * Math.PI,
    };
  }

  function buildStructures() {
    structures = [makeStructure(0.2), makeStructure(1.4)];
    structures[0].domain = "loop";
    structures[1].domain = "memory";
    structuresDirty = false;
    layoutStructures();
    assignNetwork();
  }

  function layoutStructures() {
    const baseR = Math.min(W, H) * 0.17;
    const cy = H * 0.52;
    if (selectedDomain) {
      structures.forEach((s) => {
        if (s.domain === selectedDomain) {
          s.tcx = W * (W > 900 ? 0.24 : 0.5);
          s.tcy = H * 0.4;
          s.tr = Math.min(W, H) * 0.26;
          s.talpha = W > 900 ? 0.5 : 0.32;
        } else {
          s.tcx = W * 1.25;
          s.tcy = H * 0.5;
          s.tr = baseR * 0.5;
          s.talpha = 0;
        }
      });
    } else {
      structures[0].tcx = W * 0.34;
      structures[0].tcy = cy;
      structures[0].tr = baseR;
      structures[0].talpha = 1;
      structures[1].tcx = W * 0.66;
      structures[1].tcy = cy;
      structures[1].tr = baseR;
      structures[1].talpha = 1;
      if (W <= 720) {
        structures[0].tcx = W * 0.5;
        structures[0].tcy = H * 0.34;
        structures[1].tcx = W * 0.5;
        structures[1].tcy = H * 0.7;
      }
    }
  }

  function assignNetwork() {
    const n = particles.length;
    for (let i = 0; i < n; i++) {
      const p = particles[i];
      const s = i % structures.length;
      const st = structures[s];
      const nodeIdx = (Math.floor(i / structures.length)) % st.nodes.length;
      p.struct = s;
      p.node = nodeIdx;
      p.hasTarget = true;
      const oa = Math.random() * Math.PI * 2;
      const orr = Math.random();
      p.ox = Math.cos(oa) * orr;
      p.oy = Math.sin(oa) * orr;
      p.a = 0.55;
    }
  }

  /* -------------------------------------------------------
     FLOW FIELD (computational drift)
  ------------------------------------------------------- */
  let T = 0;
  function flow(x, y) {
    return (
      (Math.sin(x * 0.0075 + T * 0.00035) +
        Math.cos(y * 0.0075 - T * 0.00045)) *
      Math.PI
    );
  }

  /* -------------------------------------------------------
     RENDER LOOP
  ------------------------------------------------------- */
  let mouseX = -9999,
    mouseY = -9999;
  addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  let running = false;
  function loop() {
    if (!ctx) return;
    T += 16;
    ctx.clearRect(0, 0, W, H);

    const networkMode = currentScene === "domains";

    // advance structures
    if (networkMode && structures.length) {
      structures.forEach((s) => {
        s.cx += (s.tcx - s.cx) * 0.08;
        s.cy += (s.tcy - s.cy) * 0.08;
        s.r += (s.tr - s.r) * 0.08;
        s.alpha += (s.talpha - s.alpha) * 0.08;
        s.rot += 0.0006;
        // hover detection
        const dxm = mouseX - s.cx;
        const dym = mouseY - s.cy;
        const over = Math.hypot(dxm, dym) < s.r * 1.25 && s.alpha > 0.5;
        s.hover += ((over ? 1 : 0) - s.hover) * 0.1;
      });

      drawEdges();
    }

    // particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (networkMode && p.struct >= 0) {
        const s = structures[p.struct];
        const nd = s.nodes[p.node];
        const ca = Math.cos(s.rot),
          sa = Math.sin(s.rot);
        const nx = nd.ux * ca - nd.uy * sa;
        const ny = nd.ux * sa + nd.uy * ca;
        const orbit = s.r * 0.07 * (1 + s.hover * 0.8);
        p.tx = s.cx + nx * s.r + p.ox * orbit;
        p.ty = s.cy + ny * s.r + p.oy * orbit;
        p.hasTarget = s.alpha > 0.05;
        steer(p, 0.018, 0.82, s.hover);
        p.curAlpha = p.a * s.alpha;
        if (s.hover > 0.4 && nd.d === 0) p.curAlpha = Math.min(1, p.curAlpha + 0.3);
      } else if (p.hasTarget) {
        steer(p, p.k, 0.84, 0);
        p.curAlpha = p.a;
      } else {
        // free drift
        const ang = flow(p.x, p.y) + p.seed * 0.001;
        p.vx += Math.cos(ang) * 0.06;
        p.vy += Math.sin(ang) * 0.06;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        p.curAlpha = p.a;
      }

      const sz = p.hasTarget ? 1.9 : 1.3;
      ctx.fillStyle = `rgba(${INK}, ${p.curAlpha})`;
      ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }

    // node glow on hover
    if (networkMode) drawNodes();

    requestAnimationFrame(loop);
  }

  function steer(p, k, damp, hover) {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const dist = Math.hypot(dx, dy);
    p.vx += dx * k;
    p.vy += dy * k;
    if (dist > 18) {
      const ang = flow(p.x, p.y);
      const j = 0.22 + hover * 0.3;
      p.vx += Math.cos(ang) * j;
      p.vy += Math.sin(ang) * j;
    }
    p.vx *= damp;
    p.vy *= damp;
    p.x += p.vx;
    p.y += p.vy;
  }

  function drawEdges() {
    structures.forEach((s) => {
      if (s.alpha < 0.06) return;
      const ca = Math.cos(s.rot),
        sa = Math.sin(s.rot);
      const pos = (nd) => ({
        x: s.cx + (nd.ux * ca - nd.uy * sa) * s.r,
        y: s.cy + (nd.ux * sa + nd.uy * ca) * s.r,
      });
      const baseAlpha = (0.05 + s.hover * 0.32) * s.alpha;
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(${INK}, ${baseAlpha})`;
      ctx.beginPath();
      s.edges.forEach(([a, b]) => {
        const pa = pos(s.nodes[a]);
        const pb = pos(s.nodes[b]);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      });
      ctx.stroke();
    });
  }

  function drawNodes() {
    structures.forEach((s) => {
      if (s.hover < 0.15 || s.alpha < 0.4) return;
      const ca = Math.cos(s.rot),
        sa = Math.sin(s.rot);
      s.nodes.forEach((nd) => {
        const x = s.cx + (nd.ux * ca - nd.uy * sa) * s.r;
        const y = s.cy + (nd.ux * sa + nd.uy * ca) * s.r;
        const rad = (nd.d === 0 ? 5 : nd.d === 1 ? 3.4 : 2.4) * (0.7 + s.hover * 0.5);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 4);
        g.addColorStop(0, `rgba(${YELLOW}, ${0.9 * s.hover})`);
        g.addColorStop(1, `rgba(${YELLOW}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${INK}, ${0.85 * s.hover})`;
        ctx.beginPath();
        ctx.arc(x, y, rad * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  /* =======================================================
     SCENE / STAGE ORCHESTRATION
  ======================================================= */
  let currentScene = "hero";
  let currentStage = -1;
  let selectedDomain = null;

  const sceneEls = [
    { id: "hero", el: document.getElementById("scene-hero") },
    { id: "philosophy", el: document.getElementById("scene-philosophy") },
    { id: "domains", el: document.getElementById("scene-domains") },
    { id: "status", el: document.getElementById("scene-status") },
  ].filter((s) => s.el);

  const PHRASES = [
    ["WHAT IS A", "RADICAL", "PROTOTYPE?"],
    null, // stage 1 = definition (HTML), particles drift
    ["not a product."],
    ["not a prediction."],
    ["a test of", "a possible future."],
  ];

  function applyState(force) {
    if (!ctx) return;
    if (currentScene === "hero" || currentScene === "status") {
      if (force || lastApplied !== currentScene) assignFree();
    } else if (currentScene === "philosophy") {
      const stage = currentStage;
      if (force || lastApplied !== "philosophy:" + stage) {
        const phrase = PHRASES[stage];
        if (phrase) assignText(phrase);
        else assignFree();
      }
      lastApplied = "philosophy:" + stage;
      lastAppliedScene = currentScene;
      return;
    } else if (currentScene === "domains") {
      if (structuresDirty || !structures.length) {
        buildStructures();
      } else {
        layoutStructures();
        assignNetwork();
      }
    }
    lastApplied = currentScene;
    lastAppliedScene = currentScene;
  }
  let lastApplied = "";
  let lastAppliedScene = "";

  function setScene(scene) {
    if (scene === currentScene) return;
    currentScene = scene;
    document.body.dataset.scene = scene;
    // update sidenav active
    navLinks.forEach((a) =>
      a.classList.toggle("is-active", a.getAttribute("href") === "#scene-" + scene)
    );
    if (scene === "domains" && (structuresDirty || !structures.length)) {
      buildStructures();
    }
    applyState(true);
  }

  function setStage(stage) {
    if (stage === currentStage) return;
    currentStage = stage;
    document.body.dataset.stage = String(stage);
    if (currentScene === "philosophy") applyState(false);
  }

  function onScroll() {
    const vh = innerHeight;
    const mid = vh * 0.5;
    let active = sceneEls[0];
    for (const s of sceneEls) {
      const r = s.el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) {
        active = s;
        break;
      }
    }
    setScene(active.id);

    if (active.id === "philosophy") {
      const r = active.el.getBoundingClientRect();
      const total = active.el.offsetHeight - vh;
      const progress = clamp(-r.top / Math.max(1, total), 0, 0.9999);
      const stage = Math.floor(progress * PHRASES.length);
      setStage(Math.min(PHRASES.length - 1, stage));
    }
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  /* =======================================================
     DOMAIN SELECTION
  ======================================================= */
  const detailLoop = document.getElementById("detail-loop");
  const detailMemory = document.getElementById("detail-memory");

  function openDomain(domain) {
    selectedDomain = domain;
    document.body.classList.add("domain-open");
    if (detailLoop) detailLoop.classList.toggle("is-open", domain === "loop");
    if (detailMemory) detailMemory.classList.toggle("is-open", domain === "memory");
    if (structures.length) layoutStructures();
    // bring the freshly opened detail into view
    const target = domain === "loop" ? detailLoop : detailMemory;
    if (target) {
      requestAnimationFrame(() =>
        target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" })
      );
    }
  }

  function closeDomain() {
    selectedDomain = null;
    document.body.classList.remove("domain-open");
    if (detailLoop) detailLoop.classList.remove("is-open");
    if (detailMemory) detailMemory.classList.remove("is-open");
    if (structures.length) layoutStructures();
    const stage = document.querySelector(".domains__stage");
    if (stage)
      stage.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }

  document.querySelectorAll(".domain-label").forEach((btn) => {
    btn.addEventListener("click", () => openDomain(btn.dataset.domain));
  });
  document.querySelectorAll("[data-back]").forEach((b) =>
    b.addEventListener("click", closeDomain)
  );

  /* =======================================================
     BOOT
  ======================================================= */
  if (ctx) {
    resize();
    let rt;
    addEventListener("resize", () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        sampleCache.clear();
        resize();
      }, 180);
    });
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    requestAnimationFrame(loop);

    // re-sample text once the geometric font is ready
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        sampleCache.clear();
        if (currentScene === "philosophy") applyState(true);
      });
    }
  } else {
    // no canvas (reduced motion): still wire nav active state on scroll
    addEventListener(
      "scroll",
      () => {
        const mid = innerHeight * 0.5;
        for (const s of sceneEls) {
          const r = s.el.getBoundingClientRect();
          if (r.top <= mid && r.bottom >= mid) {
            navLinks.forEach((a) =>
              a.classList.toggle(
                "is-active",
                a.getAttribute("href") === "#scene-" + s.id
              )
            );
            break;
          }
        }
      },
      { passive: true }
    );
  }
})();
