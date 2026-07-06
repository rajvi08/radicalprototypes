import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

// Interactive GLB viewers — drag to rotate, scroll to zoom
(() => {
  "use strict";

  const stages = document.querySelectorAll(".glb-viewer__stage[data-glb]");
  if (!stages.length) return;

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

  function fitModel(model, camera, margin = 1.35) {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const fov = camera.fov * (Math.PI / 180);
    let distance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    distance *= margin;

    camera.position.set(0, maxDim * 0.08, distance);
    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 100;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    return { distance, minZoom: distance * 0.55, maxZoom: distance * 2.4 };
  }

  function initStage(container) {
    const src = container.getAttribute("data-glb");
    if (!src) return;

    const isDark = container.getAttribute("data-theme") === "dark";
    const label =
      container.getAttribute("aria-label") ||
      "Interactive 3D model — drag to rotate, scroll to zoom";

    container.classList.add("is-loading");

    let renderer;
    let pivot;
    let zoom = { min: 1.6, max: 5.2 };
    let loadingEl;

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);
      camera.position.set(0, 0.15, 2.8);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = isDark ? 1.25 : 1.05;

      const keyLight = new THREE.DirectionalLight(0xffffff, isDark ? 2.1 : 1.35);
      keyLight.position.set(2.5, 3, 4);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.15 : 0.45);
      fillLight.position.set(-2, 1.5, 2);
      scene.add(fillLight);

      scene.add(new THREE.AmbientLight(0xffffff, isDark ? 1.05 : 0.65));

      if (isDark) {
        scene.add(new THREE.HemisphereLight(0xffffff, 0x333333, 0.85));
      }

      pivot = new THREE.Group();
      scene.add(pivot);

      loadingEl = document.createElement("p");
      loadingEl.className = "mono glb-viewer__loading";
      loadingEl.textContent = "loading model…";

      container.innerHTML = "";
      container.appendChild(renderer.domElement);
      container.appendChild(loadingEl);

      const canvas = renderer.domElement;
      canvas.setAttribute("aria-label", label);

      let isDragging = false;
      let lastX = 0;
      let lastY = 0;
      let autoSpin = !prefersReduced;
      let idleTimer = null;
      let loaded = false;

      function scheduleAutoSpin() {
        clearTimeout(idleTimer);
        if (prefersReduced) return;
        idleTimer = setTimeout(() => {
          autoSpin = true;
        }, 2000);
      }

      function bindControls() {
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
          pivot.rotation.y += dx * 0.012;
          pivot.rotation.x += dy * 0.012;
          pivot.rotation.x = clamp(pivot.rotation.x, -1.2, 1.2);
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
          camera.position.z = clamp(camera.position.z, zoom.min, zoom.max);
          scheduleAutoSpin();
        }

        canvas.addEventListener("pointerdown", onPointerDown);
        canvas.addEventListener("pointermove", onPointerMove);
        canvas.addEventListener("pointerup", onPointerUp);
        canvas.addEventListener("pointercancel", onPointerUp);
        canvas.addEventListener("wheel", onWheel, { passive: false });
      }

      bindControls();

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
      requestAnimationFrame(() => requestAnimationFrame(resize));

      window.addEventListener("resize", resize, { passive: true });
      if ("ResizeObserver" in window) {
        new ResizeObserver(() => resize()).observe(container);
      }

      function animate() {
        requestAnimationFrame(animate);
        if (loaded && autoSpin && !isDragging) {
          pivot.rotation.x += 0.004;
          pivot.rotation.y += 0.007;
        }
        renderer.render(scene, camera);
      }

      animate();

      const loader = new GLTFLoader();
      loader.load(
        src,
        (gltf) => {
          pivot.add(gltf.scene);
          const bounds = fitModel(gltf.scene, camera);
          zoom.min = bounds.minZoom;
          zoom.max = bounds.maxZoom;
          loaded = true;
          container.classList.remove("is-loading");
          if (loadingEl && loadingEl.parentNode) {
            loadingEl.parentNode.removeChild(loadingEl);
          }
          resize();
        },
        undefined,
        (err) => {
          console.error("GLB load failed:", src, err);
          container.classList.remove("is-loading");
          if (loadingEl) loadingEl.textContent = "3d preview unavailable";
          else {
            container.innerHTML =
              '<p class="mono glb-viewer__fallback">3d preview unavailable</p>';
          }
        }
      );
    } catch (err) {
      console.error("GLB viewer failed:", err);
      if (renderer && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      container.classList.remove("is-loading");
      container.innerHTML =
        '<p class="mono glb-viewer__fallback">3d preview unavailable on this device</p>';
    }
  }

  stages.forEach(initStage);
})();
