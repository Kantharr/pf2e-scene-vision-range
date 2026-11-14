import { describe, expect, it } from "vitest";
import { capVision, parseVisionRange, type DetectionModeData } from "./vision-cap.js";

const SIGHT_MODES = new Set(["lightPerception", "basicSight", "seeInvisibility", "seeAll"]);
const isSight = (id: string) => SIGHT_MODES.has(id);

describe("parseVisionRange", () => {
  it("accepts positive numbers", () => {
    expect(parseVisionRange(30)).toBe(30);
    expect(parseVisionRange(7.5)).toBe(7.5);
  });

  it("accepts numeric strings", () => {
    expect(parseVisionRange("60")).toBe(60);
  });

  it("treats empty, zero, negative, and junk as no cap", () => {
    for (const v of [null, undefined, "", "  ", 0, -5, Number.NaN, Infinity, "abc", {}, true]) {
      expect(parseVisionRange(v)).toBeNull();
    }
  });
});

describe("capVision", () => {
  it("caps unlimited darkvision and light perception (rules-based vision PC)", () => {
    const sight = { enabled: true, range: Infinity };
    const modes: Record<string, DetectionModeData> = {
      lightPerception: { enabled: true, range: Infinity },
      basicSight: { enabled: true, range: Infinity },
    };
    capVision(sight, modes, 30, isSight);
    expect(sight.range).toBe(30);
    expect(modes.lightPerception!.range).toBe(30);
    expect(modes.basicSight!.range).toBe(30);
  });

  it("leaves ranges already shorter than the cap alone", () => {
    const sight = { enabled: true, range: 0 };
    const modes: Record<string, DetectionModeData> = {
      lightPerception: { enabled: true, range: Infinity },
      basicSight: { enabled: true, range: 0 },
      seeInvisibility: { enabled: true, range: 10 },
    };
    capVision(sight, modes, 30, isSight);
    expect(sight.range).toBe(0);
    expect(modes.basicSight!.range).toBe(0);
    expect(modes.seeInvisibility!.range).toBe(10);
    expect(modes.lightPerception!.range).toBe(30);
  });

  it("treats null ranges as unlimited", () => {
    const sight = { enabled: true, range: null };
    const modes: Record<string, DetectionModeData> = { seeAll: { enabled: true, range: null } };
    capVision(sight, modes, 15, isSight);
    expect(sight.range).toBe(15);
    expect(modes.seeAll!.range).toBe(15);
  });

  it("does not touch non-sight senses", () => {
    const sight = { enabled: true, range: Infinity };
    const modes: Record<string, DetectionModeData> = {
      hearing: { enabled: true, range: Infinity },
      feelTremor: { enabled: true, range: 60 },
      basicSight: { enabled: true, range: Infinity },
    };
    capVision(sight, modes, 20, isSight);
    expect(modes.hearing!.range).toBe(Infinity);
    expect(modes.feelTremor!.range).toBe(60);
    expect(modes.basicSight!.range).toBe(20);
  });

  it("handles the v12/v13 array form with null meaning unlimited", () => {
    const sight = { enabled: true, range: null };
    const modes = [
      { id: "lightPerception", enabled: true, range: null },
      { id: "basicSight", enabled: true, range: null },
      { id: "seeInvisibility", enabled: true, range: null },
      { id: "feelTremor", enabled: true, range: 60 },
      { id: "hearing", enabled: true, range: null },
    ];
    capVision(sight, modes, 30, isSight);
    expect(sight.range).toBe(30);
    expect(modes.map((m) => [m.id, m.range])).toEqual([
      ["lightPerception", 30],
      ["basicSight", 30],
      ["seeInvisibility", 30],
      ["feelTremor", 60],
      ["hearing", null],
    ]);
  });

  it("is idempotent", () => {
    const sight = { enabled: true, range: Infinity };
    const modes: Record<string, DetectionModeData> = { lightPerception: { enabled: true, range: Infinity } };
    capVision(sight, modes, 30, isSight);
    capVision(sight, modes, 30, isSight);
    expect(sight.range).toBe(30);
    expect(modes.lightPerception!.range).toBe(30);
  });
});
