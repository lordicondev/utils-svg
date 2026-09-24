import { describe, expect, it } from 'vitest';
import { PACKS, brokenLinks, icon, pack } from './testing/fixtures.ts';
import { packSvg } from './pack.ts';
import { readPack } from './read.ts';
import { unpackSvg } from './unpack.ts';
import { attributesOf, childrenOf, list, parseSvg, tagOf } from './xml.ts';

/** The layer groups of a pack: their states and stroke. */
function groups(packed: string) {
    return childrenOf(parseSvg(packed)!)
        .filter((child) => tagOf(child) === 'g')
        .map((group) => ({
            states: list(attributesOf(group)['@_data-state']),
            stroke: Number(attributesOf(group)['@_data-stroke'] ?? 2),
        }));
}

describe('unpackSvg', () => {
    it.each(PACKS)('gives the layers of %s back, which pack into the same pack', (name) => {
        const layers = unpackSvg(pack(name));
        expect(layers.map(({ states, stroke }) => ({ states, stroke }))).toEqual(
            groups(pack(name)),
        );

        for (const layer of layers) {
            expect(layer.svg).toMatch(/^<svg/);
            expect(layer.svg).not.toContain('data-');
            expect(brokenLinks(layer.svg)).toEqual([]);
        }
        // One old icon's file has lost its markers: it packs nothing, as with 1.2.0.
        if (icon(name).markers?.length) {
            expect(readPack(packSvg(icon(name), layers)!)).toEqual(readPack(pack(name)));
        }
    });

    it('keeps the definitions a layer uses, with ids of its own', () => {
        const [layer] = unpackSvg(pack('wired-gradient-242-copy'));
        const ids = [...layer.svg.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
        const references = [...layer.svg.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
        expect(ids.length).toBeGreaterThan(0);
        for (const reference of references) expect(ids).toContain(reference);
        for (const id of ids) expect(id).toMatch(/^[a-z]/);
    });

    it('is empty for an SVG that is not a pack', () => {
        expect(unpackSvg('<svg><g/></svg>')).toEqual([]);
        expect(unpackSvg('nope')).toEqual([]);
    });
});
