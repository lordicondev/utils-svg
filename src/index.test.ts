import { expect, it } from 'vitest';
import * as library from './index.ts';

it('exports the public API and nothing else', () => {
    expect(Object.keys(library).sort()).toEqual([
        'customizeSvg',
        'isPack',
        'optimizeSvg',
        'packSvg',
        'readPack',
        'unpackSvg',
    ]);
});
