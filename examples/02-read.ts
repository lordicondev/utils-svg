import { ICONS, bytes, examplePack, loadLayer, options, preview } from './main.ts';
import { isPack, readPack, unpackSvg } from '../src/index.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const icon = $<HTMLSelectElement>('icon');
options(icon, Object.keys(ICONS));

async function show() {
    const pack = await examplePack(icon.value);
    const layer = await loadLayer(icon.value);
    $('info').textContent = [
        `isPack(pack) = ${isPack(pack)}`,
        `isPack(layer) = ${isPack(layer)}`,
        `readPack(pack) = ${JSON.stringify(readPack(pack), null, 2)}`,
    ].join('\n');
    $('layers').replaceChildren(
        ...unpackSvg(pack).map(({ svg, states, stroke }) =>
            preview(svg, `${states.join(', ') || 'default'} · stroke ${stroke} · ${bytes(svg)}`),
        ),
    );
}

icon.addEventListener('change', show);
await show();
