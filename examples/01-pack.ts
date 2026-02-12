import { packSvg, unpackSvg } from '../src';
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

initSvgPreview(document.getElementById('pack1')!, pack);

const unpack = unpackSvg(pack)!;

initSvgPreview(document.getElementById('unpack1')!, unpack[0].content, unpack[0].state?.join(', ') || 'default');
initSvgPreview(document.getElementById('unpack2')!, unpack[1].content, unpack[1].state?.join(', ') || 'default');