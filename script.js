// radical_prototypes — interactions
// minimal, dependency-free

(() => {
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* -------------------------------------------------------
     Custom cursor
  ------------------------------------------------------- */
  const cursor = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor__dot");
  const ring = document.querySelector(".cursor__ring");

  if (cursor && window.matchMedia("(hover: hover)").matches) {
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let dx = mx;
    let dy = my;
    let rx = mx;
    let ry = my;

    window.addEventListener(
      "mousemove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
      },
      { passive: true }
    );

    const tick = () => {
      // dot snaps almost instantly
      dx += (mx - dx) * 0.5;
      dy += (my - dy) * 0.5;
      // ring trails softly
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;

      dot.style.transform = `translate(${dx}px, ${dy}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // hover state on interactive elements
    const interactiveSelector =
      'a, button, [data-hl], .hl, .sidenav__link, .hero__scroll, .card, .mat, .media-card, .status-cell, .contact-links__btn, input, textarea, select';

    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(interactiveSelector)) {
        document.body.classList.add("is-hover");
      }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest(interactiveSelector)) {
        document.body.classList.remove("is-hover");
      }
    });

    document.addEventListener("mousedown", () => {
      ring.style.transition = "transform 0.2s ease";
    });
    document.addEventListener("mouseup", () => {
      ring.style.transition = "";
    });
  }

  /* -------------------------------------------------------
     Reveal on scroll (with stagger via --d delay)
  ------------------------------------------------------- */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-in"));
  }

  /* -------------------------------------------------------
     Highlight sweep (yellow underline) when inside viewport
  ------------------------------------------------------- */
  const highlights = document.querySelectorAll("[data-hl]");
  if ("IntersectionObserver" in window) {
    const hlObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const delay = Math.min(i * 60, 300);
            setTimeout(() => entry.target.classList.add("is-lit"), delay);
            hlObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    highlights.forEach((el) => hlObserver.observe(el));
  } else {
    highlights.forEach((el) => el.classList.add("is-lit"));
  }

  /* -------------------------------------------------------
     Active section dot (right side nav)
  ------------------------------------------------------- */
  const sectionIds = ["section-01", "section-02", "section-03", "section-04"];
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const navLinks = document.querySelectorAll(".sidenav__link");

  const setActive = (id) => {
    navLinks.forEach((a) => {
      const isActive = a.getAttribute("href") === "#" + id;
      a.classList.toggle("is-active", isActive);
    });
  };

  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        // pick the most-visible section
        let best = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!best || entry.intersectionRatio > best.intersectionRatio) {
              best = entry;
            }
          }
        });
        if (best) {
          setActive(best.target.id);
        }
      },
      { threshold: [0.25, 0.5, 0.75] }
    );
    sections.forEach((s) => navObserver.observe(s));
  }

  // smooth scroll fallback (browsers without scroll-behavior)
  navLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* -------------------------------------------------------
     Clock + uptime (mono displays)
  ------------------------------------------------------- */
  const clock = document.getElementById("clock");
  const clockFoot = document.getElementById("clock-foot");
  const uptime = document.getElementById("uptime");
  const start = performance.now();

  const pad = (n) => String(n).padStart(2, "0");

  const tickClock = () => {
    const d = new Date();
    const hh = pad(d.getUTCHours());
    const mm = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    const timeUtc = `${hh}:${mm}:${ss} utc`;
    if (clock) clock.textContent = timeUtc;
    if (clockFoot) clockFoot.textContent = `${hh}:${mm}:${ss}`;

    if (uptime) {
      const ms = performance.now() - start;
      const totalSec = Math.floor(ms / 1000);
      const h = pad(Math.floor(totalSec / 3600));
      const m = pad(Math.floor((totalSec % 3600) / 60));
      const s = pad(totalSec % 60);
      uptime.textContent = `uptime ${h}:${m}:${s}`;
    }
  };
  tickClock();
  setInterval(tickClock, 1000);

  /* -------------------------------------------------------
     Subtle parallax for hero title
  ------------------------------------------------------- */
  if (!prefersReduced) {
    const heroTitle = document.querySelector(".hero__title");
    if (heroTitle) {
      window.addEventListener(
        "scroll",
        () => {
          const y = window.scrollY;
          if (y < window.innerHeight) {
            heroTitle.style.transform = `translateY(${y * 0.08}px)`;
            heroTitle.style.opacity = String(
              Math.max(0, 1 - y / (window.innerHeight * 0.85))
            );
          }
        },
        { passive: true }
      );
    }

    // ambient grid drifts with scroll
    const grid = document.querySelector(".ambient__grid");
    if (grid) {
      window.addEventListener(
        "scroll",
        () => {
          const y = window.scrollY;
          grid.style.backgroundPosition = `0 ${y * 0.05}px, 0 ${y * 0.05}px`;
        },
        { passive: true }
      );
    }
  }
})();
