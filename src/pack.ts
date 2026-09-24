import { fromLottieColor, readControls, readStates, type IconData } from '@lordicon/utils-lottie';
import {
    COLORS,
    DEFAULT_STROKE,
    FEATURE_STROKE,
    FEATURE_STROKE_LAYERS,
    FEATURES,
    HIDDEN,
    NAME,
    STATE,
    STROKE,
} from './format.ts';
import { idPrefix, prefixSvgIds } from './optimize.ts';
import {
    ATTRIBUTES,
    attributesOf,
    build,
    childrenOf,
    parseSvg,
    tagOf,
    text,
    type XmlNode,
} from './xml.ts';

/** One layer of a pack: an SVG of the icon in some states, at one stroke width. */
export interface PackLayer {
    svg: string;
    /** The states it shows. Without any, the default state. */
    states?: string[];
    /** Its stroke width: 1 light, 2 regular (the default), 3 bold. */
    stroke?: 1 | 2 | 3;
}

/**
 * Packs the layers of an icon into one SVG. `icon` is its Lottie file: it gives the name,
 * the colours, whether the stroke scales, and the states a layer may name.
 *
 * Each layer becomes a `<g>`; only the default state at regular stroke shows, the others are
 * hidden. Their `<defs>` are merged at the end. A layer that is already a pack, or names no
 * state the icon has, is left out. Null when no layer is left.
 */
export function packSvg(icon: IconData, layers: PackLayer[]): string | null {
    const controls = readControls(icon);
    const states = readStates(icon);
    const strokeLayers = layers.some((layer) => layer.stroke && layer.stroke !== DEFAULT_STROKE);

    let root: XmlNode | null = null;
    const groups: XmlNode[] = [];
    const defs: XmlNode[] = [];

    const defined = new Map<string, string>();

    for (const layer of layers) {
        let svg = parseSvg(layer.svg);
        if (!svg || !childrenOf(svg).length || attributesOf(svg)[NAME]) continue;

        const names = layerStates(layer.states);
        const state = states.find((candidate) =>
            names ? names.includes(candidate.name) : candidate.default,
        );
        if (!state) continue;

        // The pack holds every layer's definitions. Layers made apart can give one id to
        // different things, so such a layer gets ids of its own. The same definition twice is
        // left as it is: a link finds the same thing in either.
        const taken = [...definitions(svg)].some(
            ([id, xml]) => defined.has(id) && defined.get(id) !== xml,
        );
        if (taken) svg = parseSvg(prefixSvgIds(layer.svg, idPrefix(layer.svg)))!;
        for (const [id, xml] of definitions(svg)) if (!defined.has(id)) defined.set(id, xml);

        // The root takes the first layer's attributes, and says what the icon is.
        if (!root) {
            const features = controls
                .filter((control) => control.type === 'feature')
                .map((control) => control.name);
            const colors = controls.flatMap((control) =>
                control.type === 'color'
                    ? [`${control.name}:${fromLottieColor(control.value).toLowerCase()}`]
                    : [],
            );

            const attributes = { ...attributesOf(svg) };
            // 'unkown' as 1.x wrote it, for icons without a name.
            attributes[NAME] = (icon as { nm?: unknown }).nm || 'unkown';
            attributes[FEATURES] = features.join(',');
            attributes[COLORS] = colors.join(',');
            // A layer per stroke width, in place of scaling it.
            if (strokeLayers) {
                attributes[FEATURES] = features
                    .join(',')
                    .split(',')
                    .filter((feature) => feature !== FEATURE_STROKE)
                    .concat(FEATURE_STROKE_LAYERS)
                    .join(',');
            }
            root = { svg: groups, [ATTRIBUTES]: attributes };
        }

        const stroke = layer.stroke && layer.stroke !== DEFAULT_STROKE ? layer.stroke : null;
        const attributes: Record<string, unknown> = {};
        if (stroke) attributes[STROKE] = stroke;
        if (names?.length && !state.default) attributes[STATE] = names.join(',');
        if (!state.default || stroke) attributes['@_style'] = HIDDEN;

        const children: XmlNode[] = [];
        for (const child of childrenOf(svg)) {
            const tag = tagOf(child);
            if (tag === 'defs') defs.push(...childrenOf(child));
            else children.push({ [tag]: child[tag], [ATTRIBUTES]: child[ATTRIBUTES] });
        }
        groups.push({ g: children, [ATTRIBUTES]: attributes });
    }

    if (!root) return null;
    if (defs.length) groups.push({ defs });
    return build([root]);
}

/** The elements with an id in an element and everything inside it, as XML by id. */
function definitions(node: XmlNode, found = new Map<string, string>()): Map<string, string> {
    const id = text(attributesOf(node)['@_id']);
    if (id) found.set(id, build([node]));
    for (const child of childrenOf(node)) definitions(child, found);
    return found;
}

/** The states a layer names: null for the default one. A single name is taken as a list. */
function layerStates(states: unknown): string[] | null {
    if (typeof states === 'string') return states ? [states] : null;
    return Array.isArray(states) && states.length ? states.map(String) : null;
}
