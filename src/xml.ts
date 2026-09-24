import { XMLBuilder, XMLParser } from 'fast-xml-parser';

/** Where fast-xml-parser keeps an element's attributes, when it keeps the order. */
export const ATTRIBUTES = ':@';

/**
 * An element as fast-xml-parser gives it in order: `{ tag: children, ':@': attributes }`.
 * Text is `{ '#text': value }`.
 */
export type XmlNode = Record<string, unknown> & { [ATTRIBUTES]?: Attributes };
export type Attributes = Record<string, unknown>;

// The options 1.x used: packs are written with them, so they stay as they are. Attribute
// values are parsed, so `data-stroke="3"` reads as a number and `1.50` is written as `1.5`.
const parser = new XMLParser({
    preserveOrder: true,
    trimValues: true,
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    parseAttributeValue: true,
});

const builder = new XMLBuilder({
    preserveOrder: true,
    ignoreAttributes: false,
});

/** The elements at the top of a document. Empty when it is not XML. */
export function parse(xml: string): XmlNode[] {
    try {
        return parser.parse(xml) as XmlNode[];
    } catch {
        return [];
    }
}

export function build(nodes: XmlNode[]): string {
    return builder.build(nodes) as string;
}

/** The first `<svg>` of a document, or null. */
export function parseSvg(xml: string): XmlNode | null {
    if (typeof xml !== 'string') return null;
    const root = parse(xml).find((node) => tagOf(node) === 'svg');
    return root && Array.isArray(root.svg) ? root : null;
}

/** An element's tag: its first key. */
export function tagOf(node: XmlNode): string {
    return Object.keys(node)[0];
}

export function childrenOf(node: XmlNode): XmlNode[] {
    const children = node[tagOf(node)];
    return Array.isArray(children) ? (children as XmlNode[]) : [];
}

export function attributesOf(node: XmlNode): Attributes {
    return node[ATTRIBUTES] ?? {};
}

/** An attribute as text: parsed numbers and booleans back to what they were written as. */
export function text(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    return String(value);
}

/** The names in a comma-separated attribute, such as `data-state="morph-a,hover-b"`. */
export function list(value: unknown): string[] {
    return (text(value) ?? '').split(',').filter(Boolean);
}
