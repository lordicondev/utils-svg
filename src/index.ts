import { deepClone, extractProperties, ILottieProperty, lottieColorToHex, parseColor, parseColors, readStates, set } from '@lordicon/utils-lottie';
import * as fxparser from 'fast-xml-parser';
import { X2jOptions, XmlBuilderOptions } from "fast-xml-parser";
import { nanoid } from 'nanoid/non-secure';
import { optimize } from 'svgo/dist/svgo.browser';

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

type Stroke = 1 | 2 | 3 | 'light' | 'regular' | 'bold';

interface ILayer {
    content: string;
    state?: string[];
    stroke?: 1 | 2 | 3;
}

interface INode {
    path: string;
    value: any;
    type?: any;
}

interface IFound {
    value: any;
    path: string;
    type?: any;
}

interface IMeta {
    name: string;
    features: string[];
    colors: { [color: string]: string };
    states: string[];
}

interface IColors {
    [key: string]: string;
}

interface IProperties {
    /**
     * Stroke.
     */
    stroke?: Stroke;
    /**
     * State (motion type) of the icon. States allow switching between multiple animations built into a single icon file.
     */
    state?: string;
    /**
     * Colors.
     */
    colors?: IColors;
}

/**
 * Find nodes in SVG.
 * @param node
 * @param finder
 * @param path
 * @returns
 */
