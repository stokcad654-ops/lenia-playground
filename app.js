'use strict';

/* ── Lenia Playground — Application Logic ────────────────── */

(function () {

    const canvas  = document.getElementById('canvas');
    const hint    = document.getElementById('canvas-hint');
    let engine;

    try {
        engine = new LeniaEngine(canvas, 512);
    } catch (e) {
        document.body.innerHTML =
            `<div style="padding:2rem;color:#f44;font-family:monospace;">
                <h2>WebGL2 Error</h2><p>${e.message}</p>
                <p>Try a modern browser (Chrome, Firefox, Edge, Safari 15+).</p>
            </div>`;
        return;
    }

    /* ── State ───────────────────────────────────────────── */

    let activePreset = null;
    let animFrameId  = null;
    let frameCount   = 0;
    let fpsTime      = performance.now();

    /* ── Preset Buttons ──────────────────────────────────── */

    const presetContainer = document.getElementById('preset-buttons');
    Object.keys(PRESETS).forEach(key => {
        const p = PRESETS[key];
        const btn = document.createElement('button');
        btn.className = 'preset-btn';
        btn.dataset.preset = key;
        btn.innerHTML = `<span class="preset-name">${p.name}</span>
                         <span class="preset-desc">${p.desc}</span>`;
        btn.addEventListener('click', () => loadPreset(key));
        presetContainer.appendChild(btn);
    });

    /* ── Colormap Buttons ────────────────────────────────── */

    const cmapContainer = document.getElementById('colormap-buttons');
    COLORMAP_CLASSES.forEach((cls, i) => {
        const btn = document.createElement('button');
        btn.className = `colormap-btn ${cls}`;
        btn.title = COLORMAP_NAMES[i];
        btn.addEventListener('click', () => setColormap(i));
        cmapContainer.appendChild(btn);
    });

    /* ── Slider Bindings ─────────────────────────────────── */

    const sliders = {
        R:     { el: document.getElementById('slider-R'),     val: document.getElementById('val-R'),     fmt: v => v },
        mu:    { el: document.getElementById('slider-mu'),    val: document.getElementById('val-mu'),    fmt: v => parseFloat(v).toFixed(3) },
        sigma: { el: document.getElementById('slider-sigma'), val: document.getElementById('val-sigma'), fmt: v => parseFloat(v).toFixed(3) },
        dt:    { el: document.getElementById('slider-dt'),    val: document.getElementById('val-dt'),    fmt: v => parseFloat(v).toFixed(3) },
    };

    Object.keys(sliders).forEach(key => {
        sliders[key].el.addEventListener('input', () => {
            const raw = sliders[key].el.value;
            sliders[key].val.textContent = sliders[key].fmt(raw);
            const p = {};
            p[key] = parseFloat(raw);
            engine.setParams(p);
        });
    });

    function syncSlidersToParams(params) {
        if (params.R     !== undefined) { sliders.R.el.value     = params.R;     sliders.R.val.textContent     = sliders.R.fmt(params.R); }
        if (params.mu    !== undefined) { sliders.mu.el.value    = params.mu;    sliders.mu.val.textContent    = sliders.mu.fmt(params.mu); }
        if (params.sigma !== undefined) { sliders.sigma.el.value = params.sigma; sliders.sigma.val.textContent = sliders.sigma.fmt(params.sigma); }
        if (params.dt    !== undefined) { sliders.dt.el.value    = params.dt;    sliders.dt.val.textContent    = sliders.dt.fmt(params.dt); }
    }

    /* ── Actions ─────────────────────────────────────────── */

    function loadPreset(key) {
        const p = PRESETS[key];
        if (!p) return;

        activePreset = key;

        // Highlight button
        document.querySelectorAll('.preset-btn').forEach(b =>
            b.classList.toggle('active', b.dataset.preset === key));

        // Set params
        engine.setParams(p.params);
        syncSlidersToParams(p.params);

        // Initialize state
        if (p.init === 'pattern' && p.pattern) {
            engine.clear();
            engine.seedPattern(p.pattern, 0.5, 0.5, p.patternScale || 40);
        } else if (p.init === 'blobs' && p.blobs) {
            engine.clear();
            engine.seedBlobs(p.blobs);
        } else {
            engine.randomize(p.density || 0.25, p.patchSize || 0.04);
        }

        // Auto-play
        if (!engine.running) togglePlay();

        // Hide hint
        hint.classList.add('hidden');
    }

    function togglePlay() {
        engine.running = !engine.running;
        const btn  = document.getElementById('btn-play');
        const icon = document.getElementById('play-icon');
        if (engine.running) {
            icon.innerHTML = '&#9646;&#9646;';
            btn.textContent = '';
            btn.appendChild(icon);
            btn.append(' Pause');
            btn.classList.remove('paused');
        } else {
            icon.innerHTML = '&#9654;';
            btn.textContent = '';
            btn.appendChild(icon);
            btn.append(' Play');
            btn.classList.add('paused');
        }
    }

    document.getElementById('btn-play').addEventListener('click', togglePlay);
    document.getElementById('btn-step').addEventListener('click', () => {
        engine.step();
        engine.render();
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
        engine.clear();
        engine.render();
    });
    document.getElementById('btn-random').addEventListener('click', () => {
        engine.randomize();
        engine.render();
        hint.classList.add('hidden');
    });

    function setColormap(idx) {
        engine.setColormap(idx);
        document.querySelectorAll('.colormap-btn').forEach((b, i) =>
            b.classList.toggle('active', i === idx));
        engine.render();
    }

    /* ── Mouse / Touch Interaction ───────────────────────── */

    function canvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        return [x, y];
    }

    let mouseDown = false;

    canvas.addEventListener('mousedown', e => {
        mouseDown = true;
        const [x, y] = canvasCoords(e);
        engine.seedAt(x, y, 0.025, 0.9);
        engine.render();
        hint.classList.add('hidden');
    });

    canvas.addEventListener('mousemove', e => {
        if (!mouseDown) return;
        const [x, y] = canvasCoords(e);
        engine.seedAt(x, y, 0.018, 0.6);
        engine.render();
    });

    window.addEventListener('mouseup', () => { mouseDown = false; });

    canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t = e.touches[0];
        const [x, y] = canvasCoords(t);
        engine.seedAt(x, y, 0.025, 0.9);
        engine.render();
        hint.classList.add('hidden');
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const t = e.touches[0];
        const [x, y] = canvasCoords(t);
        engine.seedAt(x, y, 0.018, 0.6);
        engine.render();
    }, { passive: false });

    /* ── Keyboard Shortcuts ──────────────────────────────── */

    document.addEventListener('keydown', e => {
        if (e.target.tagName === 'INPUT') return;
        switch (e.key) {
            case ' ':  e.preventDefault(); togglePlay(); break;
            case 'c':  engine.clear(); engine.render(); break;
            case 'r':  engine.randomize(); engine.render(); break;
            case 's':  engine.step(); engine.render(); break;
            case '1': case '2': case '3': case '4':
                setColormap(parseInt(e.key) - 1); break;
        }
    });

    /* ── Animation Loop ──────────────────────────────────── */

    const fpsEl = document.getElementById('fps-counter');

    function animate(time) {
        if (engine.running) {
            engine.step();
        }
        engine.render();

        frameCount++;
        if (time - fpsTime > 1000) {
            fpsEl.textContent = `${frameCount} fps`;
            frameCount = 0;
            fpsTime = time;
        }

        animFrameId = requestAnimationFrame(animate);
    }

    /* ── Boot ────────────────────────────────────────────── */

    // Set default colormap
    setColormap(0);

    // Load default preset
    loadPreset('primordial');

    // Start loop
    animFrameId = requestAnimationFrame(animate);

})();
