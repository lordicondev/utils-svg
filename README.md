# SVG Utilities

Tools for Lordicon SVG packs. A pack is a single SVG file that holds every state and stroke
width of an icon. This library reads packs, cuts a single SVG out of one (in the state, stroke
width and colors you want), and builds new packs. It works in the browser and in Node.

```bash
npm install @lordicon/utils-svg
```

## Quick start

Take a pack downloaded from Lordicon and get a plain SVG for one state, bold, in your colors:

```js
import { customizeSvg, readPack } from '@lordicon/utils-svg';

readPack(pack);
// {
//     name: 'wired-gradient-242-copy',
//     features: ['stroke-layers'],
//     colors: { primary: '#4be1ec', secondary: '#cb5eee' },
//     states: ['morph-slide'],
//     strokes: [1, 2, 3],
// }

const svg = customizeSvg(pack, {
    state: 'morph-slide',
    stroke: 'bold',
    colors: { primary: '#e83a30' },
    background: '#ffffff',
});
```

## API

### `customizeSvg(pack, options?)`

Returns one SVG cut out of a pack, optimized with SVGO. Returns `null` if `pack` is not a pack.

| Option       | Example                  | What it does                                                                                                     |
| ------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `state`      | `'morph-slide'`          | The state to show. A state the pack doesn't have falls back to the default one.                                  |
| `stroke`     | `'bold'` or `3`          | `1`/`'light'`, `2`/`'regular'` or `3`/`'bold'`. Ignored for icons without a stroke setting.                      |
| `colors`     | `{ primary: '#e83a30' }` | New colors by name. Any CSS color name or hex value. Names the icon doesn't have and invalid colors are skipped. |
| `background` | `'#ffffff'`              | Fills the whole image behind the icon. Transparent if not given.                                                 |

Stroke works in one of two ways, depending on the icon:

- icons with `stroke-layers` have a separately drawn layer for each width, and you get that layer;
- icons with `stroke` have one drawing, and every `stroke-width` is scaled: ×0.5 for light,
  ×1.5 for bold.

A color is replaced everywhere the icon uses it, whether it is written as `#FFFFFF`, `#fff`
or `white`. Masks are left alone, because there a color means transparency.

Ids in the output get a prefix computed from the content, so several SVGs can sit on one page
without clashing. The same pack and options always give the same file.

### `readPack(svg)` and `isPack(svg)`

`readPack` tells you what a pack contains (see the quick start above), or returns `null` if
the SVG is not a pack. `states` lists the states besides the default one. `strokes` lists the
widths the pack has layers for: `[2]` for most icons, `[1, 2, 3]` for icons with stroke layers.

`isPack` returns `true` or `false`.

### `unpackSvg(pack)`

Splits a pack into its layers. Each layer is a standalone, optimized SVG with the states it
shows and its stroke width:

```js
unpackSvg(pack);
// [
//     { svg: '<svg…', states: [], stroke: 1 },
//     { svg: '<svg…', states: [], stroke: 2 },
//     { svg: '<svg…', states: [], stroke: 3 },
//     { svg: '<svg…', states: ['morph-slide'], stroke: 1 },
//     …
// ]
```

`states: []` is the default state. Returns an empty array if the SVG is not a pack. The layers
can be passed straight back to `packSvg`.

### `packSvg(lottie, layers)`

Builds a pack from SVG layers exported from a design tool. `lottie` is the icon's Lottie JSON.
From it the pack takes the icon's name, colors, stroke setting and the list of valid states.

```js
packSvg(lottie, [
    { svg: regular }, // default state, regular stroke
    { svg: open, states: ['morph-open'] }, // another state
    { svg: both, states: ['morph-a', 'hover-a'] }, // one drawing used by two states
    { svg: bold, stroke: 3 }, // default state, bold stroke
]);
```

A layer is skipped if it is already a pack, isn't an SVG, or names only states the icon
doesn't have. Returns `null` if no layer is left.

If a layer uses an id that an earlier layer used for something else, the layer's ids get a
prefix so the two don't clash. Otherwise the output is byte for byte what 1.x produced.

### `optimizeSvg(svg, options?)`

Runs SVGO with the settings packs use: hidden elements are kept and numbers are rounded to
4 decimals.

```js
optimizeSvg(svg);
optimizeSvg(svg, { prefixIds: true }); // prefix ids with a hash of the content
optimizeSvg(svg, { prefixIds: 'icon-' }); // prefix ids with your own string
```

Class names are not prefixed, because they carry the names of the icon's colors
(`class="primary"`). The exception is an SVG with a `<style>` element, where classes get the
prefix too.

Links written by a browser as `ns1:href` (this happens when the Lottie SVG renderer's output
is serialized) are rewritten as `xlink:href`.

## Pack format

A pack is a regular SVG. Opened as it is, it shows the default state at regular stroke.

```xml
<svg viewBox="0 0 430 430" data-name="wired-gradient-242-copy" data-features="stroke-layers" data-colors="primary:#4be1ec,secondary:#cb5eee">
    <g>…</g>
    <g data-state="morph-slide" style="display: none;">…</g>
    <g data-stroke="3" style="display: none;">…</g>
    <defs>…</defs>
</svg>
```

| Attribute       | On      | Value                                                                           |
| --------------- | ------- | ------------------------------------------------------------------------------- |
| `data-name`     | `<svg>` | The icon's name. Its presence is what makes an SVG a pack.                      |
| `data-features` | `<svg>` | `stroke` if widths are scaled, `stroke-layers` if there is a layer per width.   |
| `data-colors`   | `<svg>` | The icon's colors, as `name:#rrggbb` separated by commas.                       |
| `data-state`    | `<g>`   | The states the layer shows, separated by commas. Missing for the default state. |
| `data-stroke`   | `<g>`   | The layer's width, `1` or `3`. Missing for regular (`2`).                       |

Each top-level `<g>` is a layer. All layers except the default one at regular stroke have
`display: none`. The definitions of all layers are merged into one `<defs>` at the end.

## Upgrading from 1.x

Existing packs work as before, and `packSvg` produces the same files. The API changed:
`metaSvg` is now `readPack`, and layers are `{ svg, states, stroke }` instead of
`{ content, state, stroke }`. See the [CHANGELOG](CHANGELOG.md) for the full list.

## Development

```bash
npm install
npm start        # examples at http://localhost:8080
npm test         # tests
npm run check    # types, lint and formatting
npm run build    # builds dist/
```

The tests run on 21 real Lordicon packs with their Lottie files, and compare the output with
what 1.2.0 produced for them. `test/rendered/` holds frames drawn by the Lottie renderer in
Chrome, with the `ns1:href` links a browser writes.
