import Graphic from "@arcgis/core/Graphic.js";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol.js";

export class TrailHighlight {
  readonly layer = new GraphicsLayer({
    title: "Selected trail",
    listMode: "hide",
  });

  show(trail: Graphic): void {
    if (!trail.geometry || trail.geometry.type !== "polyline") {
      throw new Error("The selected trail has no usable line geometry.");
    }

    const geometry = trail.geometry.clone();
    const outline = new Graphic({
      geometry,
      symbol: new SimpleLineSymbol({ color: "#ffffff", width: "8px" }),
    });
    const highlight = new Graphic({
      geometry,
      symbol: new SimpleLineSymbol({ color: "#d000a8", width: "5px" }),
    });
    this.layer.removeAll();
    this.layer.addMany([outline, highlight]);
  }

  clear(): void {
    this.layer.removeAll();
  }
}
