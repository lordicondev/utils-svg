import { customizeSvg, packSvg, unpackSvg } from '../src';
import { initSvgPreview, loadIcon, loadSvg } from './utils';

const iconAData = await loadIcon('wired-lineal-2795-outlet-type-f');
const iconASvg1 = await loadSvg('wired-lineal-2795-outlet-type-f');
const iconASvg2 = await loadSvg('wired-lineal-2795-outlet-type-f:morph-single');

const iconBData = await loadIcon('wired-gradient-2290-300-dpi-resolution');
const iconBSvg1 = await loadSvg('wired-gradient-2290-300-dpi-resolution');
const iconBSvg2 = await loadSvg('wired-gradient-2290-300-dpi-resolution:morph-detail');

const iconCData = await loadIcon('wired-outline-237-star-rating');
const iconCSvg1 = await loadSvg('wired-outline-237-star-rating');
const iconCSvg2 = await loadSvg('wired-outline-237-star-rating:morph-select');

const iconASvgPack = packSvg(
    iconAData,
    [
        {
            content: iconASvg1,
        },
        {
            content: iconASvg2,
            state: ['morph-single'],
        }
    ]
)!;

const iconBSvgPack = packSvg(
    iconBData,
    [
        {
            content: iconBSvg1,
            stroke: 2,
        },
        {
            content: iconBSvg2,
            stroke: 3,
            state: ['morph-detail', 'morph-detail-alt'],
        },
        {
            content: iconASvg1,
            stroke: 2,
            state: ['morph-detail', 'morph-detail-alt'],
        },
        {
            content: iconASvg2,
            stroke: 3,
        },
    ]
)!;

const iconCSvgPack = packSvg(
    iconCData,
    [
        {
            content: iconCSvg1,
        },
        {
            content: iconCSvg2,
            state: ['morph-select'],
        },
    ]
)!;

const iconASvgModify1 = customizeSvg(iconASvgPack, {
    colors: {
        primary: 'red',
        secondary: 'green',
    },
})!;

const iconASvgModify2 = customizeSvg(iconASvgPack, {
    state: 'morph-single',
})!;

const iconASvgModify3 = customizeSvg(iconASvgPack, {
    state: 'morph-single',
    colors: {
        primary: 'pink',
        secondary: 'gray',
    },
})!;

const iconASvgModify4 = customizeSvg(iconASvgPack, {
    state: 'morph-single',
    stroke: 1,
})!;

const iconBSvgModify1 = customizeSvg(iconBSvgPack, {
    state: 'morph-detail',
    stroke: 3,
    colors: {
        primary: 'blue',
        secondary: 'green',
    },
})!;

const iconCSvgModify1 = customizeSvg(iconCSvgPack, {
    state: 'morph-select',
    stroke: 2,
    colors: {
        primary: 'red',
        secondary: 'green',
    },
})!;

const icon1 = document.getElementById('icon-1')!;
const icon2 = document.getElementById('icon-2')!;
const icon3 = document.getElementById('icon-3')!;
const icon4 = document.getElementById('icon-4')!;
const icon5 = document.getElementById('icon-5')!;
const icon6 = document.getElementById('icon-6')!;
const icon7 = document.getElementById('icon-7')!;
const icon8 = document.getElementById('icon-8')!;
const icon9 = document.getElementById('icon-9')!;
const icon10 = document.getElementById('icon-10')!;
const unpack1 = document.getElementById('unpack-1')!;
const unpack2 = document.getElementById('unpack-2')!;

initSvgPreview(icon1, iconASvg1);
initSvgPreview(icon2, iconASvg2);
initSvgPreview(icon3, iconASvgPack);
initSvgPreview(icon4, iconASvgModify1);
initSvgPreview(icon5, iconASvgModify2);
initSvgPreview(icon6, iconASvgModify3);
initSvgPreview(icon7, iconASvgModify4);
initSvgPreview(icon8, iconBSvgPack);
initSvgPreview(icon9, iconBSvgModify1);
initSvgPreview(icon10, iconCSvgModify1);

const layers = unpackSvg(iconASvgPack);
initSvgPreview(unpack1, layers[0].content);
initSvgPreview(unpack2, layers[1].content);
