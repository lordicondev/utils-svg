import { parseStroke, resolveColor, type IconProperties } from '@lordicon/utils-lottie';
import {
    COLORS,
    DEFAULT_STROKE,
    FEATURE_STROKE,
    FEATURE_STROKE_LAYERS,
    FEATURES,
    NAME,
    STATE,
    STROKE,
} from './format.ts';
import { optimizeSvg } from './optimize.ts';
import { readPack, strokeOf } from './read.ts';
import {
    ATTRIBUTES,
    attributesOf,
    build,
    childrenOf,
    list,
    parseSvg,
    tagOf,
    text,
    type Attributes,
    type XmlNode,
} from './xml.ts';

/** How to cut an icon out of a pack. */
export interface CustomizeOptions extends IconProperties {
    /** A colour under the icon: a rectangle filling the whole image. Transparent without one. */
    background?: string;
}

/** What a light or bold stroke does to the regular width, when the stroke scales. */
const STROKE_SCALE = { 1: 0.5, 2: 1, 3: 1.5 };

/** The attributes that hold a colour of the icon. */
const COLOR_ATTRIBUTES = ['@_stroke', '@_fill', '@_stop-color'];

/**
 * The SVG of one state of a pack, at one stroke width, in other colours, optimised and with
 * ids of its own:
 *
 * - `state`: its layer, or the default one for a state the pack does not have;
 * - `stroke`: the layer of that width when the pack has stroke layers, otherwise the stroke
 *   widths scaled (×0.5 light, ×1.5 bold);
 * - `colors`: by name, each replacing the icon's own colour of that name wherever it is, but
 *   in masks;
 * - `background`: a rectangle behind the icon.
 *
 * Null for an SVG that is not a pack.
 */
export function customizeSvg(pack: string, options: CustomizeOptions = {}): string | null {
    const info = readPack(pack);
    const root = info ? parseSvg(pack) : null;
    if (!info || !root) return null;

    const stroke = options.stroke === undefined ? null : strokeWidth(options.stroke);
    const state = options.state && info.states.includes(options.state) ? options.state : null;
    const strokeLayers =
        info.features.includes(FEATURE_STROKE_LAYERS) &&
        childrenOf(root).some(
            (child) =>
                tagOf(child) === 'g' && strokeOf(attributesOf(child)[STROKE]) !== DEFAULT_STROKE,
        );

    // The layer to show; the others go, and so do the layer's own attributes.
    const children = childrenOf(root)
        .filter((child) => {
            if (tagOf(child) !== 'g') return true;
            const layer = attributesOf(child);
            const states = list(layer[STATE]);
            if (state ? !states.includes(state) : states.length) return false;
            return !strokeLayers || strokeOf(layer[STROKE]) === (stroke ?? DEFAULT_STROKE);
        })
        .map((child) => ({ [tagOf(child)]: child[tagOf(child)] }) as XmlNode);
    root[tagOf(root)] = children;

    if (options.colors && Object.keys(info.colors).length) {
        recolor(root, info.colors, options.colors);
    }

    if (stroke && info.features.includes(FEATURE_STROKE) && STROKE_SCALE[stroke] !== 1) {
        for (const attributes of find(root, (attributes) => '@_stroke-width' in attributes)) {
            const width = parseFloat(text(attributes['@_stroke-width']) ?? '');
            if (Number.isFinite(width)) attributes['@_stroke-width'] = width * STROKE_SCALE[stroke];
        }
    }

    const background = options.background ? resolveColor(options.background) : null;
    if (background) {
        // Behind the icon: before the first thing drawn, after definitions that come first.
        const rect = {
            rect: [],
            [ATTRIBUTES]: { ...viewBoxArea(attributesOf(root)), '@_fill': background },
        };
        const first = children.findIndex((child) => tagOf(child) !== 'defs');
        children.splice(first === -1 ? children.length : first, 0, rect);
    }

    const attributes = attributesOf(root);
    delete attributes[NAME];
    delete attributes[FEATURES];
    delete attributes[COLORS];

    return optimizeSvg(build([root]), { prefixIds: true });
}

/**
 * The view box as the attributes of a rectangle, in its own units: SVGO drops
 * `width="100%"` from a rectangle when the root is styled `width: 100%`, as SVGs from the
 * Lottie renderer are. 100% for a root without a view box.
 */
function viewBoxArea(root: Attributes): Attributes {
    const [x, y, width, height] = (text(root['@_viewBox']) ?? '').split(/[\s,]+/).map(Number);
    if (!(width > 0 && height > 0)) return { '@_width': '100%', '@_height': '100%' };
    return { '@_x': x || 0, '@_y': y || 0, '@_width': width, '@_height': height };
}

/** A stroke width from a number (clamped to 1–3) or a name. 0 is none, as in 1.x. */
function strokeWidth(value: unknown): 1 | 2 | 3 | null {
    if (typeof value === 'number') {
        return value && Number.isFinite(value)
            ? (Math.min(3, Math.max(1, Math.round(value))) as 1 | 2 | 3)
            : null;
    }
    return typeof value === 'string' ? parseStroke(value) : null;
}

/**
 * Replaces the pack's colours: every colour attribute that is one of `own`, written as hex or
 * as a name (`white`), takes the colour given for its name. Two names of the same colour: the
 * last one wins, as in 1.x. The content of a `<mask>` stays: there a colour is transparency,
 * not colour.
 */
function recolor(root: XmlNode, own: Record<string, string>, colors: Record<string, string>) {
    const byColor = new Map<string, string>();
    for (const [name, color] of Object.entries(own)) byColor.set(color.toLowerCase(), name);

    const nameOf = (value: unknown) => {
        const color = text(value);
        return color ? byColor.get(resolveColor(color) ?? color.toLowerCase()) : undefined;
    };

    const visit = (node: XmlNode) => {
        if (tagOf(node) === 'mask') return;
        const attributes = attributesOf(node);
        for (const key of COLOR_ATTRIBUTES) {
            const name = nameOf(attributes[key]);
            const color = name && Object.hasOwn(colors, name) ? resolveColor(colors[name]) : null;
            if (color) attributes[key] = color;
        }
        childrenOf(node).forEach(visit);
    };
    visit(root);
}

/**
 * The attributes of the elements that match, from the top down. The elements inside a match
 * are not searched, as in 1.x.
 */
function find(node: XmlNode, matches: (attributes: Attributes) => boolean): Attributes[] {
    const attributes = attributesOf(node);
    if (matches(attributes)) return [attributes];
    return childrenOf(node).flatMap((child) => find(child, matches));
}
