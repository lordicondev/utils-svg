# Changelog

## 2.0.0

The pack format is unchanged: packs made with 1.x work with 2.0, and `packSvg` produces the
same bytes as 1.2.0 for the same layers. The library now uses `@lordicon/utils-lottie` 2,
fast-xml-parser 5 and SVGO 4. These are regular dependencies now, no longer bundled.

Checked against 1.2.0 on 459 recent Lordicon icons from every family and style (wired, doodle,
system): reading, packing, unpacking and every combination of state, stroke, colors and
background give the same result, apart from the fixes listed below.

### Breaking changes

| 1.x                                                                    | 2.0                                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `metaSvg(svg)`                                                         | `readPack(svg)`, or `isPack(svg)`                                                                       |
| `packSvg(data, [{ content, state, stroke }])`                          | `packSvg(lottie, [{ svg, states, stroke }])`                                                            |
| `unpackSvg(pack)` returns `{ content, state, stroke }`                 | returns `{ svg, states, stroke }`                                                                       |
| `stroke` is `undefined` for a regular layer                            | `stroke` is `2`                                                                                         |
| `features` is `['']` for a pack without features                       | `features` is `[]`                                                                                      |
| types `Layer`, `PackMetaData`, `IconProperties`, `ColorsMap`, `Stroke` | `PackLayer`, `PackInfo`, `CustomizeOptions`; `ColorMap` and `Stroke` come from `@lordicon/utils-lottie` |

- Ids in `customizeSvg` and `unpackSvg` output get a prefix computed from the content instead
  of a random one, so the same input always gives the same file.
- Class names are no longer prefixed (unless the SVG has a `<style>` element). In 1.x the
  prefix broke the color names in `class="primary"`.
- A layer passed with `states: []` is the default state. 1.x skipped it. `states` can also be
  a single string.

### Fixed

- `customizeSvg` drew the background on top of the icon when the pack had a gradient, mask or
  clip path, so the result was a plain rectangle. It is now always behind the icon.
- The background could disappear entirely for SVGs from the Lottie renderer (root styled
  `width: 100%`). It is now a rectangle sized to the view box.
- `stroke: 'light'` and `'bold'` showed nothing for icons with stroke layers. Only numbers
  worked.
- Some colors were not replaced: those inside an element that also had the color, and those
  written as a name (`white`). Masks are now left alone, since there color is transparency.
- An invalid color or background turned black. It is now ignored.
- Numeric attribute values such as `fill="0"` or `data-state="1"` threw an error.
- Links written as `ns1:href` (how a browser serializes the Lottie renderer's SVG) were not
  prefixed together with their ids, so masks drew nothing.
- `packSvg` merged layers that used the same id for different things (for example `a` from
  two separately optimized layers), and every layer used the first definition. Such a layer now
  gets its own ids.

### Added

- `isPack()`.
- `strokes` in `readPack()`: the stroke widths the pack has layers for.
- `optimizeSvg(svg, { prefixIds: 'my-prefix' })` for a custom id prefix.

### Removed

- `metaSvg`. Use `readPack`.
- The nanoid dependency.
- Bundled dependencies. The package went from 858 kB to 28 kB unpacked, and your app shares
  `@lordicon/utils-lottie`, fast-xml-parser and SVGO with it.
