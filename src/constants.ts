/** Module id / flag namespace. Matches module.json `id`. */
export const MODULE_ID = "pf2e-scene-vision-range";

/** The PF2e system id this module depends on. */
export const REQUIRED_SYSTEM_ID = "pf2e";

/** Scene flag key holding the vision cap: `flags.<MODULE_ID>.visionRange`. */
export const FLAG_KEY = "visionRange";

/** Full form-field / update path for the scene flag. */
export const FLAG_PATH = `flags.${MODULE_ID}.${FLAG_KEY}`;

/** Localization prefix for lang/en.json keys. */
export const I18N = "PF2E_SCENE_VISION";
