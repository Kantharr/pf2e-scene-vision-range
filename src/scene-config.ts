import { FLAG_KEY, FLAG_PATH, I18N, MODULE_ID, REQUIRED_SYSTEM_ID } from "./constants.js";
import { parseVisionRange } from "./vision-cap.js";

interface SceneConfigLike {
  id?: string;
  /** ApplicationV1 (Foundry v12) only. */
  setPosition?: (position: { height: "auto" }) => unknown;
  document?: {
    id?: string;
    flags?: Record<string, Record<string, unknown> | undefined>;
    grid?: { units?: string };
  };
}

function localize(key: string): string {
  return game.i18n?.localize(`${I18N}.${key}`) ?? key;
}

function format(key: string, data: Record<string, string>): string {
  return game.i18n?.format(`${I18N}.${key}`, data) ?? key;
}

/**
 * Insert the "Player Vision Range" field into PF2e's Pathfinder tab of the
 * scene config, right after the system's Hearing Range field. Re-renders of
 * the tab replace its DOM, and this runs again on each render hook.
 *
 * Foundry v13+ (ApplicationV2) passes an HTMLElement; v12 (ApplicationV1)
 * passes a jQuery object wrapping the window.
 */
export function injectVisionRangeField(app: unknown, html: unknown): void {
  const isJQuery = !(html instanceof HTMLElement);
  const element = isJQuery ? (html as { [index: number]: unknown } | null)?.[0] : html;
  if (!(element instanceof HTMLElement)) return;
  const sheet = app as SceneConfigLike;
  const scene = sheet.document;
  if (!scene) return;

  const tab = element.querySelector<HTMLElement>(`section.tab[data-tab="${REQUIRED_SYSTEM_ID}"]`);
  if (!tab) return;
  if (tab.querySelector(`[name="${FLAG_PATH}"]`)) return; // already added this render

  const rootId = sheet.id ?? `scene-config-${scene.id ?? "new"}`;
  const inputId = `${rootId}-${MODULE_ID}-vision-range`;
  const units = scene.grid?.units?.trim() ?? "";
  const current = parseVisionRange(scene.flags?.[MODULE_ID]?.[FLAG_KEY]);

  const group = document.createElement("div");
  group.className = "form-group";

  const label = document.createElement("label");
  label.htmlFor = inputId;
  label.textContent = units ? format("Field.LabelUnits", { units }) : localize("Field.Label");

  const fields = document.createElement("div");
  fields.className = "form-fields";

  const input = document.createElement("input");
  input.type = "number";
  input.id = inputId;
  input.name = FLAG_PATH;
  input.min = "0";
  input.step = "any";
  input.placeholder = localize("Field.Unlimited");
  if (current !== null) input.value = String(current);
  fields.append(input);

  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = localize("Field.Hint");

  group.append(label, fields, hint);

  const hearing = tab.querySelector(`[name="flags.${REQUIRED_SYSTEM_ID}.hearingRange"]`)?.closest(".form-group");
  if (hearing) hearing.after(group);
  else tab.append(group);

  // v12 sizes the window before render hooks run; grow it if this tab is showing.
  if (isJQuery && tab.classList.contains("active")) sheet.setPosition?.({ height: "auto" });
}
