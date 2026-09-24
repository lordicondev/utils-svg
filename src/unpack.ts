import { COLORS, FEATURES, NAME, STATE, STROKE } from './format.ts';
import { optimizeSvg } from './optimize.ts';
import type { PackLayer } from './pack.ts';
import { readPack, strokeOf } from './read.ts';
import {
    ATTRIBUTES,
    attributesOf,
    build,
    childrenOf,
    list,
    parseSvg,
    tagOf,
    type XmlNode,
} from './xml.ts';

/**
 * The layers of a pack, each as an SVG of its own with the pack's definitions, optimised and
 * with ids of its own. Empty for an SVG that is not a pack.
 */
export function unpackSvg(pack: string): Required<PackLayer>[] {
    const root = readPack(pack) ? parseSvg(pack) : null;
    if (!root) return [];

    const attributes = { ...attributesOf(root) };
    delete attributes[NAME];
    delete attributes[FEATURES];
    delete attributes[COLORS];

    const defs = childrenOf(root).flatMap((child) =>
        tagOf(child) === 'defs' ? childrenOf(child) : [],
    );

    return childrenOf(root)
        .filter((child) => tagOf(child) === 'g')
        .map((group) => {
            const layer = attributesOf(group);
            const content: XmlNode[] = [
                ...(defs.length ? [{ defs: structuredClone(defs) }] : []),
                ...childrenOf(group),
            ];
            const svg: XmlNode = { svg: content, [ATTRIBUTES]: { ...attributes } };
            return {
                svg: optimizeSvg(build([svg]), { prefixIds: true }),
                states: list(layer[STATE]),
                stroke: strokeOf(layer[STROKE]),
            };
        });
}
