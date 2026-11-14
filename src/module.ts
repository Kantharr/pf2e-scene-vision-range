import { FLAG_KEY, FLAG_PATH, MODULE_ID } from "./constants.js";
import { capVision, parseVisionRange, type DetectionModeData, type SightData } from "./vision-cap.js";
import { injectVisionRangeField } from "./scene-config.js";

// Minimal shapes for the Foundry objects this module touches. fvtt-types is
// still on v13 betas, so these stay deliberately loose.
interface SceneLike {
  flags?: Record<string, Record<string, unknown> | undefined>;
  tokens: Iterable<TokenDocLike>;
  isView?: boolean;
}

interface TokenDocLike {
  parent?: SceneLike | null;
  actor?: { hasPlayerOwner?: boolean } | null;
  sight: SightData;
  detectionModes: Record<string, DetectionModeData | undefined>;
  reset(): void;
}

interface TokenPlaceableLike {
  initializeVisionSource(): void;
}

type AnyFn = (...args: unknown[]) => unknown;

/** Untyped handles to Foundry globals (fvtt-types models v13, we run on v14). */
const fvtt = {
  get config() {
    return CONFIG as unknown as {
      Token: { documentClass: { prototype: Record<string, unknown> } };
      Canvas: { detectionModes: Record<string, { type?: number } | undefined> };
    };
  },
  get canvas() {
    return (globalThis as { canvas?: unknown }).canvas as
      | {
          ready?: boolean;
          scene?: SceneLike | null;
          tokens?: { placeables: TokenPlaceableLike[] };
          perception?: { update(flags: Record<string, boolean>): void };
        }
      | undefined;
  },
  get utils() {
    return foundry.utils as unknown as {
      hasProperty(obj: object, key: string): boolean;
      getProperty(obj: object, key: string): unknown;
      setProperty(obj: object, key: string, value: unknown): boolean;
    };
  },
};

/** The scene's vision cap, or null when none is set. */
function getSceneCap(scene: SceneLike | null | undefined): number | null {
  return parseVisionRange(scene?.flags?.[MODULE_ID]?.[FLAG_KEY]);
}

let sightType: number | undefined;

/** True for detection modes that depend on sight (light perception, darkvision, see invisibility, ...). */
function isSightMode(id: string): boolean {
  sightType ??=
    (foundry as unknown as {
      canvas?: { perception?: { DetectionMode?: { DETECTION_TYPES?: { SIGHT?: number } } } };
    }).canvas?.perception?.DetectionMode?.DETECTION_TYPES?.SIGHT ?? 0;
  return fvtt.config.Canvas.detectionModes[id]?.type === sightType;
}

/**
 * Runs after TokenDocument#prepareData (which includes PF2e's rules-based
 * vision and token active effects), so the cap is the last word on range.
 */
function applySceneVisionCap(token: TokenDocLike): void {
  try {
    const cap = getSceneCap(token.parent);
    if (cap === null) return;
    // game.users may not exist yet during the very first world data pass;
    // the canvasInit hook re-prepares the viewed scene's tokens afterwards.
    if (!game.users || !token.actor?.hasPlayerOwner) return;
    capVision(token.sight, token.detectionModes, cap, isSightMode);
  } catch (err) {
    console.error(`${MODULE_ID} | failed to apply vision cap`, err);
  }
}

function wrapTokenPrepareData(): void {
  const target = "CONFIG.Token.documentClass.prototype.prepareData";
  const libWrapper = (globalThis as {
    libWrapper?: { register(id: string, target: string, fn: AnyFn, type: string): void };
  }).libWrapper;

  if (game.modules?.get("lib-wrapper")?.active && libWrapper) {
    libWrapper.register(
      MODULE_ID,
      target,
      function (this: TokenDocLike, wrapped: unknown, ...args: unknown[]) {
        const result = (wrapped as AnyFn)(...args);
        applySceneVisionCap(this);
        return result;
      } as AnyFn,
      "WRAPPER",
    );
    return;
  }

  const proto = fvtt.config.Token.documentClass.prototype;
  const original = proto.prepareData as AnyFn;
  proto.prepareData = function (this: TokenDocLike, ...args: unknown[]) {
    const result = original.apply(this, args);
    applySceneVisionCap(this);
    return result;
  };
}

/** Re-prepare a scene's tokens and, if it is on screen, rebuild vision. */
function refreshSceneVision(scene: SceneLike): void {
  for (const token of scene.tokens) token.reset();
  const canvas = fvtt.canvas;
  if (!scene.isView || !canvas?.ready) return;
  for (const placeable of canvas.tokens?.placeables ?? []) placeable.initializeVisionSource();
  canvas.perception?.update({ initializeVision: true, initializeLighting: true, refreshVision: true });
}

type LooseHook = (hook: string, fn: (...args: unknown[]) => unknown) => number;
// Bind to Hooks: Hooks.on is a static method that relies on `this`, so an
// unbound reference throws on the first call and no hooks get registered.
const on = (Hooks.on as unknown as LooseHook).bind(Hooks);

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | init`);
  wrapTokenPrepareData();
});

// Add the field to the Pathfinder tab of Configure Scene. AppV2 fires a
// render hook for every class in the chain, so this catches SceneConfigPF2e.
on("renderSceneConfig", (app, element) => injectVisionRangeField(app, element));

// Normalize whatever the form submitted: blank/zero/negative -> null (no cap).
on("preUpdateScene", (_scene, changes) => {
  if (!changes || typeof changes !== "object") return;
  if (!fvtt.utils.hasProperty(changes, FLAG_PATH)) return;
  fvtt.utils.setProperty(changes, FLAG_PATH, parseVisionRange(fvtt.utils.getProperty(changes, FLAG_PATH)));
});

// Apply a changed cap immediately for everyone viewing the scene.
on("updateScene", (scene, changes) => {
  if (!changes || typeof changes !== "object") return;
  if (!fvtt.utils.hasProperty(changes, `flags.${MODULE_ID}`)) return;
  refreshSceneVision(scene as SceneLike);
});

// Tokens prepared before game.users existed skipped the ownership check, so
// re-prepare the scene's tokens right before the canvas draws it.
on("canvasInit", (canvas) => {
  const scene = (canvas as { scene?: SceneLike | null }).scene;
  if (!scene || getSceneCap(scene) === null) return;
  for (const token of scene.tokens) token.reset();
});
