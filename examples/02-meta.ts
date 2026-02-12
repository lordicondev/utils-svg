import { metaSvg, packSvg } from '../src';
import { initSvgPreview, loadIcon, loadSvg } from './utils';

const iconData = await loadIcon('wired-lineal-2795-outlet-type-f');
const iconSvg1 = await loadSvg('wired-lineal-2795-outlet-type-f');
const iconSvg2 = await loadSvg('wired-lineal-2795-outlet-type-f:morph-single');

const pack = packSvg(
    iconData,
    [
        {
            content: iconSvg1,
        },
        {
            content: iconSvg2,
            state: ['morph-single'],
        },
    ]
)!;

initSvgPreview(document.getElementById('icon')!, pack);

const meta = metaSvg(pack);
document.getElementById('meta')!.innerText = JSON.stringify(meta, null, 2);
