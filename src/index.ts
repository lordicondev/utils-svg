import { deepClone, extractLottieProperties, LottieProperty, parseColor, parseColors, readStates, set, tupleColorToHex } from '@lordicon/utils-lottie';
import * as fxparser from 'fast-xml-parser';
import { X2jOptions, XmlBuilderOptions } from "fast-xml-parser";
import { nanoid } from 'nanoid/non-secure';
import { optimize } from 'svgo/dist/svgo.browser';
import { IconProperties, Layer, PackMetaData } from './interfaces';

interface SvgNode {
    path: string;
    value: any;
    type?: any;
}

interface SvgFound {
    value: any;
    path: string;
    type?: any;
}

const A = ':@';
const A_COLORS = '@_data-colors';
const A_NAME = '@_data-name';
const A_FEATURES = '@_data-features';
const A_STATE = '@_data-state';
const A_STROKE = '@_data-stroke';
const DEFAULT_STROKE = 2;

const BUILDER_OPTIONS: XmlBuilderOptions = {
    preserveOrder: true,
    ignoreAttributes: false,
}

const PARSER_OPTIONS: X2jOptions = {
    preserveOrder: true,
    trimValues: true,
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    parseAttributeValue: true,
}

/**
 * Recursively searches for nodes in an SVG object tree that match a given condition.
 *
 * @param node The current node to search within.
 * @param finder A callback function that receives the tag name, attributes, and children of the node. It should return an array of found nodes (SvgFound) or undefined if nothing is found.
 * @param path The current path in the tree, used for tracking the location of found nodes.
 * @returns An array of SvgNode objects representing all nodes found by the finder callback.
 */
function findNodes(
    node: any,
    finder: (tagName: string, attributes: any, children: any[]) => SvgFound[] | undefined,
    path?: string[],
): SvgNode[] {
    const result: SvgNode[] = [];

    const attributes = node[A] || {};
    const tagName = Object.keys(node)[0];
    const children = node[tagName];

    const found = finder(tagName, attributes, children);

    if (found !== undefined) {
        for (const f of found) {
            result.push({
                path: [...(path || [tagName]), f.path].join('.'),
                value: f.value,
                type: f.type,
            });
        }
    } else if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const childPath = path ? [...path, tagName, i.toString()] : [tagName, i.toString()];
            result.push(...findNodes(child, finder, childPath));
        }
    }

    return result;
}

/**
 * Optimizes SVG content using SVGO.
 * @param content The SVG content as a string to be optimized.
 * @param options Optional optimization options. If `prefixIds` is true, unique prefixes will be added to IDs.
 * @returns The optimized SVG content as a string.
 */
