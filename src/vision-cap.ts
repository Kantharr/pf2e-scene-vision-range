// Pure vision-capping logic (no Foundry globals) so it can be unit-tested.

/** One entry of TokenDocument#detectionModes (keyed by detection mode id). */
export interface DetectionModeData {
  enabled?: boolean;
  /** Range in scene units. null/undefined means unlimited. */
  range?: number | null;
}

/**
 * TokenDocument#detectionModes. Foundry v14 keys them by mode id; v12 and v13
 * use an array of `{id, enabled, range}` entries.
 */
export type DetectionModes =
  | Record<string, DetectionModeData | undefined>
  | Array<(DetectionModeData & { id?: string }) | undefined>;

/** The parts of TokenDocument#sight this module touches. */
export interface SightData {
  enabled?: boolean;
  /** Range in scene units. null/undefined means unlimited. */
  range?: number | null;
}

/**
 * Turn a stored/submitted scene flag value into a usable cap.
 * Anything that is not a finite number greater than zero means "no cap".
 */
export function parseVisionRange(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** min() that treats null/undefined as unlimited (Infinity). */
function capRange(range: number | null | undefined, cap: number): number {
  return Math.min(range ?? Infinity, cap);
}

/**
 * Cap a token's sight radius and every sight-type detection mode at `cap`.
 * Ranges already shorter than the cap are left alone, and non-sight senses
 * (hearing, tremorsense, etc.) are never touched. Mutates in place.
 *
 * @param isSightMode Returns true for detection mode ids that depend on sight
 *   (core: lightPerception, basicSight, seeInvisibility, seeAll).
 */
export function capVision(
  sight: SightData,
  detectionModes: DetectionModes,
  cap: number,
  isSightMode: (id: string) => boolean,
): void {
  sight.range = capRange(sight.range, cap);
  const entries: Array<[string, DetectionModeData | undefined]> = Array.isArray(detectionModes)
    ? detectionModes.map((mode) => [mode?.id ?? "", mode])
    : Object.entries(detectionModes);
  for (const [id, mode] of entries) {
    if (!mode || !isSightMode(id)) continue;
    mode.range = capRange(mode.range, cap);
  }
}
