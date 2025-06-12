declare module 'svgo/dist/svgo.browser' {
    import { Config, Output } from 'svgo';

    export function optimize(input: string, config?: Config): Output;
}