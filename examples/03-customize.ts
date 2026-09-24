import { ICONS, bytes, examplePack, options, preview } from './main.ts';
import { customizeSvg, readPack, type CustomizeOptions } from '../src/index.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const icon = $<HTMLSelectElement>('icon');
const state = $<HTMLSelectElement>('state');
const stroke = $<HTMLSelectElement>('stroke');
options(icon, Object.keys(ICONS));
options(stroke, ['(regular)', 'light', 'bold']);

let pack = '';

async function load() {
    pack = await examplePack(icon.value);
    const info = readPack(pack)!;
    options(state, ['(default)', ...info.states]);
    $('colors').replaceChildren(
        ...Object.entries(info.colors).map(([name, value]) => {
            const label = document.createElement('label');
            label.innerHTML = `${name} <input type="color" name="${name}" value="${value}" />`;
            return label;
        }),
    );
    update();
}

function update() {
    const colors: Record<string, string> = {};
    for (const input of $('colors').querySelectorAll('input')) colors[input.name] = input.value;
    const settings: CustomizeOptions = {
        ...(state.selectedIndex ? { state: state.value } : {}),
        ...(stroke.selectedIndex ? { stroke: stroke.value as 'light' | 'bold' } : {}),
        colors,
        ...($<HTMLInputElement>('transparent').checked
            ? {}
            : { background: $<HTMLInputElement>('background').value }),
    };
    const svg = customizeSvg(pack, settings)!;
    $('result').replaceChildren(preview(svg, bytes(svg)));
    $('code').textContent = `customizeSvg(pack, ${JSON.stringify(settings, null, 4)})`;
    $('source').textContent = svg.replace(/></g, '>\n<');
}

icon.addEventListener('change', load);
for (const input of [state, stroke, $('colors'), $('background'), $('transparent')]) {
    input.addEventListener('input', update);
}
await load();
