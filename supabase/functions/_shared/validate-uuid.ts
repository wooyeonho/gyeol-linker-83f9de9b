/**
 * UUID validation helper — prevents SQL injection in .or() filters
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function assertUUID(value: string, name = "id"): void {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid UUID for ${name}: ${value}`);
  }
}

export function assertAllUUIDs(values: Record<string, string>): void {
  for (const [name, value] of Object.entries(values)) {
    assertUUID(value, name);
  }
}
