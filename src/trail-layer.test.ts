import { describe, expect, it } from "vitest";
import {
  LayerConfigurationError,
  validateTrailLayerSchema,
  type TrailLayerSchema,
} from "./trail-layer";

const config = {
  nameField: "trail_name",
  difficultyField: "difficulty",
};

const validLayer: TrailLayerSchema = {
  fields: [
    { name: "OBJECTID", type: "oid", editable: false },
    { name: "trail_name", type: "string", editable: true },
    {
      name: "difficulty",
      type: "integer",
      editable: true,
      domain: {
        type: "coded-value",
        codedValues: [
          { name: "Easy", code: 1 },
          { name: "Hard", code: 2 },
        ],
      },
    },
  ],
  objectIdField: "OBJECTID",
  capabilities: {
    operations: { supportsQuery: true, supportsUpdate: true },
  },
};

describe("validateTrailLayerSchema", () => {
  it("accepts a queryable layer with editable configured fields and a typed coded domain", () => {
    expect(() => validateTrailLayerSchema(validLayer, config)).not.toThrow();
  });

  it.each([
    [
      {
        ...validLayer,
        fields: Array.from(validLayer.fields).filter(
          (field) => field.name !== "trail_name",
        ),
      },
      /name field/,
    ],
    [
      {
        ...validLayer,
        fields: Array.from(validLayer.fields).map((field) =>
          field.name === "difficulty" ? { ...field, editable: false } : field,
        ),
      },
      /difficulty field/,
    ],
    [
      {
        ...validLayer,
        fields: Array.from(validLayer.fields).map((field) =>
          field.name === "difficulty" ? { ...field, domain: null } : field,
        ),
      },
      /coded-value domain/,
    ],
    [
      {
        ...validLayer,
        fields: Array.from(validLayer.fields).map((field) =>
          field.name === "difficulty"
            ? {
                ...field,
                domain: {
                  type: "coded-value",
                  codedValues: [{ name: "Easy", code: "1" }],
                },
              }
            : field,
        ),
      },
      /code incompatible/,
    ],
    [
      {
        ...validLayer,
        capabilities: {
          operations: { supportsQuery: true, supportsUpdate: false },
        },
      },
      /querying and updating/,
    ],
    [{ ...validLayer, objectIdField: "" }, /object ID/],
    [
      { ...validLayer, subtypeField: "trail_type" },
      /Subtype-specific/,
    ],
    [
      {
        ...validLayer,
        typeIdField: "trail_type",
        types: [{ id: "easy", domains: {} }],
      },
      /feature types/i,
    ],
  ])("rejects incompatible layer metadata", (layer, message) => {
    expect(() =>
      validateTrailLayerSchema(layer as TrailLayerSchema, config),
    ).toThrow(LayerConfigurationError);
    expect(() =>
      validateTrailLayerSchema(layer as TrailLayerSchema, config),
    ).toThrow(message);
  });

  it("accepts feature types that exactly match the difficulty field domain", () => {
    const layer: TrailLayerSchema = {
      ...validLayer,
      typeIdField: "difficulty",
      types: [
        { id: 1, domains: {} },
        { id: 2, domains: {} },
      ],
    };
    expect(() => validateTrailLayerSchema(layer, config)).not.toThrow();
  });

  it("accepts string feature types configured like the published trail layer", () => {
    const codes = ["0", "1", "2", "3", "4", "5"];
    const layer: TrailLayerSchema = {
      ...validLayer,
      fields: [
        { name: "OBJECTID", type: "oid", editable: false },
        { name: "trail_name", type: "string", editable: true },
        {
          name: "difficulty",
          type: "string",
          editable: true,
          domain: {
            type: "coded-value",
            codedValues: codes.map((code) => ({
              name: `Difficulty ${code}`,
              code,
            })),
          },
        },
      ],
      typeIdField: "difficulty",
      types: codes.map((id) => ({ id, domains: {} })),
    };
    expect(() => validateTrailLayerSchema(layer, config)).not.toThrow();
  });

  it("rejects missing feature types and type-specific difficulty overrides", () => {
    const mismatchedTypes: TrailLayerSchema[] = [
      {
        ...validLayer,
        typeIdField: "difficulty",
        types: [{ id: 1, domains: {} }],
      },
      {
        ...validLayer,
        typeIdField: "difficulty",
        types: [
          { id: 1, domains: {} },
          {
            id: 2,
            domains: {
              difficulty: {
                type: "coded-value",
                codedValues: [{ name: "Very hard", code: 2 }],
              },
            },
          },
        ],
      },
    ];

    for (const layer of mismatchedTypes) {
      expect(() => validateTrailLayerSchema(layer, config)).toThrow(
        /feature types/i,
      );
    }
  });
});
