# Lenia Playground

**Interactive browser-based simulator for [Lenia](https://arxiv.org/abs/1812.05433) — a continuous cellular automaton that produces lifelike, self-organizing patterns from pure mathematics.**

> _"Life-like phenomena can emerge from surprisingly simple continuous rules."_ — Bert Chan

**[Try the live demo](https://memess2001.github.io/lenia-playground/)**

---

## What is Lenia?

Lenia is a family of continuous cellular automata discovered by Bert Chan. Unlike Conway's Game of Life (which uses discrete on/off cells on a grid), Lenia operates in continuous space with continuous states, producing smooth, organic forms that move, grow, and interact like living organisms.

The update rule is deceptively simple:

```
state += dt * growth( convolution(state, kernel) )
```

A ring-shaped kernel measures local density. A Gaussian growth function decides whether each point grows or decays. From this emerges an astonishing diversity of self-organizing structures — gliders, oscillators, crawlers, and more.

## Features

- **WebGL2-accelerated** — real-time simulation at 60-120fps on a 512x512 grid
- **6 parameter presets** — Primordial Soup, Orbium, Smooth Cells, Worms, Oscillators, Galaxy
- **Interactive seeding** — click or drag to inject life into the simulation
- **Live parameter tuning** — adjust kernel radius, growth center/width, and time step in real time
- **4 colormaps** — Ocean, Ember, Toxic, Mono
- **Keyboard shortcuts** — Space (play/pause), C (clear), R (random), S (step), 1-4 (colormaps)
- **Mobile-friendly** — responsive layout with touch support
- **Zero dependencies** — pure HTML/CSS/JS, no build step

## Quick Start

Clone and open:

```bash
git clone https://github.com/memess2001/lenia-playground.git
cd lenia-playground
# Open index.html in your browser, or serve locally:
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## How It Works

The simulation runs entirely on the GPU via WebGL2 fragment shaders:

1. **Convolution**: For each pixel, sample all neighbors within radius R. Weight by a Gaussian ring kernel K(r) = exp(-((r - 0.5) / 0.15)^2 / 2).
2. **Growth**: Apply a Gaussian growth function G(U) = 2 * exp(-((U - mu) / sigma)^2 / 2) - 1, mapping neighborhood potential to growth/decay.
3. **Update**: new_state = clamp(old_state + dt * G, 0, 1).
4. **Render**: Map state values through a colormap for visualization.

Two framebuffers (RGBA16F) ping-pong between simulation steps. Toroidal boundary conditions (wrapping edges) keep patterns alive.

## Parameters

| Parameter | Range | Effect |
|-----------|-------|--------|
| **R** (radius) | 5–28 | Kernel size. Larger = bigger organisms, slower computation |
| **mu** (growth center) | 0.01–0.50 | Target neighborhood density for growth |
| **sigma** (growth width) | 0.001–0.10 | Sensitivity. Smaller = sharper threshold |
| **dt** (time step) | 0.01–0.20 | Integration speed. Larger = faster but less stable |

## References

- Bert Chan, [Lenia — Biology of Artificial Life](https://arxiv.org/abs/1812.05433) (2018)
- Bert Chan, [Lenia and Expanded Universe](https://arxiv.org/abs/2005.03742) (2020)
- [Original Lenia implementation](https://github.com/Chakazul/Lenia)

## License

MIT
