import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConfigurationError,
  loadAppConfig,
  parseAppConfig,
} from "./config";

const validConfig = {
  trailLayerUrl:
    "https://services.arcgis.com/example/arcgis/rest/services/Trails/FeatureServer/0",
  nameField: "trail_name",
  difficultyField: "difficulty",
  basemapWebMapItemId: "3f3c0b87711c43808af22754914f2b99",
};

describe("parseAppConfig", () => {
  it("accepts a valid public layer configuration", () => {
    expect(parseAppConfig(validConfig)).toEqual({
      ...validConfig,
      initialExtent: undefined,
    });
  });

  it("accepts an optional valid extent", () => {
    expect(
      parseAppConfig({
        ...validConfig,
        initialExtent: {
          xmin: -123,
          ymin: 40,
          xmax: -121,
          ymax: 42,
          wkid: 4326,
        },
      }).initialExtent,
    ).toEqual({
      xmin: -123,
      ymin: 40,
      xmax: -121,
      ymax: 42,
      wkid: 4326,
    });
  });

  it.each([
    [{ ...validConfig, trailLayerUrl: "" }, /trailLayerUrl/],
    [
      { ...validConfig, trailLayerUrl: "http://services.arcgis.com/layer" },
      /HTTPS/,
    ],
    [
      {
        ...validConfig,
        trailLayerUrl:
          "https://services.arcgis.com/REPLACE_WITH_ORG/FeatureServer/0",
      },
      /placeholder/i,
    ],
    [{ ...validConfig, nameField: " " }, /nameField/],
    [
      { ...validConfig, difficultyField: "TRAIL_NAME" },
      /different fields/,
    ],
    [
      {
        ...validConfig,
        initialExtent: {
          xmin: 3,
          ymin: 0,
          xmax: 1,
          ymax: 2,
          wkid: 4326,
        },
      },
      /initialExtent/,
    ],
    [
      { ...validConfig, basemapWebMapItemId: "osm" },
      /32-character ArcGIS item ID/,
    ],
  ])("rejects invalid configuration", (config, message) => {
    expect(() => parseAppConfig(config)).toThrow(message);
  });
});

describe("loadAppConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["/", "/mtb-set-difficulty/"])("loads the public JSON configuration under %s", async (base) => {
    vi.stubEnv("BASE_URL", base);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(validConfig), { status: 200 }),
    );

    await expect(loadAppConfig(fetcher)).resolves.toMatchObject(validConfig);
    expect(fetcher).toHaveBeenCalledWith(`${base}app-config.json`);
  });

  it("reports a missing configuration file", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("", { status: 404 }),
    );

    await expect(loadAppConfig(fetcher)).rejects.toThrow(ConfigurationError);
    await expect(loadAppConfig(fetcher)).rejects.toThrow(/HTTP 404/);
  });
});
