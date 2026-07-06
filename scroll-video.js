// Scroll-scrubbed video — scroll distance through the section drives playback
(() => {
  "use strict";

  const section = document.getElementById("scene-video");
  const video = document.getElementById("scroll-video");
  if (!section || !video) return;

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

  let duration = 0;
  let ready = false;
  let ticking = false;

  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.pause();

  if (prefersReduced) {
    video.controls = true;
    return;
  }

  function setSectionHeight() {
    if (!duration) return;
    const scrollVh = Math.max(300, Math.ceil(duration * 42));
    section.style.setProperty("--scroll-video-length", scrollVh + "vh");
  }

  function updateFromScroll() {
    ticking = false;
    if (!ready) return;

    const scrollRange = section.offsetHeight - window.innerHeight;
    if (scrollRange <= 0) return;

    const rect = section.getBoundingClientRect();
    const progress = clamp(-rect.top / scrollRange, 0, 1);
    const targetTime = progress * duration;

    if (Math.abs(video.currentTime - targetTime) > 0.03) {
      video.currentTime = targetTime;
    }

    section.classList.toggle("scroll-video--complete", progress >= 0.995);
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateFromScroll);
  }

  function initVideo() {
    duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0) return;
    setSectionHeight();
    ready = true;
    requestUpdate();
  }

  video.addEventListener("loadedmetadata", initVideo);
  video.addEventListener("loadeddata", requestUpdate);
  video.addEventListener("error", () => section.classList.add("scroll-video--error"));

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });

  if (video.readyState >= 1) initVideo();
})();
