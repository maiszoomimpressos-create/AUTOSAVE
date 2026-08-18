export function normalizePlate(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

// Mirrors the vehicle_type / vehicle_status Postgres enums. Keep in sync with
// the DB — these are validated here so bad input gets a clean, fast 400
// instead of a raw Postgres error surfaced as a 500.
export const VEHICLE_TYPE_VALUES = [
  "car",
  "motorcycle",
  "truck",
  "bus",
  "van",
  "tractor",
  "harvester",
  "forklift",
  "generator",
  "trailer",
  "equipment",
  "other",
] as const;

export const VEHICLE_STATUS_VALUES = ["active", "maintenance", "stopped", "critical"] as const;

// type/status are enum columns that must stay lowercase to match their DB enum labels.
const NO_UPPERCASE_FIELDS = new Set(["type", "status", "license_expiry"]);

export function uppercaseTextFields<T extends Record<string, unknown>>(fields: T): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] =
      typeof value === "string" && !NO_UPPERCASE_FIELDS.has(key)
        ? value.toUpperCase()
        : value;
  }
  return result as T;
}

export const VEHICLE_FIELDS = [
  "type",
  "brand",
  "model",
  "year",
  "color",
  "status",
  "odometer_km",
  "fuel_type",
  "chassis_number",
  "renavam",
  "notes",
  "engine_number",
  "owner_name",
  "owner_document",
  "driver_phone",
  "category",
  "species",
  "body_type",
  "capacity",
  "power_cv",
  "displacement",
  "cmt",
  "axles",
  "city",
  "state",
  "licensing_year",
  "restrictions",
  "security_code",
  "license_expiry",
] as const;
