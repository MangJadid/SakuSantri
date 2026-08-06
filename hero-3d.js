// Ornamen 3D di hero: upgrade dari motif SVG 2D (dua cincin kotak berputar
// berlawanan arah) jadi versi 3D — permata bersegi (wireframe) emas & mint.
// Eksperimen ringan: pakai Three.js lewat CDN (tanpa build tool), poly rendah,
// wireframe basic material (tidak perlu lighting), berhenti otomatis saat
// prefers-reduced-motion, tab tidak aktif, atau elemen di luar layar.
(function () {
  const mount = document.getElementById('hero-3d');
  if (!mount) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return; // biarkan fallback SVG statis yang tampil

  import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
    .then((THREE) => setup(THREE))
    .catch(() => { /* CDN gagal dimuat -> biarkan fallback SVG statis */ });

  function setup(THREE) {
    if (!window.WebGLRenderingContext) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 5.4;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      return; // WebGL diblokir/tidak didukung -> fallback SVG statis tetap tampil
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.domElement.style.opacity = '0';
    renderer.domElement.style.transition = 'opacity 0.6s cubic-bezier(0.23,1,0.32,1)';
    mount.appendChild(renderer.domElement);

    // Crossfade dari motif SVG 2D ke canvas 3D (bukan pertukaran mendadak).
    mount.classList.add('is-ready');

    const outer = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 0),
      new THREE.MeshBasicMaterial({ color: 0xe8c96a, wireframe: true, transparent: true, opacity: 0.4 })
    );
    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.95, 0),
      new THREE.MeshBasicMaterial({ color: 0x7ed6a0, wireframe: true, transparent: true, opacity: 0.5 })
    );
    scene.add(outer, inner);

    // Ikut kursor: seluruh scene dimiringkan halus ke arah kursor (di-lerp, bukan
    // langsung nempel, biar terasa fluid). Hanya di device yang benar-benar punya
    // mouse presisi -- HP/tablet tetap dapat rotasi ambient saja tanpa ini.
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let targetTiltX = 0, targetTiltY = 0;
    if (canHover) {
      window.addEventListener('mousemove', (e) => {
        targetTiltY = (e.clientX / window.innerWidth - 0.5) * 0.6;
        targetTiltX = (e.clientY / window.innerHeight - 0.5) * 0.6;
      });
    }

    requestAnimationFrame(() => { renderer.domElement.style.opacity = '1'; });

    let visible = true;
    const io = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(mount);

    let running = document.visibilityState === 'visible';
    document.addEventListener('visibilitychange', () => {
      running = document.visibilityState === 'visible';
    });

    let curTiltX = 0, curTiltY = 0;
    let raf = null;
    function tick() {
      raf = requestAnimationFrame(tick);
      if (!visible || !running) return;
      outer.rotation.x += 0.0004;
      outer.rotation.y += 0.00085;
      inner.rotation.x -= 0.00055;
      inner.rotation.y -= 0.00113;

      // Lerp menuju posisi kursor -- terasa mengikuti dengan "berat"/fluid, bukan kaku.
      curTiltX += (targetTiltX - curTiltX) * 0.05;
      curTiltY += (targetTiltY - curTiltY) * 0.05;
      scene.rotation.x = curTiltX;
      scene.rotation.y = curTiltY;

      renderer.render(scene, camera);
    }
    tick();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const w = mount.clientWidth, h = mount.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }, 150);
    });
  }
})();
