import { ICONS, bytes, loadIcon, loadLayer, options, preview } from './main.ts';
import { packSvg, readPack, type PackLayer } from '../src/index.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const icon = $<HTMLSelectElement>('icon');
options(icon, Object.keys(ICONS));

async function show() {
    const layers: PackLayer[] = [{ svg: await loadLayer(icon.value) }];
    for (const state of ICONS[icon.value]) {
        layers.push({ svg: await loadLayer(icon.value, state), states: [state] });
    }
    $('layers').replaceChildren(
        ...layers.map((layer) => preview(layer.svg, layer.states?.join(', ') ?? 'default')),
    );

    const pack = packSvg(await loadIcon(icon.value), layers)!;
    $('pack').replaceChildren(preview(pack, bytes(pack)));
    $('info').textContent = `readPack(pack) = ${JSON.stringify(readPack(pack), null, 2)}`;
    $('source').textContent = pack.replace(/></g, '>\n<');
}

icon.addEventListener('change', show);
await show();
