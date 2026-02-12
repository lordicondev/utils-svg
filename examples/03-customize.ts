import { metaSvg, packSvg, customizeSvg } from '../src';
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

const customized = customizeSvg(pack, {
    colors: {
        primary: 'red',
        secondary: 'blue',
    },
    stroke: 3,
})!;

initSvgPreview(document.getElementById('icon')!, customized);
