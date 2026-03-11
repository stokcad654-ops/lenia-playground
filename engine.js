'use strict';

/* ── Shader Sources ──────────────────────────────────────── */

const VERT_SRC = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const SIM_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uRes;
uniform float uR;
uniform float uMu;
uniform float uSigma;
uniform float uDt;
uniform float uKMu;
uniform float uKSigma;

out vec4 fragColor;

float bell(float x, float m, float s) {
    float d = (x - m) / s;
    return exp(-0.5 * d * d);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float cur = texture(uState, uv).r;

    float total = 0.0;
    float ksum  = 0.0;
    int iR = int(ceil(uR));

    for (int dy = -iR; dy <= iR; dy++) {
        for (int dx = -iR; dx <= iR; dx++) {
            float r = length(vec2(float(dx), float(dy))) / uR;
            if (r > 1.0) continue;

            float k = bell(r, uKMu, uKSigma);
            vec2 sampleUV = fract((gl_FragCoord.xy + vec2(float(dx), float(dy))) / uRes);
            total += texture(uState, sampleUV).r * k;
            ksum  += k;
        }
    }

    float U = total / max(ksum, 1e-10);
    float G = 2.0 * bell(U, uMu, uSigma) - 1.0;
    float next = clamp(cur + uDt * G, 0.0, 1.0);

    fragColor = vec4(next, 0.0, 0.0, 1.0);
}
`;

const RENDER_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uRes;
uniform int uColormap;

out vec4 fragColor;

vec3 cmOcean(float t) {
    vec3 c0 = vec3(0.0,  0.0,   0.0);
    vec3 c1 = vec3(0.04, 0.12,  0.36);
    vec3 c2 = vec3(0.08, 0.42,  0.52);
    vec3 c3 = vec3(0.30, 0.80,  0.65);
    vec3 c4 = vec3(0.95, 0.98,  1.00);
    if (t < 0.20) return mix(c0, c1, t / 0.20);
    if (t < 0.40) return mix(c1, c2, (t - 0.20) / 0.20);
    if (t < 0.70) return mix(c2, c3, (t - 0.40) / 0.30);
    return mix(c3, c4, (t - 0.70) / 0.30);
}

vec3 cmEmber(float t) {
    vec3 c0 = vec3(0.0,  0.0,  0.0);
    vec3 c1 = vec3(0.40, 0.06, 0.06);
    vec3 c2 = vec3(0.80, 0.25, 0.05);
    vec3 c3 = vec3(1.00, 0.65, 0.10);
    vec3 c4 = vec3(1.00, 0.95, 0.80);
    if (t < 0.20) return mix(c0, c1, t / 0.20);
    if (t < 0.40) return mix(c1, c2, (t - 0.20) / 0.20);
    if (t < 0.70) return mix(c2, c3, (t - 0.40) / 0.30);
    return mix(c3, c4, (t - 0.70) / 0.30);
}

vec3 cmToxic(float t) {
    vec3 c0 = vec3(0.0,  0.0,  0.0);
    vec3 c1 = vec3(0.05, 0.25, 0.10);
    vec3 c2 = vec3(0.10, 0.55, 0.20);
    vec3 c3 = vec3(0.40, 0.85, 0.30);
    vec3 c4 = vec3(0.80, 1.00, 0.60);
    if (t < 0.20) return mix(c0, c1, t / 0.20);
    if (t < 0.40) return mix(c1, c2, (t - 0.20) / 0.20);
    if (t < 0.70) return mix(c2, c3, (t - 0.40) / 0.30);
    return mix(c3, c4, (t - 0.70) / 0.30);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float v = clamp(texture(uState, uv).r, 0.0, 1.0);

    vec3 color;
    if      (uColormap == 0) color = cmOcean(v);
    else if (uColormap == 1) color = cmEmber(v);
    else if (uColormap == 2) color = cmToxic(v);
    else                     color = vec3(v);

    fragColor = vec4(color, 1.0);
}
`;

const SEED_FRAG = `#version 300 es
precision highp float;

uniform sampler2D uState;
uniform vec2 uRes;
uniform vec2 uSeedPos;
uniform float uSeedRadius;
uniform float uSeedValue;

out vec4 fragColor;

void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float cur = texture(uState, uv).r;

    vec2 diff = uv - uSeedPos;
    // Toroidal wrap
    diff -= round(diff);
    float dist = length(diff);
    float blob = uSeedValue * exp(-dist * dist / (2.0 * uSeedRadius * uSeedRadius));

    fragColor = vec4(clamp(cur + blob, 0.0, 1.0), 0.0, 0.0, 1.0);
}
`;

