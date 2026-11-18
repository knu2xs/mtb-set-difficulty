export interface FeatureHit<T> {
  type: string;
  graphic?: T | null;
}

export function firstTrailFeature<T>(
  results: readonly FeatureHit<T>[],
): T | null {
  const hit = results.find(
    (result) => result.type === "graphic" && result.graphic != null,
  );
  return hit?.graphic ?? null;
}
