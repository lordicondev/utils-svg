import { customizeSvg, packSvg } from '../src';
import { initSvgPreview, loadIcon, loadSvg } from './utils';

const iconData = await loadIcon('wired-outline-237-star-rating');
const iconSvg1 = await loadSvg('wired-outline-237-star-rating');
const iconSvg2 = await loadSvg('wired-outline-237-star-rating:morph-select');

const iconPack = packSvg(
    iconData,
    [
        {
            content: iconSvg1,
        },
        {
            content: iconSvg2,
            state: ['morph-select'],
        },
    ]
)!;

const customizedIcon = customizeSvg(iconPack, {
    colors: {
        primary: 'red',
    },
    background: 'blue',
})!;

initSvgPreview(document.getElementById('background')!, customizedIcon);