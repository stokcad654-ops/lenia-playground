'use strict';

/* ── Lenia Presets ───────────────────────────────────────── */

const PRESETS = {

    /* ── Standard Lenia ──────────────────────────────────── */

    primordial: {
        name: 'Primordial Soup',
        desc: 'rich ecosystem',
        params: { R: 13, mu: 0.15, sigma: 0.017, dt: 0.1, kernelMu: 0.5, kernelSigma: 0.15, flowRate: 0 },
        init: 'random',
        density: 0.20,
        patchSize: 0.035,
    },

    smoothcells: {
        name: 'Smooth Cells',
        desc: 'cell division',
        params: { R: 20, mu: 0.30, sigma: 0.05, dt: 0.05, kernelMu: 0.5, kernelSigma: 0.15, flowRate: 0 },
        init: 'random',
        density: 0.35,
        patchSize: 0.05,
    },

    galaxy: {
        name: 'Galaxy',
        desc: 'large swirls',
        params: { R: 25, mu: 0.35, sigma: 0.06, dt: 0.03, kernelMu: 0.5, kernelSigma: 0.15, flowRate: 0 },
        init: 'random',
        density: 0.30,
        patchSize: 0.06,
    },

    /* ── Flow Lenia (mass redistribution via growth gradient) */

    coral: {
        name: 'Coral Reef',
        desc: 'flow \u2022 dense bubbles',
        params: { R: 17, mu: 0.22, sigma: 0.035, dt: 0.07, kernelMu: 0.5, kernelSigma: 0.15, flowRate: 10 },
        init: 'random',
        density: 0.30,
        patchSize: 0.045,
    },

    neural: {
        name: 'Neural',
        desc: 'flow \u2022 brain pathways',
        params: { R: 20, mu: 0.28, sigma: 0.045, dt: 0.05, kernelMu: 0.5, kernelSigma: 0.15, flowRate: 6 },
        init: 'random',
        density: 0.25,
        patchSize: 0.05,
    },

    turbulence: {
        name: 'Turbulence',
        desc: 'flow \u2022 rings & spirals',
        params: { R: 15, mu: 0.20, sigma: 0.03, dt: 0.08, kernelMu: 0.5, kernelSigma: 0.15, flowRate: 14 },
        init: 'random',
        density: 0.28,
        patchSize: 0.04,
    },
};

const COLORMAP_NAMES = ['Ocean', 'Ember', 'Toxic', 'Mono'];
const COLORMAP_CLASSES = ['cm-ocean', 'cm-ember', 'cm-toxic', 'cm-mono'];
