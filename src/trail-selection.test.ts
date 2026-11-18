import { describe, expect, it } from "vitest";
import { firstTrailFeature } from "./trail-selection";

describe("firstTrailFeature", () => {
  it("returns the first graphic hit", () => {
    const trail = { id: 12 };
    expect(
      firstTrailFeature([
        { type: "media", graphic: null },
        { type: "graphic", graphic: trail },
        { type: "graphic", graphic: { id: 13 } },
      ]),
    ).toBe(trail);
  });

  it("returns null when the hit test has no trail graphics", () => {
    expect(
      firstTrailFeature([
        { type: "media", graphic: null },
        { type: "graphic", graphic: null },
      ]),
    ).toBeNull();
    expect(firstTrailFeature([])).toBeNull();
  });
});
