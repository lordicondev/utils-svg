import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IconData } from '@lordicon/utils-lottie';
import type { PackLayer } from '../pack.ts';
import { ATTRIBUTES, attributesOf, build, childrenOf, list, parseSvg, tagOf } from '../xml.ts';

const FIXTURES = resolve(import.meta.dirname, '../../test/fixtures');
const ICONS = resolve(import.meta.dirname, '../../examples/icons');

/**
 * Real Lordicon packs, each with the Lottie file it was made from: every family, with
 * and without stroke layers, several states, gradients, masks, a filter, `&apos;` and a
 * name with a trailing space.
 */
export const PACKS = readdirSync(FIXTURES)
    .filter((file) => file.endsWith('.svg'))
    .map((file) => file.slice(0, -4));

export function pack(name: string): string {
    return readFileSync(`${FIXTURES}/${name}.svg`, 'utf8');
}

export function icon(name: string): IconData {
    return JSON.parse(readFileSync(`${FIXTURES}/${name}.json`, 'utf8'));
}

/** A layer file from examples/icons, as exported by a designer, and its Lottie file. */
export function layer(name: string): string {
    return readFileSync(`${ICONS}/${name}.svg`, 'utf8');
}

export function exampleIcon(name: string): IconData {
    return JSON.parse(readFileSync(`${ICONS}/${name}.json`, 'utf8'));
}

/**
 * What 1.2.0 gave for the fixtures: `metaSvg()` of each pack, and `packSvg()` of the layers
 * `layersOf()` takes out of it; the same for packs of the example layers.
 */
export const EXPECTED: {
    packs: Record<string, { meta: unknown; pack: string }>;
    examples: Record<string, string>;
} = JSON.parse(readFileSync(resolve(FIXTURES, '../expected.json'), 'utf8'));

/**
 * The layers a pack was made from, as they were before packing: the root's attributes, the
 * definitions, and one group's content. Unlike `unpackSvg()` it does not optimise them.
 */
export function layersOf(packed: string): PackLayer[] {
    const root = parseSvg(packed)!;
    const attributes = { ...attributesOf(root) };
    for (const key of ['@_data-name', '@_data-features', '@_data-colors']) delete attributes[key];
    const defs = childrenOf(root).flatMap((child) =>
        tagOf(child) === 'defs' ? childrenOf(child) : [],
    );

    return childrenOf(root)
        .filter((child) => tagOf(child) === 'g')
        .map((group) => {
            const states = list(attributesOf(group)['@_data-state']);
            const stroke = attributesOf(group)['@_data-stroke'] as 1 | 3 | undefined;
            const content = [...(defs.length ? [{ defs }] : []), ...childrenOf(group)];
            return {
                svg: build([{ svg: content, [ATTRIBUTES]: attributes }]),
                ...(states.length ? { states } : {}),
                ...(stroke ? { stroke } : {}),
            };
        });
}

/** The packs of the example layers, as the examples build them. */
export const EXAMPLE_PACKS: Record<
    string,
    { icon: string; layers: [string, Omit<PackLayer, 'svg'>][] }
> = {
    'outlet-type-f': {
        icon: 'wired-lineal-2795-outlet-type-f',
        layers: [
            ['wired-lineal-2795-outlet-type-f', {}],
            ['wired-lineal-2795-outlet-type-f_morph-single', { states: ['morph-single'] }],
        ],
    },
    'dpi-resolution with strokes': {
        icon: 'wired-gradient-2290-300-dpi-resolution',
        layers: [
            ['wired-gradient-2290-300-dpi-resolution', { stroke: 2 }],
            [
                'wired-gradient-2290-300-dpi-resolution_morph-detail',
                { stroke: 3, states: ['morph-detail', 'morph-detail-alt'] },
            ],
            [
                'wired-lineal-2795-outlet-type-f',
                { stroke: 2, states: ['morph-detail', 'morph-detail-alt'] },
            ],
            ['wired-lineal-2795-outlet-type-f_morph-single', { stroke: 3 }],
        ],
    },
    'star-rating': {
        icon: 'wired-outline-237-star-rating',
        layers: [
            ['wired-outline-237-star-rating', {}],
            ['wired-outline-237-star-rating_morph-select', { states: ['morph-select'] }],
        ],
    },
};

/**
 * What is wrong with the ids of an SVG: an id given twice to different things, and a link
 * (`url(#…)`, `href="#…"` with any prefix) to an id it does not have. Empty when nothing is.
 */
export function brokenLinks(svg: string): string[] {
    const definitions = new Map<string, Set<string>>();
    for (const match of svg.matchAll(/<([a-zA-Z]+)[^>]*\sid="([^"]+)"[^>]*>/g)) {
        definitions.set(match[2], (definitions.get(match[2]) ?? new Set()).add(match[0]));
    }
    const links = [...svg.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(
        (match) => match[1] ?? match[2],
    );
    return [
        ...[...definitions].filter(([, found]) => found.size > 1).map(([id]) => `twice: ${id}`),
        ...[...new Set(links)].filter((id) => !definitions.has(id)).map((id) => `missing: ${id}`),
    ];
}

/**
 * Frames drawn by the Lottie renderer (`@lordicon/renderer`) in Chrome, as its XMLSerializer
 * writes them: the renderer sets its links without a prefix, so the serializer makes one up
 * for each (`ns1:href`, `ns2:href`…). They hold masks that use those links.
 */
export const RENDERED = readdirSync(resolve(FIXTURES, '../rendered')).map((file) =>
    file.slice(0, -4),
);

export function rendered(name: string): string {
    return readFileSync(resolve(FIXTURES, `../rendered/${name}.svg`), 'utf8');
}

/** A small SVG written as the frames of `RENDERED` are. */
export const SERIALIZED =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" width="10" height="10" style="width:100%;height:100%"><defs><path id="__lottie_element_3" d="M0 0h5v5H0z"/><mask id="__lottie_element_4" mask-type="alpha"><use xmlns:ns1="http://www.w3.org/1999/xlink" ns1:href="#__lottie_element_3"/></mask><path id="__lottie_element_7" d="M5 5h5v5H5z"/><mask id="__lottie_element_8" mask-type="alpha"><use xmlns:ns3="http://www.w3.org/1999/xlink" ns3:href="#__lottie_element_7"/></mask></defs><g mask="url(#__lottie_element_4)"><path class="primary" fill="#121331" d="M0 0h10v10H0z"/></g><g mask="url(#__lottie_element_8)"><path class="secondary" fill="#08a88a" d="M0 0h10v10H0z"/></g></svg>';