const CLEAR_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0, 0.0, 0.0, 1.0); }
`;

/* ── Engine ──────────────────────────────────────────────── */

class LeniaEngine {
    constructor(canvas, gridSize) {
        this.canvas = canvas;
        this.gridSize = gridSize || 512;
        this.running = false;
        this.colormapIndex = 0;
        this.stepCount = 0;

        // Default Lenia parameters
        this.params = {
            R: 13, mu: 0.15, sigma: 0.017, dt: 0.1,
            kernelMu: 0.5, kernelSigma: 0.15,
        };

        this._initGL();
    }

    /* ── WebGL Setup ─────────────────────────────────────── */

    _initGL() {
        const gl = this.canvas.getContext('webgl2', { antialias: false, alpha: false });
        if (!gl) throw new Error('WebGL2 not supported in your browser.');

        const ext = gl.getExtension('EXT_color_buffer_float');
        if (!ext) throw new Error('Float framebuffers not supported (EXT_color_buffer_float).');

        this.gl = gl;

        // Compile shader programs
        this.simProg    = this._prog(VERT_SRC, SIM_FRAG);
        this.renderProg = this._prog(VERT_SRC, RENDER_FRAG);
        this.seedProg   = this._prog(VERT_SRC, SEED_FRAG);
        this.clearProg  = this._prog(VERT_SRC, CLEAR_FRAG);

        // Cache uniform locations
        this.u = {
            sim: {
                state: gl.getUniformLocation(this.simProg, 'uState'),
                res:   gl.getUniformLocation(this.simProg, 'uRes'),
                R:     gl.getUniformLocation(this.simProg, 'uR'),
                mu:    gl.getUniformLocation(this.simProg, 'uMu'),
                sigma: gl.getUniformLocation(this.simProg, 'uSigma'),
                dt:    gl.getUniformLocation(this.simProg, 'uDt'),
                kmu:   gl.getUniformLocation(this.simProg, 'uKMu'),
                ksig:  gl.getUniformLocation(this.simProg, 'uKSigma'),
            },
            render: {
                state: gl.getUniformLocation(this.renderProg, 'uState'),
                res:   gl.getUniformLocation(this.renderProg, 'uRes'),
                cmap:  gl.getUniformLocation(this.renderProg, 'uColormap'),
            },
            seed: {
                state: gl.getUniformLocation(this.seedProg, 'uState'),
                res:   gl.getUniformLocation(this.seedProg, 'uRes'),
                pos:   gl.getUniformLocation(this.seedProg, 'uSeedPos'),
                rad:   gl.getUniformLocation(this.seedProg, 'uSeedRadius'),
                val:   gl.getUniformLocation(this.seedProg, 'uSeedValue'),
            },
        };

        // Fullscreen quad
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
        // Bind aPos in all programs
        [this.simProg, this.renderProg, this.seedProg, this.clearProg].forEach(prog => {
            const loc = gl.getAttribLocation(prog, 'aPos');
            if (loc >= 0) {
                gl.enableVertexAttribArray(loc);
                gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
            }
        });
        this.vao = vao;

        // Create ping-pong framebuffers
        this.textures = [];
        this.framebuffers = [];
        this.currentTex = 0;

        for (let i = 0; i < 2; i++) {
            const tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F,
                this.gridSize, this.gridSize, 0,
                gl.RGBA, gl.FLOAT, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

            const fb = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error(`Framebuffer incomplete: ${status}`);
            }

            this.textures.push(tex);
            this.framebuffers.push(fb);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    _prog(vSrc, fSrc) {
        const gl = this.gl;
        const vs = this._shader(gl.VERTEX_SHADER, vSrc);
        const fs = this._shader(gl.FRAGMENT_SHADER, fSrc);
        const prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            throw new Error('Program link error: ' + gl.getProgramInfoLog(prog));
        }
        return prog;
    }

    _shader(type, src) {
        const gl = this.gl;
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            throw new Error('Shader error: ' + gl.getShaderInfoLog(s));
        }
        return s;
    }

    /* ── Simulation ──────────────────────────────────────── */

    step() {
        const gl = this.gl;
        const p = this.params;
        const src = this.currentTex;
        const dst = 1 - src;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[dst]);
        gl.viewport(0, 0, this.gridSize, this.gridSize);

        gl.useProgram(this.simProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[src]);
        gl.uniform1i(this.u.sim.state, 0);
        gl.uniform2f(this.u.sim.res, this.gridSize, this.gridSize);
        gl.uniform1f(this.u.sim.R,     p.R);
        gl.uniform1f(this.u.sim.mu,    p.mu);
        gl.uniform1f(this.u.sim.sigma, p.sigma);
        gl.uniform1f(this.u.sim.dt,    p.dt);
        gl.uniform1f(this.u.sim.kmu,   p.kernelMu);
        gl.uniform1f(this.u.sim.ksig,  p.kernelSigma);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.currentTex = dst;
        this.stepCount++;
    }

    render() {
        const gl = this.gl;

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        gl.useProgram(this.renderProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTex]);
        gl.uniform1i(this.u.render.state, 0);
        gl.uniform2f(this.u.render.res, this.canvas.width, this.canvas.height);
        gl.uniform1i(this.u.render.cmap, this.colormapIndex);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    /* ── Seeding ─────────────────────────────────────────── */

    seedAt(normX, normY, radius, value) {
        const gl = this.gl;
        const src = this.currentTex;
        const dst = 1 - src;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[dst]);
        gl.viewport(0, 0, this.gridSize, this.gridSize);

        gl.useProgram(this.seedProg);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[src]);
        gl.uniform1i(this.u.seed.state, 0);
        gl.uniform2f(this.u.seed.res, this.gridSize, this.gridSize);
        gl.uniform2f(this.u.seed.pos, normX, normY);
        gl.uniform1f(this.u.seed.rad, radius || 0.03);
        gl.uniform1f(this.u.seed.val, value  || 1.0);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.currentTex = dst;
    }

    seedPattern(data, centerX, centerY, patternSize) {
        // data: 2D array [rows][cols] of float [0,1]
        const gl = this.gl;
        const rows = data.length;
        const cols = data[0].length;
        const px = new Float32Array(this.gridSize * this.gridSize * 4);

        const cx = Math.floor(centerX * this.gridSize);
        const cy = Math.floor(centerY * this.gridSize);
        const scale = patternSize / Math.max(rows, cols);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (data[r][c] <= 0) continue;
                const gx = cx - Math.floor(cols * scale / 2) + Math.floor(c * scale);
                const gy = cy - Math.floor(rows * scale / 2) + Math.floor(r * scale);
                for (let sy = 0; sy < Math.ceil(scale); sy++) {
                    for (let sx = 0; sx < Math.ceil(scale); sx++) {
                        const px_x = ((gx + sx) % this.gridSize + this.gridSize) % this.gridSize;
                        const px_y = ((gy + sy) % this.gridSize + this.gridSize) % this.gridSize;
                        const idx = (px_y * this.gridSize + px_x) * 4;
                        px[idx] = Math.max(px[idx], data[r][c]);
                        px[idx + 3] = 1.0;
                    }
                }
            }
        }

        // Upload directly (no readPixels — assumes canvas was just cleared)
        gl.bindTexture(gl.TEXTURE_2D, this.textures[this.currentTex]);
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0,
            this.gridSize, this.gridSize,
            gl.RGBA, gl.FLOAT, px);
    }

    seedBlobs(blobs) {
        // blobs: [{x, y, r, v}, ...]  — normalized coords [0,1]
        for (const b of blobs) {
            this.seedAt(b.x, b.y, b.r, b.v);
        }
    }

    /* ── State Management ────────────────────────────────── */

    clear() {
        const gl = this.gl;
        const dst = 1 - this.currentTex;

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[dst]);
        gl.viewport(0, 0, this.gridSize, this.gridSize);
        gl.useProgram(this.clearProg);
        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        this.currentTex = dst;
        this.stepCount = 0;
    }

    randomize(density, patchSize) {
        density   = density   || 0.25;
        patchSize = patchSize || 0.04;

        this.clear();

        // Seed random blobs
        const count = Math.floor(density * 200);
        for (let i = 0; i < count; i++) {
            const x = Math.random();
            const y = Math.random();
            const r = patchSize * (0.5 + Math.random());
            const v = 0.3 + Math.random() * 0.7;
            this.seedAt(x, y, r, v);
        }
    }

    setParams(params) {
        Object.assign(this.params, params);
    }

    setColormap(index) {
        this.colormapIndex = index;
    }
}
