import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [dts({
        rollupTypes: true,
    })],
    build: {
        target: 'es2015',
        lib: {
            formats: ['es'],
            fileName: () => 'index.js',
            entry: resolve(__dirname, 'src', 'index.ts'),
        },
        rollupOptions: {
            output: {
                inlineDynamicImports: true,
            },
        },
        minify: true,
        sourcemap: false,
        emptyOutDir: true,
    },
});