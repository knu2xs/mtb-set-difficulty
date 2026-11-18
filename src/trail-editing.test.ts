import { describe, expect, it, vi } from "vitest";
import {
  assertUpdateSucceeded,
  buildAttributeUpdate,
  checkTrailFreshness,
  formatDifficulty,
  getDifficultyChoices,
  SubmissionLock,
  submitAttributeUpdate,
  TrailValidationError,
  TrailUpdateError,
  validateDifficultyToken,
  validateTrailName,
} from "./trail-editing";
import type { TrailFieldSchema } from "./trail-layer";

describe("difficulty domain helpers", () => {
  it("uses string codes without converting their type", () => {
    const choices = getDifficultyChoices({
      name: "difficulty",
      type: "string",
      editable: true,
      domain: {
        type: "coded-value",
        codedValues: [{ name: "Intermediate", code: "IM" }],
      },
    });

    expect(choices[0]).toMatchObject({
      label: "Intermediate",
      code: "IM",
      token: "string:IM",
    });
    expect(validateDifficultyToken(choices[0].token, choices).code).toBe("IM");
  });

  it("preserves numeric codes and rejects a string token as a numeric code", () => {
    const choices = getDifficultyChoices({
      name: "difficulty",
      type: "integer",
      editable: true,
      domain: {
        type: "coded-value",
        codedValues: [{ name: "Easy", code: 1 }],
      },
    });

    expect(choices[0].code).toBe(1);
    expect(typeof choices[0].code).toBe("number");
    expect(() => validateDifficultyToken("string:1", choices)).toThrow(
      TrailValidationError,
    );
  });

  it.each([
    [null, "Not set"],
    [99, "Unrecognized value (99)"],
    [1, "Easy"],
  ])("formats current values without treating legacy values as a choice", (value, label) => {
    const choices = getDifficultyChoices({
      name: "difficulty",
      type: "integer",
      editable: true,
      domain: {
        type: "coded-value",
        codedValues: [{ name: "Easy", code: 1 }],
      },
    });
    expect(formatDifficulty(value, choices)).toBe(label);
  });

  it("rejects malformed or duplicate domain values", () => {
    const invalidFields: TrailFieldSchema[] = [
      {
        name: "difficulty",
        type: "integer",
        editable: true,
        domain: {
          type: "coded-value",
          codedValues: [{ name: "", code: 1 }],
        },
      },
      {
        name: "difficulty",
        type: "integer",
        editable: true,
        domain: {
          type: "coded-value",
          codedValues: [
            { name: "Easy", code: 1 },
            { name: "Beginner", code: 1 },
          ],
        },
      },
    ];

    for (const field of invalidFields) {
      expect(() => getDifficultyChoices(field)).toThrow();
    }
  });
});

describe("validateTrailName", () => {
  it("trims valid names", () => {
    expect(validateTrailName("  Pine Loop  ", 20)).toBe("Pine Loop");
  });

  it("rejects empty names and names over the service field length", () => {
    expect(() => validateTrailName("  ")).toThrow(/trail name/i);
    expect(() => validateTrailName("Long trail", 5)).toThrow(/5 characters/);
  });
});

