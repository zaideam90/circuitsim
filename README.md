# Control Circuit Simulator

Browser-based electrical control-circuit simulator (EKTS-style) for teaching: single- and three-phase control/power circuits, VFD, soft starter, ATS, PLC block, DC control, protections, measurement tools and a fault-finding exercise mode. No build step, no dependencies.

## Files

```
index.html          shell: layout only, loads css + js
css/style.css       all styling
js/core.js          canvas handles, colour table, shared constants
js/i18n.js          EN/AR dictionaries + T(key, ...args)
js/catalog.js       TYPES (every component), PALETTE groups
js/state.js         doc model {comps, wires}, editor & sim state, defaults(), addComp/addWire, terminals(), bbox()
js/engine.js        solver + physics-ish rules: solveOnce, evaluateLoads, simulate, currentThrough,
                    handleShort, vfdUpdate, ssUpdate, atsUpdate, plcUpdate, log
js/render.js        draw(), drawComp(), meters, PNG/PDF rendering
js/editor.js        undo/redo, clipboard, hit-testing, wire routing/relaxing, mouse & keyboard
js/ui.js            palette, properties, run panel, run loop, exercise mode, header buttons, file open/save, language
js/examples.js      example circuits + start-up
manifest.json, sw.js, icon.svg   PWA (installable, works offline)
```

Scripts are classic (non-module) so the app also works when opened as a local `file://`. They share top-level declarations; keep the load order in `index.html`.

## Data model

* `doc.comps[]` – `{id, type, x, y, rot, label, ...defaults(type)}`; grid unit = 20 px (`G`).
* `doc.wires[]` – `{id, ax, ay, bx, by, cut, hidden, w, color, bus}` – always horizontal or vertical.
* Connectivity: union-find over grid points. A wire connects every *node point* (wire end or component terminal) lying on it. Crossing wires without a node do **not** connect.
* Sources are named potentials (`L1 L2 L3 N PE`, generator `L1b…Nb`, `DC+@id`, drive outputs `U@id…`). A set holding ≥2 different sources is a short circuit (except N–PE bonding).
* Loads are evaluated by the voltage between their two potentials vs. their rating: `on / weak / over / back / off / burnt`; 3‑phase motors: `on / loss / star / delta`.

## Adding a component

1. `catalog.js` – add an entry to `TYPES`: `{en, ar, kind, prefix, terms:[[dx,dy]...], pairs:[[a,b]...], icon, num}`.
   * `kind`: `source | contact | load | load3 | load6 | vfd | sensor | plc | meter | note`.
   * `pairs` = terminal index pairs that are joined when `pairClosed(c, i)` is true.
2. `state.js` – add default properties in `defaults()` if needed.
3. `engine.js` – add a `case` in `pairClosed()` and, for active devices, an `xxxUpdate(c, r, dt)` called from `simulate()`.
4. `render.js` – add a drawing branch in `drawComp()` (draw in local coords; terminals are at `terms * G`; use `upright()` for text).
5. `ui.js` – add property fields in `renderProps()`, and `runClick()` behaviour if it is operated by clicking.
6. `i18n.js` – add strings for both languages.

## Deploy

Upload the whole folder to a GitHub repository and enable GitHub Pages (Settings → Pages → main / root). The site URL then serves `index.html`; users can install it as an app from the browser.
