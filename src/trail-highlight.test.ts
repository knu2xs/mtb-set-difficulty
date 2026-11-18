import { describe, expect, it } from "vitest";
import Graphic from "@arcgis/core/Graphic.js";
import Polyline from "@arcgis/core/geometry/Polyline.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";
import { TrailHighlight } from "./trail-highlight";

function trail(x: number): Graphic {
  return new Graphic({
    geometry: new Polyline({ paths: [[[x, 0], [x, 1]]] }),
    attributes: { OBJECTID: x },
  });
}

describe("TrailHighlight", () => {
  it("draws a distinct line on the selected trail without changing its graphic", () => {
    const selection = new TrailHighlight();
    const feature = trail(1);
    selection.show(feature);

    expect(selection.layer.graphics.length).toBe(2);
    const [outline, line] = selection.layer.graphics.toArray();
    expect(outline.geometry).not.toBe(feature.geometry);
    expect(outline.geometry?.toJSON()).toEqual(feature.geometry?.toJSON());
    if (!(line.symbol instanceof SimpleLineSymbol) || !line.symbol.color) {
      throw new Error("Expected a colored simple line symbol.");
    }
    expect(line.symbol.color.toHex()).toBe("#d000a8");
    expect(feature.symbol).toBeNull();
    expect(feature.attributes).toEqual({ OBJECTID: 1 });
  });

  it("replaces the highlight on a new selection and clears it", () => {
    const selection = new TrailHighlight();
    selection.show(trail(1));
    const next = trail(2);
    selection.show(next);
    expect(selection.layer.graphics.length).toBe(2);
    expect(selection.layer.graphics.getItemAt(1)?.geometry?.toJSON()).toEqual(
      next.geometry?.toJSON(),
    );
    selection.clear();
    expect(selection.layer.graphics.length).toBe(0);
  });

  it("reports missing geometry without removing the previous highlight", () => {
    const selection = new TrailHighlight();
    selection.show(trail(1));
    expect(() => selection.show(new Graphic())).toThrow(/line geometry/);
    expect(selection.layer.graphics.length).toBe(2);
  });
});