describe("buildAttributeUpdate", () => {
  const choices = getDifficultyChoices({
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
  });
  const baseInput = {
    objectIdField: "OBJECTID",
    objectId: 7,
    nameField: "trail_name",
    difficultyField: "difficulty",
    originalName: "Creek Loop",
    originalDifficulty: 1,
    nameValue: "Creek Loop",
    difficultyToken: choices[0].token,
    difficultyChoices: choices,
  };

  it("sends only changed fields plus the object ID and never includes geometry", () => {
    expect(
      buildAttributeUpdate({
        ...baseInput,
        nameValue: "  Creekside Loop ",
        difficultyToken: choices[1].token,
      }),
    ).toEqual({
      OBJECTID: 7,
      trail_name: "Creekside Loop",
      difficulty: 2,
    });
  });

  it("does not include unchanged fields or emit an update when nothing changed", () => {
    expect(
      buildAttributeUpdate({
        ...baseInput,
        difficultyToken: "",
      }),
    ).toBeNull();
    expect(
      buildAttributeUpdate({
        ...baseInput,
        nameValue: "Creekside Loop",
        difficultyToken: choices[0].token,
      }),
    ).toEqual({
      OBJECTID: 7,
      trail_name: "Creekside Loop",
    });
  });

  it("leaves an unrecognized existing difficulty unchanged for a name-only edit", () => {
    expect(
      buildAttributeUpdate({
        ...baseInput,
        originalDifficulty: 99,
        difficultyToken: "",
        nameValue: "New Creek Loop",
      }),
    ).toEqual({
      OBJECTID: 7,
      trail_name: "New Creek Loop",
    });
  });

  it("reports successful saves only after a successful individual result", async () => {
    const applyUpdate = vi.fn().mockResolvedValue({
      updateFeatureResults: [{}],
    });

    await expect(
      submitAttributeUpdate(
        { ...baseInput, nameValue: "Creekside Loop" },
        applyUpdate,
      ),
    ).resolves.toBe(true);
    expect(applyUpdate).toHaveBeenCalledWith({
      OBJECTID: 7,
      trail_name: "Creekside Loop",
    });
  });

  it("skips unchanged values and propagates service and network failures", async () => {
    const applyUpdate = vi.fn();
    await expect(
      submitAttributeUpdate(
        { ...baseInput, difficultyToken: "" },
        applyUpdate,
      ),
    ).resolves.toBe(false);
    expect(applyUpdate).not.toHaveBeenCalled();

    await expect(
      submitAttributeUpdate(
        { ...baseInput, nameValue: "Creekside Loop" },
        async () => ({
          updateFeatureResults: [
            { error: { message: "Field is read-only." } },
          ],
        }),
      ),
    ).rejects.toThrow(/Field is read-only/);
    await expect(
      submitAttributeUpdate(
        { ...baseInput, nameValue: "Creekside Loop" },
        async () => {
          throw new Error("Network unavailable.");
        },
      ),
    ).rejects.toThrow(/Network unavailable/);
  });
});

describe("assertUpdateSucceeded", () => {
  it("accepts exactly one successful edit result", () => {
    expect(() =>
      assertUpdateSucceeded({ updateFeatureResults: [{}] }),
    ).not.toThrow();
  });

  it("rejects missing, multiple, or failed edit results", () => {
    expect(() =>
      assertUpdateSucceeded({ updateFeatureResults: [] }),
    ).toThrow(TrailUpdateError);
    expect(() =>
      assertUpdateSucceeded({
        updateFeatureResults: [{}, {}],
      }),
    ).toThrow(/exactly one/);
    expect(() =>
      assertUpdateSucceeded({
        updateFeatureResults: [{ error: { message: "Field is read-only." } }],
      }),
    ).toThrow(/Field is read-only/);
  });
});

describe("SubmissionLock", () => {
  it("prevents a second save until the active save releases the lock", () => {
    const lock = new SubmissionLock();

    expect(lock.tryAcquire()).toBe(true);
    expect(lock.locked).toBe(true);
    expect(lock.tryAcquire()).toBe(false);
    lock.release();
    expect(lock.locked).toBe(false);
    expect(lock.tryAcquire()).toBe(true);
  });

  describe("checkTrailFreshness", () => {
    const original = { name: "Creek Loop", difficulty: 1 };

    it("reports conflicts and returns current values for reload/review", async () => {
      await expect(
        checkTrailFreshness(
          async () => ({ name: "Creekside Loop", difficulty: 2 }),
          original,
        ),
      ).resolves.toEqual({
        current: { name: "Creekside Loop", difficulty: 2 },
        changedFields: ["name", "difficulty"],
      });
    });

    it("reports no conflict when latest values match", async () => {
      await expect(
        checkTrailFreshness(async () => original, original),
      ).resolves.toEqual({ current: original, changedFields: [] });
    });

    it("propagates a failed re-query and rejects a missing trail", async () => {
      await expect(
        checkTrailFreshness(async () => {
          throw new Error("Network unavailable.");
        }, original),
      ).rejects.toThrow(/Network unavailable/);
      await expect(
        checkTrailFreshness(async () => null, original),
      ).rejects.toThrow(/no longer exists/);
    });
  });
});
