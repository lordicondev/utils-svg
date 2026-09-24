import { describe, expect, it } from 'vitest';
import {
    EXAMPLE_PACKS,
    EXPECTED,
    PACKS,
    SERIALIZED,
    brokenLinks,
    exampleIcon,
    icon,
    layer,
    layersOf,
    pack,
} from './testing/fixtures.ts';
import { customizeSvg } from './customize.ts';
import { optimizeSvg } from './optimize.ts';
import { packSvg } from './pack.ts';
import { readPack } from './read.ts';

const data = exampleIcon('wired-outline-237-star-rating');
const star = layer('wired-outline-237-star-rating');
const select = layer('wired-outline-237-star-rating_morph-select');

describe('packSvg', () => {
    it.each(PACKS)('writes %s byte for byte as 1.2.0 did', (name) => {
        expect(packSvg(icon(name), layersOf(pack(name)))).toBe(EXPECTED.packs[name].pack);
    });

    it.each(Object.keys(EXAMPLE_PACKS))('packs the example layers of %s as 1.2.0 did', (name) => {
        const { icon: data, layers } = EXAMPLE_PACKS[name];
        const packed = packSvg(
            exampleIcon(data),
            layers.map(([file, options]) => ({ svg: layer(file), ...options })),
        );
        expect(packed).toBe(EXPECTED.examples[name]);
    });

    it('rebuilds most stored packs exactly from their layers', () => {
        const same = PACKS.filter(
            (name) => packSvg(icon(name), layersOf(pack(name))) === pack(name),
        );
        expect(same.length).toBeGreaterThanOrEqual(15);
    });

    it('shows the default state at regular stroke, and hides the other layers', () => {
        const packed = packSvg(data, [
            { svg: star },
            { svg: select, states: ['morph-select'] },
            { svg: star, stroke: 3 },
        ])!;
        const groups = packed.match(/<g[^>]*>/g)!;
        expect(groups[0]).toBe('<g>');
        expect(groups[1]).toBe('<g data-state="morph-select" style="display: none;">');
        expect(groups[2]).toBe('<g data-stroke="3" style="display: none;">');
        expect(readPack(packed)).toMatchObject({
            name: 'wired-outline-237-star-rating-morph',
            features: ['stroke-layers'],
            states: ['morph-select'],
            strokes: [2, 3],
        });
    });

    it('takes a single state for a list, and writes every state a layer serves', () => {
        const packed = packSvg(data, [
            { svg: star },
            { svg: select, states: 'morph-select' as unknown as string[] },
        ])!;
        expect(packed).toContain('data-state="morph-select"');
        expect(packSvg(data, [{ svg: select, states: ['nothing', 'morph-select'] }])).toContain(
            'data-state="nothing,morph-select"',
        );
    });

    it('leaves out a pack, a state the icon lacks, and what is not an SVG', () => {
        const packed = packSvg(data, [{ svg: star }])!;
        expect(packSvg(data, [{ svg: packed }])).toBeNull();
        expect(packSvg(data, [{ svg: star, states: ['nothing'] }])).toBeNull();
        expect(
            packSvg(data, [{ svg: '<p>no</p>' }, { svg: 'nope' }, { svg: '<svg/>' }]),
        ).toBeNull();
        expect(packSvg(data, [{ svg: 'nope' }, { svg: star }])).toBe(packed);
    });

    it('needs a default state for a layer without one', () => {
        const noDefault = {
            ...data,
            markers: data.markers!.map((m) => ({ ...m, cm: m.cm.replace('default:', '') })),
        };
        expect(packSvg(noDefault, [{ svg: star }])).toBeNull();
    });

    it("names an icon without a name 'unkown', as 1.x did", () => {
        expect(packSvg({ ...data, nm: '' } as never, [{ svg: star }])).toContain(
            'data-name="unkown"',
        );
    });

    it('merges the definitions of every layer at the end', () => {
        const { icon: data, layers } = EXAMPLE_PACKS['dpi-resolution with strokes'];
        const packed = packSvg(
            exampleIcon(data),
            layers.map(([file, o]) => ({ svg: layer(file), ...o })),
        )!;
        expect(packed.match(/<defs>/g)).toHaveLength(1);
        expect(packed.endsWith('</defs></svg>')).toBe(true);
    });

    it('gives a layer ids of its own when another layer gave them to something else', () => {
        // Two layers optimised apart, without a prefix: both call their mask `a`.
        const first = optimizeSvg(SERIALIZED);
        const second = optimizeSvg(SERIALIZED.replaceAll('M0 0h5v5H0z', 'M1 1h3v3H1z'));
        expect(first).toContain('id="a"');
        expect(second).toContain('id="a"');

        const packed = packSvg(data, [{ svg: first }, { svg: second, states: ['morph-select'] }])!;
        expect(brokenLinks(packed)).toEqual([]);
        expect(customizeSvg(packed, { state: 'morph-select' })).toContain('M1 1h3v3H1z');
        expect(customizeSvg(packed)).toContain('M0 0h5v5H0z');
    });
});