export function optimizeSvg(
    content: string,
    options: { prefixIds?: boolean } = {},
): string {
    return optimize(content, {
        multipass: true,
        plugins: [
            {
                name: 'preset-default',
                params: {
                    overrides: {
                        removeViewBox: false,
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
            options.prefixIds ? {
                name: 'prefixIds',
                params: {
                    delim: '',
                    prefix: () => nanoid(10),
                },
            } : undefined,
        ].filter((c) => c) as any,
    }).data;
}

/**
 * Packs an array of SVG layers into a single SVG pack string.
 * @param data The source data (Lottie JSON) used to extract icon properties and states.
 * @param layers An array of Layer objects, each containing SVG content, state, and stroke information.
 * @returns The packed SVG as a string, or null if no valid layers are found.
 */
export function packSvg(
    data: any,
    layers: Layer[],
): string | null {
    const properties = extractLottieProperties(data);
    const states = readStates(data);

    const builder = new fxparser.XMLBuilder(BUILDER_OPTIONS);

    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const root: any = {};

    const defs: any[] = [];

    const hasStrokeLayers = layers.some((c) => c.stroke && c.stroke !== DEFAULT_STROKE);

    for (const current of layers) {
        const [item] = parser.parse(current.content);

        // Validate item.
        if (!item?.svg || !item.svg.length) {
            continue;
        }

        // Check if it's a pack.
        if (item[A][A_NAME]) {
            continue;
        }

        // Find state.
        const state = states.find((c) => (!current.state && c.default) || current.state?.includes(c.name));
        if (!state) {
            continue;
        }

        // Create root element.
        if (!root.svg) {
            root.svg = [];
            root[A] = item[A];

            const features = properties.filter(c => c.type === 'feature').map(c => c.name);

            const colors: string[] = properties.filter(c => c.type === 'color').reduce((p: string[], c: LottieProperty) => {
                const color = tupleColorToHex(c.value).toLowerCase();
                const name = c.name;

                p.push(`${name}:${color}`);
                return p;
            }, []);

            root[A][A_NAME] = data.nm || 'unkown';
            root[A][A_FEATURES] = features.join(',');
            root[A][A_COLORS] = colors.join(',');

            // Allows to force stroke layers (even if there are no stroke layers inside JSON).
            if (hasStrokeLayers) {
                root[A][A_FEATURES] = root[A][A_FEATURES].split(',').filter((c: string) => c !== 'stroke').concat('stroke-layers').join(',');
            }
        }

        const newGroupAttributes: any = {}
        const newGroupChildren: any = [];

        // Assign stroke only if it's not default.
        if (current.stroke && current.stroke != DEFAULT_STROKE) {
            newGroupAttributes[A_STROKE] = current.stroke;
        }

        // Assign state only if it's not default.
        if (current.state?.length && !state.default) {
            newGroupAttributes[A_STATE] = current.state.join(',');
        }

        // Hide group if it's not default or stroke is not default.
        if (!state.default || (current.stroke && current.stroke != DEFAULT_STROKE)) {
            newGroupAttributes['@_style'] = 'display: none;';
        }

        // Create group.
        const newGroup = {
            g: newGroupChildren,
            [A]: newGroupAttributes,
        }

        // Handle items.
        for (const child of item.svg) {
            const tagName = Object.keys(child)[0];
            const attributes = child[A];
            const children = child[tagName];

            if (tagName === 'defs') {
                defs.push(...children);
            } else {
                newGroupChildren.push({
                    [tagName]: children,
                    [A]: attributes,
                });
            }
        }

        // Append group to root.
        root.svg.push(newGroup);
    }

    // There are no layers.
    if (!root.svg) {
        return null;
    }

    // Append defs to root.
    if (defs.length) {
        root.svg.push({
            defs: defs,
        });
    }

    let content = builder.build([root]);

    return content;
}

/**
 * Unpacks an SVG pack into individual layers.
 * @param svg The SVG pack as a string.
 * @returns An array of Layer objects extracted from the SVG pack. Returns an empty array if the SVG is invalid or not a pack.
 */
export function unpackSvg(
    svg: string,
): Layer[] {
    const meta = metaSvg(svg);
    if (!meta) {
        return [];
    }

    const result: Layer[] = [];
    const builder = new fxparser.XMLBuilder(BUILDER_OPTIONS);
    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const [parsed] = parser.parse(svg);

    const rootBase: any = {};

    const defs: any[] = [];

    // Init.
    for (const child of parsed.svg) {
        const tagName = Object.keys(child)[0];
        const children = child[tagName];

        // Find defs.
        if (tagName === 'defs') {
            defs.push(...children);
        }

        // Init root.
        if (!rootBase.svg) {
            rootBase.svg = [];
            rootBase[A] = parsed[A];
        }
    }

    // Handle defs.
    if (defs.length) {
        rootBase.svg.push({
            defs: defs,
        });
    }

    // Handle layers.
    for (const child of parsed.svg) {
        const tagName = Object.keys(child)[0];
        const children = child[tagName];
        const attributes = child[A];

        if (tagName !== 'g') {
            continue;
        }

        const stroke = attributes?.[A_STROKE];
        const state = (attributes?.[A_STATE] || '').split(',').filter((c: string) => c);

        const root = deepClone(rootBase);

        delete root[A][A_COLORS];
        delete root[A][A_NAME];
        delete root[A][A_FEATURES];

        root.svg.push(...children);

        let content = builder.build([root]);

        // Optimize.
        content = optimizeSvg(content, { prefixIds: true });

        result.push({
            content,
            state,
            stroke,
        });
    }

    return result;
}

/**
 * Extracts meta information from an SVG pack.
 * @param svg The SVG pack as a string.
 * @returns The extracted PackMetaData object, or null if the SVG is invalid or not a pack.
 */
export function metaSvg(
    svg: string,
): PackMetaData | null {
    if (!svg) {
        return null;
    }

    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const [root] = parser.parse(svg);

    if (!root) {
        return null;
    }

    const attributes = root[A] || {};

    // Check if it's a pack.
    if (!attributes[A_NAME]) {
        return null;
    }

    const name = attributes[A_NAME];
    const features = attributes[A_FEATURES]?.split(',') || [];
    const colors = parseColors(attributes[A_COLORS]) || {};
    const states = (root.svg || []).reduce((p: string[], c: any) => {
        const attributes = c[A] || {};
        const states = (attributes[A_STATE] || '').split(',').filter((c: string) => c);

        for (const state of states) {
            if (!p.includes(state)) {
                p.push(state);
            }
        }

        return p;
    }, []);

    return {
        name,
        features,
        colors,
        states,
    };
}

/**
 * Customizes an SVG pack by applying the given icon properties (state, colors, stroke).
 * @param svg The SVG pack as a string.
 * @param properties Properties object specifying state, colors, and/or stroke to apply.
 * @returns The customized SVG as a string, or null if the SVG is invalid or not a pack.
 */
export function customizeSvg(
    svg: string,
    properties: IconProperties,
): string | null {
    const meta = metaSvg(svg);

    if (!meta) {
        return null;
    }

    const builder = new fxparser.XMLBuilder(BUILDER_OPTIONS);
    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const [root] = parser.parse(svg);

    const colors = parseColors(root[A][A_COLORS]) || {};
    const colorsA = Object.entries(colors);

    // Check if there are stroke layers.
    const hasStrokeLayers = meta.features.includes('stroke-layers') && !!root.svg.some((c: any) => {
        const attributes = c[A];
        const tagName = Object.keys(c)[0];

        if (tagName !== 'g') {
            return false;
        }

        return attributes?.[A_STROKE] && attributes?.[A_STROKE] !== DEFAULT_STROKE;
    });

    // Handle layers.
    root.svg = root.svg.filter((c: any) => {
        const attributes = c[A];
        const tagName = Object.keys(c)[0];

        if (tagName !== 'g') {
            return true;
        }

        let display = true;

        if (properties.state && meta.states.includes(properties.state)) {
            const layerStates = (attributes?.[A_STATE] || '').split(',').filter((c: string) => c);

            if (!layerStates.includes(properties.state)) {
                display = false;
            }
        } else {
            if (attributes?.[A_STATE]) {
                display = false;
            }
        }

        if (hasStrokeLayers) {
            if (properties.stroke) {
                const assignStroke = Math.min(3, Math.max(1, +properties.stroke));
                const stroke = attributes?.[A_STROKE] || DEFAULT_STROKE;

                if (stroke !== assignStroke) {
                    display = false;
                }
            } else {
                const stroke = attributes?.[A_STROKE] || DEFAULT_STROKE;

                if (stroke !== DEFAULT_STROKE) {
                    display = false;
                }
            }
        }

        return display;
    });

    // Remove redundant attributes.
    root.svg.forEach((c: any) => {
        delete c[A];
    });

    // Colors.
    if (properties.colors && Object.keys(meta.colors).length) {
        const colorsNodes = findNodes(root, ((_tagName: string, attributes: any, _children: any[]) => {
            const result: SvgFound[] = [];

            if (attributes['@_stroke']) {
                const currentColor = colorsA.reduce((p, c) => {
                    if (c[1].toLowerCase() === attributes['@_stroke'].toLowerCase()) {
                        return c[0];
                    }
                    return p;
                }, '');

                if (currentColor) {
                    result.push({
                        value: attributes['@_stroke'].toLowerCase(),
                        path: `${A}.@_stroke`,
                        type: currentColor,
                    });
                }
            }

            if (attributes['@_fill']) {
                const currentColor = colorsA.reduce((p, c) => {
                    if (c[1].toLowerCase() === attributes['@_fill'].toLowerCase()) {
                        return c[0];
                    }
                    return p;
                }, '');

                if (currentColor) {
                    result.push({
                        value: attributes['@_fill'].toLowerCase(),
                        path: `${A}.@_fill`,
                        type: currentColor,
                    });
                }
            }

            if (attributes['@_stop-color']) {
                const currentColor = colorsA.reduce((p, c) => {
                    if (c[1].toLowerCase() === attributes['@_stop-color'].toLowerCase()) {
                        return c[0];
                    }
                    return p;
                }, '');

                if (currentColor) {
                    result.push({
                        value: attributes['@_stop-color'].toLowerCase(),
                        path: `${A}.@_stop-color`,
                        type: currentColor,
                    });
                }
            }

            return result.length ? result : undefined;
        }));

        for (const key of Object.keys(properties.colors)) {
            if (!meta.colors[key]) {
                continue;
            }

            for (const node of colorsNodes) {
                if (node.type === key) {
                    set(root, node.path, parseColor(properties.colors[key]));
                }
            }
        }
    }

    // Strokes.
    if (properties.stroke && meta.features.includes('stroke')) {
        let ratio = 1;

        if (properties.stroke === 'light' || properties.stroke === 1) {
            ratio = 0.5;
        } else if (properties.stroke === 'regular' || properties.stroke === 2) {
            ratio = 1;
        } else if (properties.stroke === 'bold' || properties.stroke === 3) {
            ratio = 1.5;
        }

        if (ratio !== 1) {
            const strokesNodes = findNodes(root, ((_tagName: string, attributes: any, _children: any[]) => {
                if (attributes['@_stroke-width']) {
                    return [{
                        value: attributes['@_stroke-width'],
                        path: `${A}.@_stroke-width`,
                    }];
                }
            }));

            for (const node of strokesNodes) {
                set(root, node.path, node.value * ratio);
            }
        }
    }

    // Remove redundant attributes.
    delete root[A][A_COLORS];
    delete root[A][A_NAME];
    delete root[A][A_FEATURES];

    // Final content.
    let content = builder.build([root]);

    // Optimize.
    content = optimizeSvg(content, { prefixIds: true });

    return content;
}
