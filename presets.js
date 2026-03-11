'use strict';

/* ── Lenia Presets ───────────────────────────────────────── */

const PRESETS = {

    primordial: {
        name: 'Primordial Soup',
        desc: 'rich ecosystem',
        params: { R: 13, mu: 0.15, sigma: 0.017, dt: 0.1, kernelMu: 0.5, kernelSigma: 0.15 },
        init: 'random',
        density: 0.20,
        patchSize: 0.035,
    },

    orbium: {
        name: 'Orbium',
        desc: 'sparse gliders',
        params: { R: 13, mu: 0.15, sigma: 0.017, dt: 0.1, kernelMu: 0.5, kernelSigma: 0.15 },
        init: 'random',
        density: 0.10,
        patchSize: 0.03,
    },

    smoothcells: {
        name: 'Smooth Cells',
        desc: 'cell division',
        params: { R: 20, mu: 0.30, sigma: 0.05, dt: 0.05, kernelMu: 0.5, kernelSigma: 0.15 },
        init: 'random',
        density: 0.35,
        patchSize: 0.05,
    },

    worms: {
        name: 'Worms',
        desc: 'crawling shapes',
        params: { R: 15, mu: 0.19, sigma: 0.024, dt: 0.06, kernelMu: 0.5, kernelSigma: 0.15 },
        init: 'random',
        density: 0.22,
        patchSize: 0.04,
    },

    oscillators: {
        name: 'Oscillators',
        desc: 'pulsating blobs',
        params: { R: 10, mu: 0.22, sigma: 0.035, dt: 0.08, kernelMu: 0.5, kernelSigma: 0.15 },
        init: 'random',
        density: 0.18,
        patchSize: 0.025,
    },

    galaxy: {
        name: 'Galaxy',
        desc: 'large swirls',
        params: { R: 25, mu: 0.35, sigma: 0.06, dt: 0.03, kernelMu: 0.5, kernelSigma: 0.15 },
        init: 'random',
        density: 0.30,
        patchSize: 0.06,
    },
};

const COLORMAP_NAMES = ['Ocean', 'Ember', 'Toxic', 'Mono'];
const COLORMAP_CLASSES = ['cm-ocean', 'cm-ember', 'cm-toxic', 'cm-mono'];
