# Pixabots attribution

- Upstream: https://github.com/pablostanley/pixabots
- Pinned revision: `b384de38a1ac34bdde443e375bb1782841507a75`
- License: MIT License, Copyright (c) 2026 Pablo Stanley; exact upstream license is retained as `LICENSE`.
- Selected contract: one Agent Halo Pet identity, `halo-bot`, with all 10,752 combinations from the pinned append-only catalog; default loadout `3051`.
- Construction: browser-layered composition using exact copied Pixabots top → body → heads → eyes PNG parts, source-sheet frame selection, and deterministic CSS presentation motion.
- No-imagegen truth: no image-generation source or service was used. No smoothing, recoloring, gradients, or flattened face painting was used.
- Reproduction: all 43 source layer sheets are retained under `assets/parts/` and hash-bound by `copied-parts-manifest.json`. Runtime promotion copies the exact files under `public/.../halo-bot/parts/`; the roster manifest hash-binds that public catalog.
- Historical builder: `build_pixabot_motion.py` preserves the earlier ten-loadout strip experiment for provenance only. It is not the current runtime builder or current catalog owner.
- Signal boundary: Signal V4 remains a separate shared runtime layer and is not baked into the Pixabots body layers.
