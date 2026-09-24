import { optimize, type CustomPlugin, type XastElement } from 'svgo/browser';

export interface OptimizeOptions {
    /**
     * Prefixes every id, so SVGs on one page do not share them. `true` makes the prefix from
     * the optimised content: an SVG that draws the same always gets the same ids, another one
     * other ones. A string is the prefix itself.
     */
    prefixIds?: boolean | string;
}

/**
 * The SVG through SVGO, with the settings packs are made with: hidden elements stay (a pack
 * hides its other layers), numbers keep 4 decimals.
 */
export function optimizeSvg(svg: string, { prefixIds = false }: OptimizeOptions = {}): string {
    const optimized = optimize(svg, {
        multipass: true,
        plugins: [
            xlinkPrefix,
            {
                name: 'preset-default',
                params: {
                    overrides: {
                        removeHiddenElems: false,
                        cleanupNumericValues: {
                            floatPrecision: 4,
                            leadingZero: true,
                            defaultPx: true,
                            convertToPx: true,
                        },
                    },
                },
            },
        ],
    }).data;
    if (!prefixIds) return optimized;

    // The prefix comes from what the SVG draws, not from the ids it came with: those are
    // shortened by now, so two drawings of one frame get the same.
    return prefixSvgIds(optimized, prefixIds === true ? idPrefix(optimized) : prefixIds);
}

/**
 * Prefixes the ids of an SVG and the links to them, and nothing else. Class names get the
 * prefix only when a stylesheet in the SVG could use them; otherwise they stay, as the
 * names of the icon's colours.
 */
export function prefixSvgIds(svg: string, prefix: string): string {
    return optimize(svg, {
        plugins: [
            xlinkPrefix,
            {
                name: 'prefixIds',
                params: { prefix, delim: '', prefixClassNames: /<style[\s>]/.test(svg) },
            },
        ],
    }).data;
}

/**
 * A prefix for the ids of an SVG, from its content: a letter (an id cannot start with a
 * digit) and a 32-bit FNV-1a hash in base 36.
 */
export function idPrefix(content: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < content.length; i++) {
        hash ^= content.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return `i${(hash >>> 0).toString(36)}`;
}

const XLINK = 'http://www.w3.org/1999/xlink';

/**
 * Writes the attributes of the xlink namespace with the prefix `xlink`, whatever prefix they
 * came with. A browser's XMLSerializer makes one up (`ns1:href`) for a link set without a
 * prefix, as the Lottie renderer sets them, and SVGO's prefixIds follows only `href` and
 * `xlink:href`: the ids got a prefix and the links did not.
 */
const xlinkPrefix: CustomPlugin = {
    name: 'xlinkPrefix',
    fn: () => {
        // The prefixes bound to xlink, for each open element.
        const scopes: Set<string>[] = [new Set()];
        let renamed = false;

        return {
            element: {
                enter(node) {
                    const bound = new Set(scopes[scopes.length - 1]);
                    for (const [name, value] of Object.entries(node.attributes)) {
                        const prefix = name.startsWith('xmlns:') ? name.slice(6) : null;
                        if (!prefix || prefix === 'xlink') continue;
                        if (value === XLINK) {
                            bound.add(prefix);
                            delete node.attributes[name];
                        } else {
                            bound.delete(prefix);
                        }
                    }
                    scopes.push(bound);

                    for (const name of Object.keys(node.attributes)) {
                        const [prefix, local] = name.split(':');
                        if (!local || !bound.has(prefix)) continue;
                        // Written twice: the one already called xlink stays.
                        node.attributes[`xlink:${local}`] ??= node.attributes[name];
                        delete node.attributes[name];
                        renamed = true;
                    }
                },
                exit() {
                    scopes.pop();
                },
            },
            root: {
                exit(root) {
                    const svg = root.children.find(
                        (child): child is XastElement =>
                            child.type === 'element' && child.name === 'svg',
                    );
                    if (renamed && svg) svg.attributes['xmlns:xlink'] = XLINK;
                },
            },
        };
    },
};
