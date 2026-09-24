import { ICONS, loadIcon, loadLayer, options, preview } from './main.ts';
import { customizeSvg, packSvg, readPack, type PackLayer } from '../src/index.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const icon = $<HTMLSelectElement>('icon');
options(icon, Object.keys(ICONS));

async function show() {
    const data = await loadIcon(icon.value);
    const regular = await loadLayer(icon.value);

    // The regular layer, packed alone and cut at another width.
    const alone = packSvg(data, [{ svg: regular }])!;
    const light = customizeSvg(alone, { stroke: 1 })!;
    const bold = customizeSvg(alone, { stroke: 3 })!;
    $('made').replaceChildren(
        preview(light, 'light'),
        preview(regular, 'regular'),
        preview(bold, 'bold'),
    );

    const layers: PackLayer[] = [
        { svg: light, stroke: 1 },
        { svg: regular },
        { svg: bold, stroke: 3 },
    ];
    const pack = packSvg(data, layers)!;
    $('info').textContent = `readPack(pack) = ${JSON.stringify(readPack(pack), null, 2)}`;
    $('cut').replaceChildren(
        ...(['light', 'regular', 'bold'] as const).map((stroke) =>
            preview(customizeSvg(pack, { stroke }), `customizeSvg(pack, { stroke: '${stroke}' })`),
        ),
    );
}

icon.addEventListener('change', show);
await show();
