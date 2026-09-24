import { ICONS, examplePack, preview } from './main.ts';
import { customizeSvg, readPack } from '../src/index.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function show(svg: string, name: string) {
    const info = readPack(svg);
    $('status').textContent = name;
    if (!info) {
        $('info').textContent = 'Not a pack: its <svg> has no data-name.';
        $('grid').replaceChildren(preview(svg, 'as it is'));
        return;
    }
    $('info').textContent = JSON.stringify(info, null, 2);
    const strokes = info.features.includes('stroke') ? ([1, 2, 3] as const) : info.strokes;
    $('grid').replaceChildren(
        ...[undefined, ...info.states].map((state) => {
            const row = document.createElement('div');
            row.className = 'figures';
            row.append(
                ...strokes.map((stroke) =>
                    preview(
                        customizeSvg(svg, { state, stroke }),
                        `${state ?? 'default'} · ${stroke}`,
                    ),
                ),
            );
            return row;
        }),
    );
}

async function open(file: File) {
    show(await file.text(), file.name);
}

$<HTMLInputElement>('file').addEventListener('change', (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) void open(file);
});
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('drop', (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) void open(file);
});

const first = Object.keys(ICONS)[1];
show(await examplePack(first), `${first} (an example)`);
