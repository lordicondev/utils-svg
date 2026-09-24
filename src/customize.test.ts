import { describe, expect, it } from 'vitest';
import { PACKS, brokenLinks, exampleIcon, layer, pack } from './testing/fixtures.ts';
import { customizeSvg } from './customize.ts';
import { packSvg } from './pack.ts';
import { readPack } from './read.ts';
import { unpackSvg } from './unpack.ts';

/** What an SVG draws: its path data, sorted. */
const drawn = (svg: string) => [...svg.matchAll(/ d="([^"]+)"/g)].map((match) => match[1]).sort();

/** The stroke widths of an SVG, in order. */
const widths = (svg: string) =>
    [...svg.matchAll(/stroke-width="([\d.]+)"/g)].map((match) => Number(match[1]));

const strokeLayers = 'wired-gradient-242-copy';
const scaling = 'wired-outline-2162-subtract';
const withDefs = 'wired-gradient-51-minus-rotation';
const twoColors = 'wired-lineal-115-blackboard-clean';
const fixed = 'system-solid-370-scan';

describe('customizeSvg', () => {
    it.each(PACKS)('cuts every state of %s, at every stroke, as its layer', (name) => {
        const info = readPack(pack(name))!;
        const layers = unpackSvg(pack(name));
        for (const state of [undefined, ...info.states]) {
            for (const stroke of info.strokes) {
                const layer = layers.find(
                    (candidate) =>
                        candidate.stroke === stroke &&
                        (state ? candidate.states.includes(state) : !candidate.states.length),
                );
                if (!layer) continue;
                expect(
                    drawn(customizeSvg(pack(name), { state, stroke })!),
                    `${state} ${stroke}`,
                ).toEqual(drawn(layer.svg));
            }
        }
    });

    it('drops the pack attributes', () => {
        for (const name of PACKS)
            expect(customizeSvg(pack(name))).not.toMatch(/data-|display: ?none/);
    });

    it('takes the default state for one the pack does not have', () => {
        expect(customizeSvg(pack(strokeLayers), { state: 'nothing' })).toBe(
            customizeSvg(pack(strokeLayers)),
        );
    });

    it('picks the layer of a stroke width, by number or by name', () => {
        const layers = unpackSvg(pack(strokeLayers));
        for (const [stroke, name] of [
            [1, 'light'],
            [3, 'bold'],
        ] as const) {
            const layer = layers.find((c) => c.stroke === stroke && !c.states.length)!;
            expect(drawn(customizeSvg(pack(strokeLayers), { stroke })!)).toEqual(drawn(layer.svg));
            expect(customizeSvg(pack(strokeLayers), { stroke: name })).toBe(
                customizeSvg(pack(strokeLayers), { stroke }),
            );
        }
    });

    it('takes a width written as text, and 0 as none, as 1.x did', () => {
        for (const name of [strokeLayers, scaling]) {
            expect(customizeSvg(pack(name), { stroke: '3' as never }), name).toBe(
                customizeSvg(pack(name), { stroke: 3 }),
            );
            expect(customizeSvg(pack(name), { stroke: 0 as never }), name).toBe(
                customizeSvg(pack(name)),
            );
        }
    });

    it('leaves the stroke of an icon without a stroke feature alone', () => {
        expect(readPack(pack(fixed))!.features).toEqual([]);
        for (const stroke of [1, 3, 'light', 'bold'] as const) {
            expect(customizeSvg(pack(fixed), { stroke })).toBe(customizeSvg(pack(fixed)));
        }
    });

    it('scales stroke widths when the stroke scales', () => {
        const regular = widths(customizeSvg(pack(scaling))!);
        expect(regular.length).toBeGreaterThan(0);
        expect(widths(customizeSvg(pack(scaling), { stroke: 'bold' })!)).toEqual(
            regular.map((width) => width * 1.5),
        );
        expect(widths(customizeSvg(pack(scaling), { stroke: 1 })!)).toEqual(
            regular.map((width) => width * 0.5),
        );
        expect(customizeSvg(pack(scaling), { stroke: 'regular' })).toBe(
            customizeSvg(pack(scaling)),
        );
    });

    it("replaces the icon's colours by name", () => {
        const { colors } = readPack(pack(twoColors))!;
        const svg = customizeSvg(pack(twoColors), {
            colors: { primary: '#ff0000', nope: 'blue' },
        })!;
        expect(svg).toMatch(/"(red|#f00)"/);
        expect(svg).not.toContain(`"${colors.primary}"`);
        expect(svg).toContain(`"${colors.secondary}"`);
    });

    it('leaves the colours of a pack without data-colors alone', () => {
        const packed = '<svg data-name="x"><g><path fill="#121331" d="M0 0h9v9H0z"/></g></svg>';
        expect(customizeSvg(packed, { colors: { primary: 'red' } })).toBe(customizeSvg(packed));
    });

    it('takes only the colours given, not what an object inherits', () => {
        const packed =
            '<svg data-name="x" data-colors="constructor:#121331"><g><path fill="#121331" d="M0 0h9v9H0z"/></g></svg>';
        expect(customizeSvg(packed, { colors: {} })).toBe(customizeSvg(packed));
        expect(customizeSvg(packed, { colors: { constructor: 'red' } as never })).toContain(
            'fill="red"',
        );
    });

    it('keeps a colour it cannot read, where 1.x drew black', () => {
        expect(customizeSvg(pack(scaling), { colors: { primary: 'nope' } })).toBe(
            customizeSvg(pack(scaling)),
        );
    });

    it('draws the background behind the icon, also when the definitions come last', () => {
        for (const name of [withDefs, scaling]) {
            const svg = customizeSvg(pack(name), { background: 'tomato' })!;
            const drawn = svg.replace(/<defs>.*?<\/defs>/s, '').replace(/^<svg[^>]*>/, '');
            expect(drawn, name).toMatch(/^<path fill="tomato" d="M0 0h430v430H0z"\/>/);
        }
        expect(customizeSvg(pack(scaling), { background: 'nope' })).toBe(
            customizeSvg(pack(scaling)),
        );
    });

    it('keeps the background of a pack whose root is styled to fill its box', () => {
        // As the Lottie renderer styles its SVGs: SVGO drops `width="100%"` from a rectangle
        // under such a root.
        const styled = layer('wired-outline-237-star-rating').replace(
            '<svg ',
            '<svg style="width:100%;height:100%" ',
        );
        const packed = packSvg(exampleIcon('wired-outline-237-star-rating'), [{ svg: styled }])!;
        expect(customizeSvg(packed, { background: 'tomato' })).toContain(
            '<path fill="tomato" d="M0 0h430v430H0z"/>',
        );
    });

    it.each(PACKS)('gives %s links that all find their definitions', (name) => {
        const info = readPack(pack(name))!;
        for (const state of [undefined, ...info.states]) {
            for (const stroke of [undefined, 1, 3] as const) {
                const svg = customizeSvg(pack(name), { state, stroke, background: 'white' })!;
                expect(brokenLinks(svg), `${state} ${stroke}`).toEqual([]);
            }
        }
    });

    it('gives the same file for the same options, with ids of its own', () => {
        const first = customizeSvg(pack(withDefs), { colors: { primary: 'red' } })!;
        expect(customizeSvg(pack(withDefs), { colors: { primary: 'red' } })).toBe(first);

        const prefix = (svg: string) => /id="([a-z0-9]+?)[a-z]"/.exec(svg)?.[1];
        expect(prefix(first)).toMatch(/^i/);
        expect(prefix(customizeSvg(pack(strokeLayers))!)).not.toBe(prefix(first));
    });

    it('recolours inside a recoloured element, and colours written as names', () => {
        const packed =
            '<svg data-name="x" data-colors="primary:#17171c,secondary:#ffffff"><g><g stroke="#17171C"><path fill="#17171C" d="M0 0h9v9H0z"/><path fill="white" d="M1 1h2v2H1z"/></g></g></svg>';
        const svg = customizeSvg(packed, { colors: { primary: 'red', secondary: 'blue' } })!;
        expect(svg).not.toMatch(/#17171c|white|#fff\b/i);
        expect(svg.match(/red/g)).toHaveLength(2);
        expect(svg).toMatch(/blue|#00f\b/);
    });

    it('leaves masks alone: there a colour is transparency', () => {
        const packed =
            '<svg data-name="x" data-colors="primary:#121331,secondary:#ffffff"><g><mask id="m"><path fill="white" d="M0 0h9v9H0z"/><path fill="#121331" d="M1 1h2v2H1z"/></mask><path mask="url(#m)" fill="#121331" d="M0 0h9v9H0z"/></g></svg>';
        const svg = customizeSvg(packed, { colors: { primary: 'red', secondary: 'blue' } })!;
        const mask = /<mask.*?<\/mask>/.exec(svg)![0];
        expect(mask).not.toMatch(/red|blue|#f00|#00f/);
        expect(svg.replace(mask, '')).toContain('fill="red"');
    });

    it('does not throw on numeric attributes', () => {
        const packed =
            '<svg data-name="x" data-colors="primary:#000000"><g><path fill="0" stroke="#000000" stroke-width="2"/></g></svg>';
        expect(customizeSvg(packed, { colors: { primary: 'red' } })).toContain('stroke="red"');
    });

    it('is null for an SVG that is not a pack', () => {
        expect(customizeSvg('<svg><g/></svg>')).toBeNull();
        expect(customizeSvg('nope')).toBeNull();
    });

    it('stays as it is', () => {
        expect(
            customizeSvg(pack(strokeLayers), {
                state: readPack(pack(strokeLayers))!.states[0],
                stroke: 3,
                colors: { primary: '#08a88a' },
                background: 'white',
            }),
        ).toMatchSnapshot();
        expect(
            customizeSvg(pack(scaling), { stroke: 'light', colors: { secondary: 'gold' } }),
        ).toMatchSnapshot();
    });
});
