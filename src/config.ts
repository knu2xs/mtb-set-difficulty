export interface AppExtent {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  wkid: number;
}

export interface AppConfig {
  trailLayerUrl: string;
  nameField: string;
  difficultyField: string;
  initialExtent?: AppExtent;
  basemapWebMapItemId: string;
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = config[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new ConfigurationError(`Set "${key}" in public/app-config.json.`);
  }
  if (/placeholder|replace_with/i.test(value)) {
    throw new ConfigurationError(
      `Replace the placeholder value for "${key}" in public/app-config.json.`,
    );
  }
  return value.trim();
}

function parseExtent(value: unknown): AppExtent | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new ConfigurationError(
      '"initialExtent" must contain xmin, ymin, xmax, ymax, and wkid.',
    );
  }

  const { xmin, ymin, xmax, ymax, wkid } = value;
  if (
    typeof xmin !== "number" ||
    typeof ymin !== "number" ||
    typeof xmax !== "number" ||
    typeof ymax !== "number" ||
    typeof wkid !== "number" ||
    ![xmin, ymin, xmax, ymax, wkid].every(Number.isFinite) ||
    xmin >= xmax ||
    ymin >= ymax ||
    !Number.isInteger(wkid) ||
    wkid <= 0
  ) {
    throw new ConfigurationError(
      '"initialExtent" must have finite coordinates in increasing order and a positive integer wkid.',
    );
  }

  return { xmin, ymin, xmax, ymax, wkid };
}

export function parseAppConfig(value: unknown): AppConfig {
  if (!isRecord(value)) {
    throw new ConfigurationError(
      "Application configuration must be a JSON object.",
    );
  }

  const trailLayerUrl = requiredText(value, "trailLayerUrl");
  let url: URL;
  try {
    url = new URL(trailLayerUrl);
  } catch {
    throw new ConfigurationError(
      '"trailLayerUrl" must be a valid HTTPS feature layer URL.',
    );
  }
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== ""
  ) {
    throw new ConfigurationError(
      '"trailLayerUrl" must be an HTTPS URL without embedded credentials or query parameters.',
    );
  }

  const nameField = requiredText(value, "nameField");
  const difficultyField = requiredText(value, "difficultyField");
  if (nameField.toLowerCase() === difficultyField.toLowerCase()) {
    throw new ConfigurationError(
      '"nameField" and "difficultyField" must refer to different fields.',
    );
  }

  const basemapWebMapItemId = requiredText(value, "basemapWebMapItemId");
  if (!/^[\da-f]{32}$/i.test(basemapWebMapItemId)) {
    throw new ConfigurationError(
      '"basemapWebMapItemId" must be a 32-character ArcGIS item ID.',
    );
  }

  return {
    trailLayerUrl,
    nameField,
    difficultyField,
    initialExtent: parseExtent(value.initialExtent),
    basemapWebMapItemId,
  };
}

export async function loadAppConfig(
  fetcher: typeof fetch = fetch,
): Promise<AppConfig> {
  const response = await fetcher(`${import.meta.env.BASE_URL}app-config.json`);
  if (!response.ok) {
    throw new ConfigurationError(
      `Could not load public/app-config.json (HTTP ${response.status}).`,
    );
  }
  return parseAppConfig(await response.json());
}
