// Three.js cube — bottom of site (drag to rotate, scroll to zoom)
(() => {
  "use strict";

  const container = document.getElementById("site-cube");
  if (!container) return;

  if (typeof THREE === "undefined") {
    container.innerHTML =
      '<p class="mono site-cube__fallback">3d preview unavailable — check your connection</p>';
    return;
  }

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

  let renderer;
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.15, 2.8);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const canvas = renderer.domElement;
    canvas.setAttribute("aria-label", "Interactive 3D cube — drag to rotate, scroll to zoom");

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      metalness: 0.05,
      roughness: 0.72,
    });
    const cube = new THREE.Mesh(geometry, material);

    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color: 0x0a0a0a })
    );
    cube.add(wireframe);
    scene.add(cube);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(2.5, 3, 4);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;
    let autoSpin = !prefersReduced;
    let idleTimer = null;

    function scheduleAutoSpin() {
      clearTimeout(idleTimer);
      if (prefersReduced) return;
      idleTimer = setTimeout(() => {
        autoSpin = true;
      }, 2000);
    }

    function onPointerDown(e) {
      isDragging = true;
      autoSpin = false;
      lastX = e.clientX;
      lastY = e.clientY;
      container.classList.add("is-grabbing");
      canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      cube.rotation.y += dx * 0.012;
      cube.rotation.x += dy * 0.012;
      cube.rotation.x = clamp(cube.rotation.x, -1.2, 1.2);
    }

    function onPointerUp(e) {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove("is-grabbing");
      if (canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      scheduleAutoSpin();
    }

    function onWheel(e) {
      e.preventDefault();
      autoSpin = false;
      camera.position.z += e.deltaY * 0.0025;
      camera.position.z = clamp(camera.position.z, 1.6, 5.2);
      scheduleAutoSpin();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    function resize() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      renderer.render(scene, camera);
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    if ("ResizeObserver" in window) {
      new ResizeObserver(() => resize()).observe(container);
    }

    function animate() {
      requestAnimationFrame(animate);
      if (autoSpin && !isDragging) {
        cube.rotation.x += 0.005;
        cube.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    }

    animate();
  } catch (err) {
    console.error("Three.js cube failed:", err);
    if (renderer && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    container.innerHTML =
      '<p class="mono site-cube__fallback">3d preview unavailable on this device</p>';
  }
})();
