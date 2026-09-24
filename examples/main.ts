import type { IconData } from '@lordicon/utils-lottie';
import { packSvg, type PackLayer } from '../src/index.ts';

/** The icons in examples/icons: a Lottie file, and a layer SVG per state. */
export const ICONS = {
    'wired-lineal-2795-outlet-type-f': ['morph-single'],
    'wired-gradient-2290-300-dpi-resolution': ['morph-detail'],
    'wired-outline-237-star-rating': ['morph-select'],
} as Record<string, string[]>;

export async function loadIcon(name: string): Promise<IconData> {
    return (await fetch(`/icons/${name}.json`)).json();
}

/** A layer as exported from a design tool: `name.svg`, or `name_state.svg` for another state. */
export async function loadLayer(name: string, state?: string): Promise<string> {
    return (await fetch(`/icons/${name}${state ? `_${state}` : ''}.svg`)).text();
}

/** The pack of an example icon: its default layer and a layer per state. */
export async function examplePack(name: string): Promise<string> {
    const layers: PackLayer[] = [{ svg: await loadLayer(name) }];
    for (const state of ICONS[name])
        layers.push({ svg: await loadLayer(name, state), states: [state] });
    return packSvg(await loadIcon(name), layers)!;
}

/** An SVG as an image, so ids of one never meet another's. */
export function preview(svg: string | null, label = ''): HTMLElement {
    const figure = document.createElement('figure');
    figure.className = 'svg';
    const image = document.createElement('img');
    image.className = 'checker';
    if (svg) image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const caption = document.createElement('figcaption');
    caption.textContent = label;
    figure.append(image, caption);
    return figure;
}

export function bytes(text: string): string {
    const size = new Blob([text]).size;
    return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} kB`;
}

/** Fills a select with options, the first one chosen. */
export function options(select: HTMLSelectElement, values: string[], chosen = values[0]): void {
    select.replaceChildren(
        ...values.map((value) => new Option(value, value, value === chosen, value === chosen)),
    );
}
