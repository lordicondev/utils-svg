/**
 * The attributes of a pack. The root `<svg>` carries the icon's name, features and colours;
 * each top-level `<g>` is a layer, with the states it serves and its stroke width.
 *
 *     <svg … data-name="wired-outline-1-cloud" data-features="stroke" data-colors="primary:#121331">
 *         <g>…</g>                                                  the default state, regular
 *         <g data-state="morph-open" style="display: none;">…</g>   another state
 *         <g data-stroke="3" style="display: none;">…</g>           the default state, bold
 *         <defs>…</defs>                                            every layer's definitions
 *     </svg>
 */
export const NAME = '@_data-name';
export const FEATURES = '@_data-features';
export const COLORS = '@_data-colors';
export const STATE = '@_data-state';
export const STROKE = '@_data-stroke';

/** The stroke of a layer without `data-stroke`: regular. */
export const DEFAULT_STROKE = 2;

/** Hides a layer that is not shown by default. */
export const HIDDEN = 'display: none;';

/** `data-features`: the icon's stroke can be scaled. */
export const FEATURE_STROKE = 'stroke';

/** `data-features`: the pack has a layer per stroke width, in place of `stroke`. */
export const FEATURE_STROKE_LAYERS = 'stroke-layers';
