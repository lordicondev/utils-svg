import { describe, expect, it } from 'vitest';
import { RENDERED, SERIALIZED, brokenLinks, rendered } from './testing/fixtures.ts';
import { idPrefix, optimizeSvg, prefixSvgIds } from './optimize.ts';

const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><clipPath id="clip"><path d="M0 0h10v10H0z"/></clipPath></defs><g clip-path="url(#clip)"><path d="M1.123456 1H5" stroke="#121331" stroke-width="1.123456"/></g><g style="display: none;"><path d="M2 2H4"/></g></svg>';

describe('optimizeSvg', () => {
    it('keeps hidden layers and the view box, and numbers to 4 decimals', () => {
        const out = optimizeSvg(svg);
        expect(out).toContain('d="M2 2h2" style="display:none"');
        expect(out).toContain('viewBox="0 0 10 10"');
        expect(out).toContain('stroke-width="1.1235"');
    });

    it('prefixes ids from the content, the same each time', () => {
        const out = optimizeSvg(svg, { prefixIds: true });
        const prefix = idPrefix(optimizeSvg(svg));
        expect(out).toMatch(new RegExp(`id="${prefix}[a-z]+"`));
        expect(out).toMatch(new RegExp(`url\\(#${prefix}[a-z]+\\)`));
        expect(optimizeSvg(svg, { prefixIds: true })).toBe(out);
        expect(optimizeSvg(svg, { prefixIds: 'my-' })).toMatch(/id="my-[a-z]+"/);
        expect(optimizeSvg(svg)).not.toContain(prefix);
    });

    it('gives the same ids to SVGs that draw the same, whatever ids they came with', () => {
        const renamed = svg
            .replace('id="clip"', 'id="__lottie_element_42"')
            .replace('url(#clip)', 'url(#__lottie_element_42)');
        expect(optimizeSvg(renamed, { prefixIds: true })).toBe(
            optimizeSvg(svg, { prefixIds: true }),
        );
    });
});

describe('links written by a browser', () => {
    it('follows a link whatever prefix it has for xlink, and writes it as xlink:href', () => {
        for (const prefixIds of [false, true, 'my-']) {
            const out = optimizeSvg(SERIALIZED, { prefixIds });
            expect(brokenLinks(out), String(prefixIds)).toEqual([]);
            expect(out).not.toMatch(/ns\d/);
            expect(out.match(/xlink:href="#/g)).toHaveLength(2);
            expect(out).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
    });

    it.each(RENDERED)('keeps every link of %s, as drawn by the Lottie renderer', (name) => {
        const svg = rendered(name);
        const links = svg.match(/ns\d+:href="#/g)!;
        expect(links.length).toBeGreaterThan(1);
        for (const prefixIds of [false, true]) {
            const out = optimizeSvg(svg, { prefixIds });
            expect(brokenLinks(out), String(prefixIds)).toEqual([]);
            expect(out).not.toMatch(/ns\d+:/);
            expect(out.match(/xlink:href="#/g)).toHaveLength(links.length);
        }
    });

    it('leaves a prefix bound to another namespace alone', () => {
        const other = SERIALIZED.replace(
            'xmlns:ns1="http://www.w3.org/1999/xlink"',
            'xmlns:ns1="https://example.com/ns"',
        );
        expect(optimizeSvg(other)).toContain('ns1:href');
    });

    it('follows a prefix only where it is bound to xlink', () => {
        const nested =
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><defs><path id="p" d="M0 0h5v5H0z"/></defs><g xmlns:ns1="http://www.w3.org/1999/xlink"><use ns1:href="#p"/><g xmlns:ns1="https://example.com/ns"><use ns1:href="#p" x="5"/></g></g></svg>';
        const out = optimizeSvg(nested);
        expect(out.match(/xlink:href="#/g)).toHaveLength(1);
        expect(out.match(/ns1:href="#/g)).toHaveLength(1);
    });
});

describe('prefixSvgIds', () => {
    it('keeps class names, the names of the colours', () => {
        const out = optimizeSvg(SERIALIZED, { prefixIds: true });
        expect(out).toContain('class="primary"');
        expect(out).toContain('class="secondary"');
    });

    it('prefixes class names when a stylesheet in the SVG could use them', () => {
        const styled = SERIALIZED.replace('<defs>', '<style>.primary{opacity:.5}</style><defs>');
        const out = prefixSvgIds(styled, 'p-');
        expect(out).toContain('class="p-primary"');
        expect(out).toContain('.p-primary{');
        expect(brokenLinks(out)).toEqual([]);
    });
});

describe('idPrefix', () => {
    it('starts with a letter, and differs for other content', () => {
        expect(idPrefix('a')).toMatch(/^i[0-9a-z]+$/);
        expect(idPrefix('a')).toBe(idPrefix('a'));
        expect(idPrefix('a')).not.toBe(idPrefix('b'));
    });
});
