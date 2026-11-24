import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Keyframe = { t: number };
type Prop = { a: 0 | 1; k: unknown };

const json = JSON.parse(readFileSync("public/lottie/signup-celebration.json", "utf8"));

describe("signup celebration Lottie file", () => {
  it("declares the Lottie header the player needs", () => {
    expect(json).toMatchObject({ v: expect.any(String), fr: 60, ip: 0, w: 400, h: 400 });
    expect(json.op).toBeGreaterThan(json.ip);
    expect(json.layers.length).toBeGreaterThan(10);
  });

  it("gives every layer a full transform and visible frame range", () => {
    for (const layer of json.layers) {
      expect(layer.ty, layer.nm).toBe(4);
      for (const key of ["o", "r", "p", "a", "s"]) expect(layer.ks[key], `${layer.nm}.${key}`).toBeDefined();
      expect(layer.op).toBeGreaterThan(layer.ip);
    }
  });

  it("orders keyframes in time and keeps them inside the animation", () => {
    for (const layer of json.layers) {
      for (const prop of Object.values(layer.ks) as Prop[]) {
        if (prop.a !== 1) continue;
        const times = (prop.k as Keyframe[]).map((frame) => frame.t);
        expect(times, layer.nm).toEqual([...times].sort((a, b) => a - b));
        expect(Math.max(...times)).toBeLessThanOrEqual(json.op);
      }
    }
  });

  it("ends every shape group with its transform, as the renderer expects", () => {
    for (const layer of json.layers) {
      for (const group of layer.shapes) {
        expect(group.ty).toBe("gr");
        expect(group.it.at(-1).ty, layer.nm).toBe("tr");
      }
    }
  });
});
