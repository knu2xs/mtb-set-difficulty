import type { DifficultyChoice } from "./trail-layer";

export { formatDifficulty, getDifficultyChoices } from "./trail-layer";

export class TrailValidationError extends Error {
  constructor(
    message: string,
    readonly field: "name" | "difficulty",
  ) {
    super(message);
    this.name = "TrailValidationError";
  }
}

export interface TrailUpdateInput {
  objectIdField: string;
  objectId: string | number;
  nameField: string;
  difficultyField: string;
  originalName: unknown;
  originalDifficulty: unknown;
  nameValue: string;
  maxNameLength?: number | null;
  difficultyToken: string;
  difficultyChoices: readonly DifficultyChoice[];
}

export interface TrailValues {
  name: unknown;
  difficulty: unknown;
}

export interface TrailFreshness {
  current: TrailValues;
  changedFields: readonly ("name" | "difficulty")[];
}

export class TrailUpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrailUpdateError";
  }
}

export async function checkTrailFreshness(
  readLatest: () => Promise<TrailValues | null>,
  original: TrailValues,
): Promise<TrailFreshness> {
  const current = await readLatest();
  if (!current) {
    throw new TrailUpdateError(
      "The selected trail no longer exists in the service.",
    );
  }
  const changedFields: ("name" | "difficulty")[] = [];
  if (!Object.is(current.name, original.name)) {
    changedFields.push("name");
  }
  if (!Object.is(current.difficulty, original.difficulty)) {
    changedFields.push("difficulty");
  }
  return { current, changedFields };
}

export function buildAttributeUpdate(
  input: TrailUpdateInput,
): Record<string, string | number> | null {
  if (
    input.objectIdField.trim() === "" ||
    (typeof input.objectId !== "string" &&
      typeof input.objectId !== "number") ||
    (typeof input.objectId === "number" && !Number.isFinite(input.objectId))
  ) {
    throw new TrailUpdateError("The selected trail has no valid object ID.");
  }
  const name = validateTrailName(input.nameValue, input.maxNameLength);
  const attributes: Record<string, string | number> = {
    [input.objectIdField]: input.objectId,
  };
  if (name !== input.originalName) {
    attributes[input.nameField] = name;
  }
  if (input.difficultyToken !== "") {
    const choice = validateDifficultyToken(
      input.difficultyToken,
      input.difficultyChoices,
    );
    if (choice.code !== input.originalDifficulty) {
      attributes[input.difficultyField] = choice.code;
    }
  }

  return Object.keys(attributes).length === 1 ? null : attributes;
}

export interface UpdateEditResult {
  error?: { message?: string } | null;
}

export function assertUpdateSucceeded(results: {
  updateFeatureResults: readonly UpdateEditResult[];
}): void {
  if (results.updateFeatureResults.length !== 1) {
    throw new TrailUpdateError(
      "The service did not return exactly one trail update result.",
    );
  }
  const error = results.updateFeatureResults[0]?.error;
  if (error) {
    throw new TrailUpdateError(
      error.message ?? "The service rejected the trail update.",
    );
  }
}

export async function submitAttributeUpdate(
  input: TrailUpdateInput,
  applyUpdate: (
    attributes: Record<string, string | number>,
  ) => Promise<{ updateFeatureResults: readonly UpdateEditResult[] }>,
): Promise<boolean> {
  const attributes = buildAttributeUpdate(input);
  if (!attributes) {
    return false;
  }
  const results = await applyUpdate(attributes);
  assertUpdateSucceeded(results);
  return true;
}

export class SubmissionLock {
  #locked = false;

  get locked(): boolean {
    return this.#locked;
  }

  tryAcquire(): boolean {
    if (this.#locked) {
      return false;
    }
    this.#locked = true;
    return true;
  }

  release(): void {
    if (!this.#locked) {
      throw new TrailUpdateError("Cannot release a submission that is not active.");
    }
    this.#locked = false;
  }
}
export function validateTrailName(
  value: string,
  maxLength?: number | null,
): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new TrailValidationError("Enter a trail name.", "name");
  }
  if (maxLength != null && maxLength > 0 && normalized.length > maxLength) {
    throw new TrailValidationError(
      `Trail name must be ${maxLength} characters or fewer.`,
      "name",
    );
  }
  return normalized;
}

export function validateDifficultyToken(
  token: string,
  choices: readonly DifficultyChoice[],
): DifficultyChoice {
  const choice = choices.find((item) => item.token === token);
  if (!choice) {
    throw new TrailValidationError(
      "Choose a valid difficulty.",
      "difficulty",
    );
  }
  return choice;
}
