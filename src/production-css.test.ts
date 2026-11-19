import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";

describe("production Calcite styles", () => {
  it("preserves light and dark color tokens", async () => {
    const result = await build({
      configFile: fileURLToPath(new URL("../vite.config.ts", import.meta.url)),
      build: {
        write: false,
        rollupOptions: {
          input: createRequire(import.meta.url).resolve("@esri/calcite-components/main.css"),
        },
      },
      logLevel: "silent",
    });
    const builds = Array.isArray(result) ? result : [result];
    const css = builds.flatMap((item) => {
      if (!("output" in item)) {
        throw new Error("Expected a production build, not a watcher.");
      }
      return item.output;
    })
        .flatMap((item) =>
          item.type === "asset" && item.fileName.endsWith(".css")
            ? [item.source.toString()]
            : [],
        )
      .join("\n");

    expect(css).toMatch(/--calcite-color-background:\s*light-dark\(/);
    expect(css).toMatch(/--calcite-color-foreground-1:\s*light-dark\(/);
  });
});
