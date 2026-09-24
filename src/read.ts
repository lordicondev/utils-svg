import { parseColors, type ColorMap } from '@lordicon/utils-lottie';
import { COLORS, DEFAULT_STROKE, FEATURES, NAME, STATE, STROKE } from './format.ts';
import { attributesOf, childrenOf, list, parseSvg, tagOf, text } from './xml.ts';

/** What a pack holds, from its attributes. */
export interface PackInfo {
    /** The icon's name, as in its Lottie file: `wired-outline-1-cloud`. */
    name: string;
    /** `stroke` when the stroke width scales, `stroke-layers` when it has a layer per width. */
    features: string[];
    /** The icon's own colours, by name: `{ primary: '#121331' }`. */
    colors: ColorMap;
    /** The states with layers of their own, besides the default one. */
    states: string[];
    /** The stroke widths it has layers for: `[2]`, or `[1, 2, 3]` with stroke layers. */
    strokes: (1 | 2 | 3)[];
}

/** What a pack holds, or null for an SVG that is not a pack (or not an SVG). */
export function readPack(svg: string): PackInfo | null {
    const root = parseSvg(svg);
    const attributes = root ? attributesOf(root) : {};
    const name = text(attributes[NAME]);
    if (!root || !name) return null;

    const states: string[] = [];
    const strokes = new Set<1 | 2 | 3>();

    for (const child of childrenOf(root)) {
        const layer = attributesOf(child);
        for (const state of list(layer[STATE])) if (!states.includes(state)) states.push(state);
        if (tagOf(child) === 'g') strokes.add(strokeOf(layer[STROKE]));
    }

    return {
        name,
        features: list(attributes[FEATURES]),
        colors: parseColors(text(attributes[COLORS]) ?? '') ?? {},
        states,
        strokes: [...strokes].sort(),
    };
}

/** True for a pack. */
export function isPack(svg: string): boolean {
    return readPack(svg) !== null;
}

/** A layer's stroke width: its `data-stroke`, regular without one. */
export function strokeOf(value: unknown): 1 | 2 | 3 {
    const stroke = Number(text(value) ?? DEFAULT_STROKE);
    return stroke === 1 || stroke === 3 ? stroke : DEFAULT_STROKE;
}
