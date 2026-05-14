import { normalizeOptionalString } from "./string-coerce.js";

export function coerceIdentityValue(
  value: string | undefined,
  maxLength: number,
): string | undefined {
  const trimmed = normalizeOptionalString(value);
  if (!trimmed) {
    return undefined;
  }
  if (maxLength <= 0) {
    return "";
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  const truncated = trimmed.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
}
