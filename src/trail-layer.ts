import type { AppConfig } from "./config";

export interface TrailFieldSchema {
  name: string;
  type: string;
  editable: boolean;
  length?: number | null;
  domain?: {
    type: string;
    codedValues?: readonly { name?: unknown; code?: unknown }[];
  } | null;
}

export interface TrailLayerSchema {
  fields: Iterable<TrailFieldSchema>;
  objectIdField: string;
  subtypeField?: string | null;
  subtypes?: readonly unknown[] | null;
  typeIdField?: string | null;
  types?: readonly TrailFeatureTypeSchema[] | null;
  capabilities?: {
    operations?: {
      supportsQuery?: boolean;
      supportsUpdate?: boolean;
    };
  } | null;
}

export interface TrailFeatureTypeSchema {
  id: unknown;
  domains?: Record<string, TrailFieldSchema["domain"]> | null;
}

export interface DifficultyChoice {
  label: string;
  code: string | number;
  token: string;
}

const numericFieldTypes = new Set([
  "small-integer",
  "integer",
  "long",
  "big-integer",
  "single",
  "double",
]);

export class LayerConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LayerConfigurationError";
  }
}

export function getDifficultyChoices(
  field: TrailFieldSchema,
): DifficultyChoice[] {
  const domain = field.domain;
  if (!domain || domain.type !== "coded-value" || !domain.codedValues?.length) {
    throw new LayerConfigurationError(
      `The configured difficulty field "${field.name}" must have a coded-value domain.`,
    );
  }

  const choices = domain.codedValues.map(({ name, code }) => {
    if (typeof name !== "string" || name.trim() === "") {
      throw new LayerConfigurationError(
        `The coded-value domain for "${field.name}" has an empty label.`,
      );
    }

    if (field.type === "string" && typeof code === "string") {
      return {
        label: name,
        code,
        token: `string:${code}`,
      };
    }
    if (
      numericFieldTypes.has(field.type) &&
      typeof code === "number" &&
      Number.isFinite(code)
    ) {
      return {
        label: name,
        code,
        token: `number:${String(code)}`,
      };
    }
    throw new LayerConfigurationError(
      `The coded-value domain for "${field.name}" has a code incompatible with its field type.`,
    );
  });

  if (new Set(choices.map((choice) => choice.token)).size !== choices.length) {
    throw new LayerConfigurationError(
      `The coded-value domain for "${field.name}" contains duplicate codes.`,
    );
  }
  return choices;
}

export function formatDifficulty(
  value: unknown,
  choices: readonly DifficultyChoice[],
): string {
  if (value == null) {
    return "Not set";
  }
  return (
    choices.find((choice) => choice.code === value)?.label ??
    `Unrecognized value (${String(value)})`
  );
}

export function validateTrailLayerSchema(
  layer: TrailLayerSchema,
  config: Pick<AppConfig, "nameField" | "difficultyField">,
): void {
  const fields = Array.from(layer.fields);
  const nameField = fields.find(
    (field) => field.name === config.nameField,
  );
  const difficultyField = fields.find(
    (field) => field.name === config.difficultyField,
  );
  const objectIdField = fields.find(
    (field) => field.name === layer.objectIdField,
  );

  if (!nameField || nameField.type !== "string" || !nameField.editable) {
    throw new LayerConfigurationError(
      `The configured name field "${config.nameField}" must exist as an editable text field.`,
    );
  }
  if (
    !difficultyField ||
    (!numericFieldTypes.has(difficultyField.type) &&
      difficultyField.type !== "string") ||
    !difficultyField.editable
  ) {
    throw new LayerConfigurationError(
      `The configured difficulty field "${config.difficultyField}" must exist as an editable text or numeric field.`,
    );
  }
  getDifficultyChoices(difficultyField);
  if (!layer.objectIdField || !objectIdField) {
    throw new LayerConfigurationError(
      "The trail layer does not expose a usable object ID field.",
    );
  }
  if (
    layer.capabilities?.operations?.supportsQuery !== true ||
    layer.capabilities.operations.supportsUpdate !== true
  ) {
    throw new LayerConfigurationError(
      "The trail layer must support querying and updating existing features.",
    );
  }
  if (layer.subtypeField || (layer.subtypes?.length ?? 0) > 0) {
    throw new LayerConfigurationError(
      "Subtype-specific difficulty domains are not supported. Configure a layer with a field-level difficulty domain.",
    );
  }
  if (layer.types?.length) {
    const typeCodes = layer.types.map((type) => type.id);
    const validTypeCodes = typeCodes.filter(
      (code): code is string | number =>
        typeof code === "string" ||
        (typeof code === "number" && Number.isFinite(code)),
    );
    const choiceCodes = getDifficultyChoices(difficultyField).map(
      (choice) => choice.code,
    );
    const hasInvalidTypeCode =
      validTypeCodes.length !== typeCodes.length ||
      validTypeCodes.some((code) => !choiceCodes.includes(code));
    if (
      layer.typeIdField !== config.difficultyField ||
      hasInvalidTypeCode ||
      choiceCodes.some((code) => !typeCodes.includes(code)) ||
      new Set(validTypeCodes).size !== typeCodes.length ||
      layer.types.some(
        (type) =>
          type.domains != null &&
          Object.hasOwn(type.domains, config.difficultyField),
      )
    ) {
      throw new LayerConfigurationError(
        `Feature types are supported only when "${config.difficultyField}" is the type ID field, every type ID matches its coded-value domain, and no type-specific difficulty domain overrides exist.`,
      );
    }
  }
}
