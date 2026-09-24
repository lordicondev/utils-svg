import { describe, expect, it } from 'vitest';
import { EXPECTED, PACKS, pack } from './testing/fixtures.ts';
import { isPack, readPack } from './read.ts';

describe('readPack', () => {
    it.each(PACKS)('reads %s as metaSvg() of 1.2.0 did', (name) => {
        const { name: title, features, colors, states } = readPack(pack(name))!;
        const expected = EXPECTED.packs[name].meta as { features: string[] };
        // 1.2.0 read `data-features=""` as ['']; it is [] now.
        expect({ name: title, features, colors, states }).toEqual({
            ...expected,
            features: expected.features.filter(Boolean),
        });
    });

    it('lists the stroke widths it has layers for', () => {
        expect(readPack(pack('wired-gradient-242-copy'))!.strokes).toEqual([1, 2, 3]);
        expect(readPack(pack('wired-outline-2162-subtract'))!.strokes).toEqual([2]);
    });

    it('reads a name with an entity and trims one with a space', () => {
        expect(readPack(pack('wired-lineal-1078-RnB-music'))!.name).toBe(
            "wired-lineal-1078-R'n'B-music",
        );
        expect(readPack(pack('wired-flat-1853-cutter'))!.name).toBe('wired-flat-1853-cutter');
    });

    it('is null for an SVG that is not a pack, and for what is not an SVG', () => {
        for (const value of ['<svg><g/></svg>', '<p data-name="x"/>', '', 'nope', null, 5]) {
            expect(readPack(value as string), String(value)).toBeNull();
            expect(isPack(value as string)).toBe(false);
        }
        expect(isPack(pack('wired-outline-2162-subtract'))).toBe(true);
    });

    it('reads numeric names and states as text', () => {
        const info = readPack(
            '<svg data-name="123" data-colors=""><g data-state="1"><path/></g></svg>',
        );
        expect(info).toEqual({
            name: '123',
            features: [],
            colors: {},
            states: ['1'],
            strokes: [2],
        });
    });
});
