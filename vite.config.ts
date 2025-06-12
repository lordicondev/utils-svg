import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        rollupOptions: {
            input: 'demo/index.html',
        },
    },
    server: {
        host: '0.0.0.0',
        port: 8080,
    },
    root: 'demo'
});