export function normalizePlate(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
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
