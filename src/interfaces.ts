/**
 * Meta data for an svg icon pack.
 */
export interface PackMetaData {
    /**
     * Name of the icon.
     */
    name: string;

    /**
     * Supported features of the icon pack.
     */
    features: string[];

    /**
     * Supported colors for the icon pack.
     */
    colors: { [color: string]: string };

    /**
     * Supported states for the icon pack.
     */
    states: string[];
}

/**
 * Layer of an icon.
 */
export interface Layer {
    /**
     * SVG content of the layer.
     */
    content: string;

    /**
     * State of the layer.
     */
    state?: string[];

    /**
     * Stroke of the layer.
     */
    stroke?: 1 | 2 | 3;
}

/**
 * Supported stroke values.
 */
export type Stroke = 1 | 2 | 3 | 'light' | 'regular' | 'bold';

/**
 * Interface for the object that stores multiple colors.
 */
export interface ColorsMap {
    [key: string]: string;
}

/**
 * Interface for icon properties.
 * 
 * Example:
 * ```js
 * {
 *     stroke: 'bold',
 *     colors: {
 *         primary: 'red',
 *     },
 * }
 * ```
 */
export interface IconProperties {
    /**
     * State (motion type) of the icon. States allow switching between multiple animations built into a single icon file.
     */
    state?: string;

    /**
     * Colors.
     */
    colors?: ColorsMap;

    /**
     * Stroke.
     */
    stroke?: Stroke;
}