function findNodes(node: any, finder: (tagName: string, attributes: any, children: any[]) => IFound[] | undefined, path?: string[]): INode[] {
    const result: INode[] = [];

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
 * Optimize SVG content.
 * @param content
 * @param options
 * @returns
 */
export function optimizeSvg(content: string, options: { prefixIds?: boolean } = {}): string {
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
 * Pack layers to SVG pack.
 * @param data
 * @param svg
 * @returns
 */
export function packSvg(
    data: any,
    svg: ILayer[],
): string | null {
    const properties = extractProperties(data);
    const states = readStates(data);

    const builder = new fxparser.XMLBuilder(BUILDER_OPTIONS);

    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const root: any = {};

    const defs: any[] = [];

    const hasStrokeLayers = svg.some((c) => c.stroke && c.stroke !== DEFAULT_STROKE);

    for (const current of svg) {
        const [item] = parser.parse(current.content);

        // validate item
        if (!item?.svg || !item.svg.length) {
            continue;
        }

        // check if it's a pack
        if (item[A][A_NAME]) {
            continue;
        }

        // find state
        const state = states.find((c) => (!current.state && c.default) || current.state?.includes(c.name));
        if (!state) {
            continue;
        }

        // create root element
        if (!root.svg) {
            root.svg = [];
            root[A] = item[A];

            const features = properties.filter(c => c.type === 'feature').map(c => c.name);

            const colors: string[] = properties.filter(c => c.type === 'color').reduce((p: string[], c: ILottieProperty) => {
                const color = lottieColorToHex(c.value).toLowerCase();
                const name = c.name;

                p.push(`${name}:${color}`);
                return p;
            }, []);

            root[A][A_NAME] = data.nm || 'unkown';
            root[A][A_FEATURES] = features.join(',');
            root[A][A_COLORS] = colors.join(',');

            // allows to force stroke layers (even if there are no stroke layers inside JSON)
            if (hasStrokeLayers) {
                root[A][A_FEATURES] = root[A][A_FEATURES].split(',').filter((c: string) => c !== 'stroke').concat('stroke-layers').join(',');
            }
        }

        const newGroupAttributes: any = {}
        const newGroupChildren: any = [];

        // assign stroke only if it's not default
        if (current.stroke && current.stroke != DEFAULT_STROKE) {
            newGroupAttributes[A_STROKE] = current.stroke;
        }

        // assign state only if it's not default
        if (current.state?.length && !state.default) {
            newGroupAttributes[A_STATE] = current.state.join(',');
        }

        // hide group if it's not default or stroke is not default
        if (!state.default || (current.stroke && current.stroke != DEFAULT_STROKE)) {
            newGroupAttributes['@_style'] = 'display: none;';
        }

        // create group
        const newGroup = {
            g: newGroupChildren,
            [A]: newGroupAttributes,
        }

        // handle items
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

        // append group to root 
        root.svg.push(newGroup);
    }

    // there are no layers
    if (!root.svg) {
        return null;
    }

    // append defs to root
    if (defs.length) {
        root.svg.push({
            defs: defs,
        });
    }

    let content = builder.build([root]);

    return content;
}

/**
 * Unpack SVG pack to layers.
 * @param svg
 * @returns
 */
export function unpackSvg(svg: string): ILayer[] {
    const meta = metaSvg(svg);
    if (!meta) {
        return [];
    }

    const result: ILayer[] = [];
    const builder = new fxparser.XMLBuilder(BUILDER_OPTIONS);
    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const [parsed] = parser.parse(svg);

    const rootBase: any = {};

    const defs: any[] = [];

    // init
    for (const child of parsed.svg) {
        const tagName = Object.keys(child)[0];
        const children = child[tagName];

        // find defs
        if (tagName === 'defs') {
            defs.push(...children);
        }

        // init root
        if (!rootBase.svg) {
            rootBase.svg = [];
            rootBase[A] = parsed[A];
        }
    }

    // handle defs
    if (defs.length) {
        rootBase.svg.push({
            defs: defs,
        });
    }

    // handle layers
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

        // optimize
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
 * Extract meta information from SVG pack.
 * @param svg
 * @returns
 */
export function metaSvg(svg: string): IMeta | null {
    if (!svg) {
        return null;
    }

    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const [root] = parser.parse(svg);

    if (!root) {
        return null;
    }

    const attributes = root[A] || {};

    // check if it's a pack
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
 * Transform SVG pack.
 * @param svg
 * @param assign
 * @returns
 */
export function transformSvg(svg: string, assign: IProperties): string | null {
    const meta = metaSvg(svg);

    if (!meta) {
        return null;
    }

    const builder = new fxparser.XMLBuilder(BUILDER_OPTIONS);
    const parser = new fxparser.XMLParser(PARSER_OPTIONS);

    const [root] = parser.parse(svg);

    const colors = parseColors(root[A][A_COLORS]) || {};
    const colorsA = Object.entries(colors);

    // check if there are stroke layers
    const hasStrokeLayers = meta.features.includes('stroke-layers') && !!root.svg.some((c: any) => {
        const attributes = c[A];
        const tagName = Object.keys(c)[0];

        if (tagName !== 'g') {
            return false;
        }

        return attributes?.[A_STROKE] && attributes?.[A_STROKE] !== DEFAULT_STROKE;
    });

    // handle layers
    root.svg = root.svg.filter((c: any) => {
        const attributes = c[A];
        const tagName = Object.keys(c)[0];

        if (tagName !== 'g') {
            return true;
        }

        let display = true;

        if (assign.state && meta.states.includes(assign.state)) {
            const layerStates = (attributes?.[A_STATE] || '').split(',').filter((c: string) => c);

            if (!layerStates.includes(assign.state)) {
                display = false;
            }
        } else {
            if (attributes?.[A_STATE]) {
                display = false;
            }
        }

        if (hasStrokeLayers) {
            if (assign.stroke) {
                const assignStroke = Math.min(3, Math.max(1, +assign.stroke));
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

    // remove redundant attributes
    root.svg.forEach((c: any) => {
        delete c[A];
    });

    // colors
    if (assign.colors && Object.keys(meta.colors).length) {
        const colorsNodes = findNodes(root, ((_tagName: string, attributes: any, _children: any[]) => {
            const result: IFound[] = [];

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

        for (const key of Object.keys(assign.colors)) {
            if (!meta.colors[key]) {
                continue;
            }

            for (const node of colorsNodes) {
                if (node.type === key) {
                    set(root, node.path, parseColor(assign.colors[key]));
                }
            }
        }
    }

    // strokes
    if (assign.stroke && meta.features.includes('stroke')) {
        let ratio = 1;

        if (assign.stroke === 'light' || assign.stroke === 1) {
            ratio = 0.5;
        } else if (assign.stroke === 'regular' || assign.stroke === 2) {
            ratio = 1;
        } else if (assign.stroke === 'bold' || assign.stroke === 3) {
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

    // remove redundant attributes
    delete root[A][A_COLORS];
    delete root[A][A_NAME];
    delete root[A][A_FEATURES];

    // final content
    let content = builder.build([root]);

    // optimize
    content = optimizeSvg(content, { prefixIds: true });

    return content;
}
